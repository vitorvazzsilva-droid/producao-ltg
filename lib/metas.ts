import { db } from "./db";

// Metas e tarefas da equipe (painel /admin e "Minhas metas").
//
// Meta automatica conta criativos pela tabela passagens: vale a PRIMEIRA vez
// que o criativo passou pela etapa (com aquela pessoa como responsavel).
// Como passagens nunca e alterada, o numero de um periodo so sobe — se o
// criativo andar ou voltar depois, a conta nao volta atras.

import { METRICAS, type Metrica, type Periodo, type StatusTarefa } from "./metas-base";
export * from "./metas-base";

// ---------- periodos (horario de Sao Paulo, UTC-3 fixo desde 2019) ----------

const FUSO = 3 * 3600_000;
const p2 = (n: number) => String(n).padStart(2, "0");
const dia = (d: Date) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
// meia-noite de Sao Paulo de um dia "YYYY-MM-DD" -> texto UTC do banco
const utcDe = (diaSP: string) => `${diaSP} 03:00:00`;
const deUtc = (s: string) => new Date(s.replace(" ", "T") + "Z");

export function inicioDoPeriodo(periodo: "semana" | "mes", quando: Date) {
  const sp = new Date(quando.getTime() - FUSO);
  if (periodo === "mes") return dia(new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 1)));
  const volta = (sp.getUTCDay() + 6) % 7; // segunda = 0
  return dia(new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() - volta)));
}

