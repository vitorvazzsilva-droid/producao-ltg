import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient as clienteWeb } from "@libsql/client/web";

// Script rodado a mao nao passa pelo carregamento de env do Next.
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
}

/* Dois bancos, a mesma interface:
 *   - no Mac (npm run dev), arquivo local.db via @libsql/client
 *   - publicado na Cloudflare, o D1 (binding DB)
 *   - publicado na Vercel, o Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)
 * O resto do app so conhece execute() e batch(), no formato do libsql. */

type Arg = string | number | null;
type Stmt = string | { sql: string; args?: Arg[] };
type Linha = Record<string, unknown>;
type Resultado = { rows: Linha[]; rowsAffected: number; lastInsertRowid?: number };

type D1 = {
  prepare(sql: string): { bind(...a: Arg[]): D1Stmt } & D1Stmt;
  batch(s: D1Stmt[]): Promise<unknown>;
};
type D1Stmt = { all(): Promise<{ results: Linha[]; meta: { changes?: number; last_row_id?: number } }> };

function d1(): D1 | null {
  try {
    const env = getCloudflareContext().env as unknown as { DB?: D1 };
    return env.DB ?? null;
  } catch {
    return null;
  }
}

type Libsql = {
  execute(s: Stmt): Promise<{ rows: Linha[]; rowsAffected: number; lastInsertRowid?: bigint }>;
  batch(s: string[]): Promise<unknown>;
};
let local: Promise<Libsql> | null = null;
function libsql() {
  // Na Vercel: banco Turso pela internet (cliente HTTP, sem modulo nativo).
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    local ??= Promise.resolve(
      clienteWeb({ url: url.replace(/^libsql:/, "https:"), authToken: process.env.TURSO_AUTH_TOKEN }) as unknown as Libsql
    );
    return local;
  }
  // Import escondido do bundler: o cliente nativo nao vai pro Worker.
  local ??= import(/* turbopackIgnore: true */ /* webpackIgnore: true */ "@libsql/client" as string).then(
    (m: { createClient(o: { url: string }): Libsql }) => m.createClient({ url: "file:local.db" })
  );
  return local;
}

const separa = (s: Stmt) => (typeof s === "string" ? { sql: s, args: [] as Arg[] } : { sql: s.sql, args: s.args ?? [] });

export const db = {
  async execute(s: Stmt): Promise<Resultado> {
    const nuvem = d1();
    if (!nuvem) {
      const r = await (await libsql()).execute(s);
      return {
        rows: r.rows.map((l) => ({ ...l })),
        rowsAffected: r.rowsAffected,
        lastInsertRowid: r.lastInsertRowid === undefined ? undefined : Number(r.lastInsertRowid),
      };
    }
    const { sql, args } = separa(s);
    const r = await nuvem.prepare(sql).bind(...args).all();
    return { rows: r.results ?? [], rowsAffected: r.meta?.changes ?? 0, lastInsertRowid: r.meta?.last_row_id };
  },
  async batch(s: string[]) {
    const nuvem = d1();
    if (!nuvem) return (await libsql()).batch(s);
    return nuvem.batch(s.map((sql) => nuvem.prepare(sql)));
  },
};

let pronto = false;

// Versao do schema. Mexeu em tabela/coluna abaixo? Sobe esse numero — senao
// o banco publicado nao roda a mudanca (ele so confere a versao).
const VERSAO = 4;

