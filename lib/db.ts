import { getCloudflareContext } from "@opennextjs/cloudflare";

// Script rodado a mao nao passa pelo carregamento de env do Next.
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
}

/* Dois bancos, a mesma interface:
 *   - no Mac (npm run dev), arquivo local.db via @libsql/client
 *   - publicado na Cloudflare, o D1 (binding DB)
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

export async function initDb() {
  if (pronto) return;
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

    `CREATE INDEX IF NOT EXISTS idx_prod_status ON producoes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_mat_prod ON materiais(producao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_com_prod ON comentarios(producao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_aviso_user ON avisos(usuario_id, lido)`,
  ]);
  pronto = true;
}