export function proximoPeriodo(periodo: "semana" | "mes", inicio: string) {
  const [a, m, d] = inicio.split("-").map(Number);
  return dia(periodo === "mes" ? new Date(Date.UTC(a, m, 1)) : new Date(Date.UTC(a, m - 1, d + 7)));
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function rotuloPeriodo(periodo: "semana" | "mes", inicio: string) {
  const [a, m, d] = inicio.split("-").map(Number);
  if (periodo === "mes") return `${MESES[m - 1]}/${a}`;
  const fim = new Date(Date.UTC(a, m - 1, d + 6));
  return `${p2(d)}/${p2(m)} – ${p2(fim.getUTCDate())}/${p2(fim.getUTCMonth() + 1)}`;
}

// ---------- contagem ----------

export async function contar(metrica: string, usuario: number, de: string, ate: string | null) {
  const m = METRICAS[metrica as Metrica];
  if (!m) return 0;
  const r = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM (
            SELECT producao_id, MIN(criado_em) AS primeira FROM passagens
            WHERE para = ? ${m.de ? "AND de = ?" : ""} AND ${m.quem} = ?
            GROUP BY producao_id
          ) WHERE primeira >= ? ${ate ? "AND primeira < ?" : ""}`,
    args: [m.para, ...(m.de ? [m.de] : []), usuario, de, ...(ate ? [ate] : [])],
  });
  return Number(r.rows[0].n);
}

// ---------- metas ----------

export type Meta = {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  titulo: string;
  descricao: string | null;
  tipo: "automatica" | "manual";
  metrica: string | null;
  alvo: number;
  periodo: Periodo;
  prazo: string | null;
  progresso: number;
  status: "aberta" | "concluida";
  concluida_em: string | null;
  criado_em: string;
};

export type MetaVista = Meta & {
  feito: number;
  periodoAtual: string | null; // rotulo do periodo em andamento
  inicioAtual: string | null;
  historico: { inicio: string; rotulo: string; alvo: number; feito: number }[];
};

export async function metas(usuario?: number): Promise<MetaVista[]> {
  const r = await db.execute({
    sql: `SELECT m.*, u.nome AS usuario_nome FROM metas m JOIN usuarios u ON u.id = m.usuario_id
          ${usuario ? "WHERE m.usuario_id = ?" : ""}
          ORDER BY m.status, u.nome, m.id`,
    args: usuario ? [usuario] : [],
  });
  const lista = r.rows as unknown as Meta[];
  return Promise.all(lista.map(vista));
}

async function vista(m: Meta): Promise<MetaVista> {
  if (m.periodo === "avulsa") {
    // Avulsa automatica conta da criacao da meta ate o fim do prazo.
    const ate = m.prazo ? utcDe(proximoDia(m.prazo)) : null;
    const feito = m.tipo === "automatica" && m.metrica ? await contar(m.metrica, m.usuario_id, m.criado_em, ate) : Number(m.progresso ?? 0);
    return { ...m, feito, periodoAtual: null, inicioAtual: null, historico: [] };
  }

  const per = m.periodo;
  const agora = new Date();
  const atual = inicioDoPeriodo(per, agora);
  // Meta encerrada para de abrir periodo novo: o ultimo e o do encerramento.
  const ultimo = m.status === "concluida" && m.concluida_em ? inicioDoPeriodo(per, deUtc(m.concluida_em)) : atual;

  const salvos = await db.execute({ sql: "SELECT inicio, alvo, feito, fechado FROM metas_periodos WHERE meta_id = ?", args: [m.id] });
  const porInicio = new Map(salvos.rows.map((l) => [String(l.inicio), l as unknown as { alvo: number; feito: number; fechado: number }]));

  const historico: MetaVista["historico"] = [];
  let feitoAtual = 0;
  let guarda = 0;
  for (let ini = inicioDoPeriodo(per, deUtc(m.criado_em)); ini <= ultimo && guarda < 400; ini = proximoPeriodo(per, ini), guarda++) {
    const fechado = ini < atual || m.status === "concluida";
    const salvo = porInicio.get(ini);
    if (fechado) {
      // Congela o periodo que acabou (uma vez); dali pra frente e historico.
      if (!salvo || !salvo.fechado) {
        const feito =
          m.tipo === "automatica" && m.metrica
            ? await contar(m.metrica, m.usuario_id, utcDe(ini), utcDe(proximoPeriodo(per, ini)))
            : Number(salvo?.feito ?? 0);
        const alvo = Number(salvo?.alvo ?? m.alvo);
        await db.execute({
          sql: `INSERT INTO metas_periodos (meta_id, inicio, alvo, feito, fechado) VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(meta_id, inicio) DO UPDATE SET feito = excluded.feito, fechado = 1`,
          args: [m.id, ini, alvo, feito],
        });
        historico.push({ inicio: ini, rotulo: rotuloPeriodo(per, ini), alvo, feito });
      } else {
        historico.push({ inicio: ini, rotulo: rotuloPeriodo(per, ini), alvo: Number(salvo.alvo), feito: Number(salvo.feito) });
      }
    } else {
      feitoAtual =
        m.tipo === "automatica" && m.metrica
          ? await contar(m.metrica, m.usuario_id, utcDe(ini), null)
          : Number(salvo?.feito ?? 0);
    }
  }

  const emAndamento = m.status === "aberta";
  return {
    ...m,
    feito: emAndamento ? feitoAtual : historico.at(-1)?.feito ?? 0,
    periodoAtual: emAndamento ? rotuloPeriodo(per, atual) : null,
    inicioAtual: emAndamento ? atual : null,
    historico: historico.reverse().slice(0, 12),
  };
}

function proximoDia(d: string) {
  const [a, m, x] = d.split("-").map(Number);
  return dia(new Date(Date.UTC(a, m - 1, x + 1)));
}

// ---------- tarefas e esteira por pessoa ----------

export type Tarefa = {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  titulo: string;
  descricao: string | null;
  status: StatusTarefa;
  prazo: string | null;
  criado_em: string;
};

export async function tarefas(usuario?: number) {
  const r = await db.execute({
    sql: `SELECT t.*, u.nome AS usuario_nome FROM tarefas t JOIN usuarios u ON u.id = t.usuario_id
          ${usuario ? "WHERE t.usuario_id = ?" : ""}
          ORDER BY CASE t.status WHEN 'aprovacao' THEN 0 WHEN 'fazendo' THEN 1 WHEN 'a_fazer' THEN 2 ELSE 3 END,
                   COALESCE(t.prazo, '9999'), t.id DESC`,
    args: usuario ? [usuario] : [],
  });
  return r.rows as unknown as Tarefa[];
}

export type NaEsteira = {
  id: number;
  codigo: string;
  status: string;
  prazo: string | null;
  copy_id: number | null;
  editor_id: number | null;
  ajuste_de: string | null;
};

// Criativos em andamento em que a pessoa e copy ou editor.
export async function esteiraPorPessoa() {
  const r = await db.execute(
    `SELECT id, codigo, status, prazo, copy_id, editor_id, ajuste_de FROM producoes
     WHERE status NOT IN ('no_ar', 'arquivado') ORDER BY atualizado_em DESC`
  );
  const m = new Map<number, NaEsteira[]>();
  for (const p of r.rows as unknown as NaEsteira[]) {
    for (const u of new Set([p.copy_id, p.editor_id])) {
      if (u) m.set(u, [...(m.get(u) ?? []), p]);
    }
  }
  return m;
}