// Devolve true quando rodou a criacao/migracao (banco novo ou versao velha).
// No dia a dia e uma consulta so, em vez de ~6 idas ao banco a cada vez que
// o Worker acorda.
export async function initDb() {
  if (pronto) return false;
  try {
    const v = await db.execute("SELECT versao FROM _schema LIMIT 1");
    if (Number(v.rows[0]?.versao) === VERSAO) {
      pronto = true;
      return false;
    }
  } catch {}
  await db.batch([
    // Quem entra no app. papel decide o que cada um ve como "sua vez":
    // admin aprova e ve tudo, copy escreve e revisa, editor edita, trafego sobe.
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      papel TEXT NOT NULL,                 -- admin | copy | editor | trafego
      senha_hash TEXT NOT NULL,
      sal TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Cada criativo, do rascunho da copy ate o resultado no trafego.
    `CREATE TABLE IF NOT EXISTS producoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,         -- LTG_001_DOLAR
      angulo TEXT NOT NULL,
      lado TEXT DEFAULT 'black',           -- black | white
      tipo TEXT DEFAULT 'anuncio',         -- anuncio | lateralizacao | organico
      formato TEXT,                        -- caixinha de perguntas, POV, print...
      oferta TEXT DEFAULT 'Low Ticket Global',
      hook TEXT,
      copy TEXT,                           -- o roteiro inteiro
      briefing TEXT,                       -- recado pro editor
      referencia_url TEXT,
      prazo TEXT,                          -- YYYY-MM-DD
      status TEXT DEFAULT 'copy',
      copy_id INTEGER REFERENCES usuarios(id),
      editor_id INTEGER REFERENCES usuarios(id),
      criado_por INTEGER REFERENCES usuarios(id),
      resultado TEXT,                      -- testando | vencedor | perdedor
      resultado_nota TEXT,
      aprovado_em TEXT,
      no_ar_em TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Links de video: o bruto (material de apoio) e cada versao editada.
    `CREATE TABLE IF NOT EXISTS materiais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producao_id INTEGER NOT NULL REFERENCES producoes(id),
      tipo TEXT NOT NULL,                  -- bruto | versao
      url TEXT NOT NULL,
      rotulo TEXT,
      versao INTEGER,
      enviado_por INTEGER REFERENCES usuarios(id),
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Conversa da producao. tipo marca o que e pedido de ajuste e o que e
    // historico automatico (mudanca de etapa), pra tela separar os dois.
    `CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producao_id INTEGER NOT NULL REFERENCES producoes(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      tipo TEXT DEFAULT 'comentario',      -- comentario | ajuste | evento
      texto TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS avisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      producao_id INTEGER REFERENCES producoes(id),
      texto TEXT NOT NULL,
      lido INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Cada passagem de etapa, gravada na hora e nunca alterada. As metas
    // automaticas contam daqui: copy_id/editor_id sao os responsaveis NO
    // MOMENTO da passagem, entao trocar o responsavel depois nao mexe na conta.
    `CREATE TABLE IF NOT EXISTS passagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producao_id INTEGER NOT NULL REFERENCES producoes(id),
      de TEXT,
      para TEXT NOT NULL,
      usuario_id INTEGER REFERENCES usuarios(id),   -- quem moveu
      copy_id INTEGER,
      editor_id INTEGER,
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Metas da equipe (painel /admin). tipo 'automatica' conta pela esteira
    // (metrica diz o que contar); 'manual' o admin atualiza o numero.
    `CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      titulo TEXT NOT NULL,
      descricao TEXT,
      tipo TEXT NOT NULL DEFAULT 'automatica',   -- automatica | manual
      metrica TEXT,                              -- ver lib/metas.ts
      alvo INTEGER NOT NULL DEFAULT 1,
      periodo TEXT NOT NULL DEFAULT 'semana',    -- semana | mes | avulsa
      prazo TEXT,                                -- YYYY-MM-DD
      progresso INTEGER DEFAULT 0,               -- manual avulsa
      status TEXT DEFAULT 'aberta',              -- aberta | concluida
      concluida_em TEXT,
      criado_por INTEGER REFERENCES usuarios(id),
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Um registro por periodo de meta semanal/mensal. O periodo atual guarda
    // o numero da meta manual; periodo fechado vira historico congelado.
    `CREATE TABLE IF NOT EXISTS metas_periodos (
      meta_id INTEGER NOT NULL REFERENCES metas(id),
      inicio TEXT NOT NULL,                      -- YYYY-MM-DD (Sao Paulo)
      alvo INTEGER NOT NULL,
      feito INTEGER NOT NULL DEFAULT 0,
      fechado INTEGER DEFAULT 0,
      PRIMARY KEY (meta_id, inicio)
    )`,

    // Trabalho avulso, fora dos criativos (os criativos vivem na esteira).
    `CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      titulo TEXT NOT NULL,
      descricao TEXT,
      status TEXT DEFAULT 'a_fazer',             -- a_fazer | fazendo | aprovacao | concluida
      prazo TEXT,
      criado_por INTEGER REFERENCES usuarios(id),
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Ofertas: a sigla entra no nome canonico (EXPERT_OFERTA_COPY_NNN) e o
    // contador e o sequencial de cada oferta. expert_id nulo = de todos.
    `CREATE TABLE IF NOT EXISTS ofertas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sigla TEXT NOT NULL,
      expert_id INTEGER REFERENCES usuarios(id),
      contador INTEGER NOT NULL DEFAULT 0,
      ativa INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now'))
    )`,

    // Rotulos do lote (Leva 1, Teste, VSL...). Nao entram no nome.
    `CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      cor TEXT NOT NULL DEFAULT 'cinza'
    )`,
    `CREATE TABLE IF NOT EXISTS producao_tags (
      producao_id INTEGER NOT NULL REFERENCES producoes(id),
      tag_id INTEGER NOT NULL REFERENCES tags(id),
      PRIMARY KEY (producao_id, tag_id)
    )`,

    // Relatorio do trafego por expert e por dia (tela Testes do trafego).
    `CREATE TABLE IF NOT EXISTS relatorios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expert_id INTEGER NOT NULL REFERENCES usuarios(id),
      dia TEXT NOT NULL,                         -- YYYY-MM-DD
      roi REAL,
      vendas INTEGER,
      criativos TEXT,                            -- uma linha por criativo: CODIGO ROI
      testes TEXT,                               -- o que o trafego esta testando
      usuario_id INTEGER REFERENCES usuarios(id),
      criado_em TEXT DEFAULT (datetime('now')),
      UNIQUE (expert_id, dia)
    )`,

    // Vega: conversas de cada pessoa. mensagens guarda o historico inteiro no
    // formato da API (blocos de pensamento inclusos, sem mexer). pendente e a
    // alteracao esperando o "Permitir"; liberadas sao as "sempre nesta conversa".
    `CREATE TABLE IF NOT EXISTS vega_conversas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      titulo TEXT NOT NULL,
      mensagens TEXT NOT NULL DEFAULT '[]',
      pendente TEXT,
      liberadas TEXT NOT NULL DEFAULT '[]',
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE INDEX IF NOT EXISTS idx_pass_para ON passagens(para, criado_em)`,
    `CREATE INDEX IF NOT EXISTS idx_metas_user ON metas(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tarefas_user ON tarefas(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_prod_status ON producoes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_mat_prod ON materiais(producao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_com_prod ON comentarios(producao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_aviso_user ON avisos(usuario_id, lido)`,
  ]);
  // Colunas novas. ADD COLUMN falha se ja existe — o catch vazio e isso.
  for (const col of [
    // quem precisa corrigir quando a producao esta em "ajustes pedidos":
    // 'editor' (revisao reprovou o video) ou 'copy' (editor pediu mudanca na copy)
    "ajuste_de TEXT",
    // print/imagem de referencia (link por enquanto; upload quando o R2 ligar)
    "referencia_img TEXT",
    // recado pra quem grava (tom, cenario, roupa), separado do briefing de edicao
    "briefing_gravacao TEXT",
    // Versao Orbita: quem grava (expert), oferta + sequencial do nome
    // canonico, prioridade, caminho (etapas ligadas) e links do lote.
    "expert_id INTEGER",
    "oferta_id INTEGER",
    "numero INTEGER",
    "prioridade TEXT DEFAULT 'media'",
    "formato_gravacao TEXT",
    "passa_copy INTEGER DEFAULT 1",
    "passa_gravacao INTEGER DEFAULT 1",
    "doc_url TEXT",
    "pasta_bruto TEXT",
    "pasta_entrega TEXT",
    "etapa_em TEXT",
    "status_antes TEXT",
    "lote TEXT",
  ]) {
    try {
      await db.execute(`ALTER TABLE producoes ADD COLUMN ${col}`);
    } catch {}
  }
  // Sigla (JHON, KEV...) aparece no nome canonico e nos cards; cor pinta a
  // borda dos cards do expert.
  // anthropic_chave: a chave de API de cada pessoa pra Vega, cifrada.
  for (const col of ["sigla TEXT", "cor TEXT", "anthropic_chave TEXT"]) {
    try {
      await db.execute(`ALTER TABLE usuarios ADD COLUMN ${col}`);
    } catch {}
  }
  await db.batch([
    "UPDATE producoes SET etapa_em = COALESCE(etapa_em, atualizado_em)",
  ]);
  await historicoDePassagens();
  await db.batch([
    "CREATE TABLE IF NOT EXISTS _schema (versao INTEGER NOT NULL)",
    "DELETE FROM _schema",
    `INSERT INTO _schema (versao) VALUES (${VERSAO})`,
  ]);
  pronto = true;
  return true;
}

// Uma vez so: as passagens de antes desta tabela existir estao no historico
// da producao ("moveu de “X” para “Y”"). Copia pra passagens, com os
// responsaveis de hoje (e o melhor que da pra saber do passado).
async function historicoDePassagens() {
  const ja = await db.execute("SELECT 1 FROM passagens LIMIT 1");
  if (ja.rows.length) return;
  const { STATUS } = await import("./fluxo");
  const porRotulo = new Map<string, string>(Object.entries(STATUS).map(([k, v]) => [v.rotulo, k]));
  const r = await db.execute(
    `SELECT c.producao_id, c.usuario_id, c.texto, c.criado_em, p.copy_id, p.editor_id
     FROM comentarios c JOIN producoes p ON p.id = c.producao_id
     WHERE c.tipo = 'evento' AND c.texto LIKE 'moveu de %' ORDER BY c.id`
  );
  const q = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const linhas: string[] = [];
  for (const l of r.rows) {
    const m = String(l.texto).match(/^moveu de “(.+)” para “(.+)”$/);
    const de = m && porRotulo.get(m[1]);
    const para = m && porRotulo.get(m[2]);
    if (!de || !para) continue;
    linhas.push(
      `INSERT INTO passagens (producao_id, de, para, usuario_id, copy_id, editor_id, criado_em) VALUES (${[
        l.producao_id, de, para, l.usuario_id, l.copy_id, l.editor_id, l.criado_em,
      ].map(q).join(", ")})`
    );
  }
  for (let i = 0; i < linhas.length; i += 50) await db.batch(linhas.slice(i, i + 50));
}
