import { db } from "./db";
import type { Producao, Tag, Oferta } from "./producao-base";
export * from "./producao-base";

export type Material = {
  id: number;
  tipo: "bruto" | "versao";
  url: string;
  rotulo: string | null;
  versao: number | null;
  enviado_por_nome: string | null;
  criado_em: string;
};

export type Comentario = {
  id: number;
  usuario_id: number | null;
  tipo: "comentario" | "ajuste" | "evento";
  texto: string;
  autor: string | null;
  papel: string | null;
  criado_em: string;
};

export type Usuario = { id: number; login: string; nome: string; papel: string; ativo: number; criado_em: string; sigla: string | null; cor: string | null };

const CAMPOS = `
  p.*,
  uc.nome AS copy_nome,
  ue.nome AS editor_nome,
  uc.sigla AS copy_sigla,
  ue.sigla AS editor_sigla,
  ux.nome AS expert_nome,
  ux.sigla AS expert_sigla,
  ux.cor AS expert_cor,
  o.nome AS oferta_nome,
  o.sigla AS oferta_sigla,
  (SELECT GROUP_CONCAT(t.nome || '|' || t.cor, ';;') FROM producao_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.producao_id = p.id) AS tags_txt,
  CAST((julianday('now') - julianday(COALESCE(p.etapa_em, p.atualizado_em))) * 24 AS INTEGER) AS horas_etapa,
  (SELECT COUNT(*) FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'versao') AS versoes,
  (SELECT COUNT(*) FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'bruto') AS brutos,
  (SELECT url FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'versao' ORDER BY m.versao DESC, m.id DESC LIMIT 1) AS ultima_versao
  FROM producoes p
  LEFT JOIN usuarios uc ON uc.id = p.copy_id
  LEFT JOIN usuarios ue ON ue.id = p.editor_id
  LEFT JOIN usuarios ux ON ux.id = p.expert_id
  LEFT JOIN ofertas o ON o.id = p.oferta_id
`;

type Filtro = {
  status?: string[];
  lado?: string;
  tipo?: string;
  busca?: string;
  pessoa?: number;
  comVersao?: boolean;
  comBruto?: boolean;
  resultado?: string;
};

export async function producoes(f: Filtro = {}) {
  const onde: string[] = [];
  const args: (string | number)[] = [];
  if (f.status?.length) {
    onde.push(`p.status IN (${f.status.map(() => "?").join(",")})`);
    args.push(...f.status);
  } else {
    onde.push("p.status != 'arquivado'");
  }
  if (f.lado) {
    onde.push("p.lado = ?");
    args.push(f.lado);
  }
  if (f.tipo) {
    onde.push("p.tipo = ?");
    args.push(f.tipo);
  }
  if (f.pessoa) {
    onde.push("(p.copy_id = ? OR p.editor_id = ? OR p.expert_id = ?)");
    args.push(f.pessoa, f.pessoa, f.pessoa);
  }
  if (f.resultado) {
    onde.push("p.resultado = ?");
    args.push(f.resultado);
  }
  if (f.busca) {
    onde.push("(p.codigo LIKE ? OR p.angulo LIKE ? OR p.hook LIKE ? OR p.copy LIKE ? OR uc.nome LIKE ? OR ue.nome LIKE ? OR ux.nome LIKE ?)");
    const q = `%${f.busca}%`;
    args.push(q, q, q, q, q, q, q);
  }
  if (f.comVersao) onde.push("EXISTS (SELECT 1 FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'versao')");
  if (f.comBruto) onde.push("EXISTS (SELECT 1 FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'bruto')");

  const r = await db.execute({
    sql: `SELECT ${CAMPOS} WHERE ${onde.join(" AND ")} ORDER BY p.atualizado_em DESC, p.id DESC LIMIT 1000`,
    args,
  });
  return r.rows as unknown as Producao[];
}

export async function producao(id: number) {
  const r = await db.execute({ sql: `SELECT ${CAMPOS} WHERE p.id = ?`, args: [id] });
  return (r.rows[0] as unknown as Producao) ?? null;
}

export async function materiais(id: number) {
  const r = await db.execute({
    sql: `SELECT m.*, u.nome AS enviado_por_nome FROM materiais m
          LEFT JOIN usuarios u ON u.id = m.enviado_por
          WHERE m.producao_id = ? ORDER BY m.tipo, COALESCE(m.versao, 0) DESC, m.id`,
    args: [id],
  });
  return r.rows as unknown as Material[];
}

export async function comentarios(id: number) {
  const r = await db.execute({
    sql: `SELECT c.id, c.usuario_id, c.tipo, c.texto, c.criado_em, u.nome AS autor, u.papel
          FROM comentarios c LEFT JOIN usuarios u ON u.id = c.usuario_id
          WHERE c.producao_id = ? ORDER BY c.id`,
    args: [id],
  });
  return r.rows as unknown as Comentario[];
}

export async function usuarios(soAtivos = false) {
  const r = await db.execute(
    `SELECT id, login, nome, papel, ativo, criado_em, sigla, cor FROM usuarios ${soAtivos ? "WHERE ativo = 1" : ""} ORDER BY ativo DESC, papel, nome`
  );
  return r.rows as unknown as Usuario[];
}

export async function contagens() {
  const r = await db.execute("SELECT status, COUNT(*) AS n FROM producoes GROUP BY status");
  const c: Record<string, number> = {};
  for (const l of r.rows) c[String(l.status)] = Number(l.n);
  return c;
}

export async function avisos(usuario: number, limite = 50) {
  const r = await db.execute({
    sql: `SELECT a.id, a.texto, a.lido, a.criado_em, a.producao_id, p.codigo
          FROM avisos a LEFT JOIN producoes p ON p.id = a.producao_id
          WHERE a.usuario_id = ? ORDER BY a.id DESC LIMIT ?`,
    args: [usuario, limite],
  });
  return r.rows as unknown as { id: number; texto: string; lido: number; criado_em: string; producao_id: number | null; codigo: string | null }[];
}

export async function naoLidos(usuario: number) {
  const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM avisos WHERE usuario_id = ? AND lido = 0", args: [usuario] });
  return Number(r.rows[0].n);
}

// Datas do banco estao em UTC ("2026-10-31 03:12:00"); a equipe le no
// horario de Sao Paulo.
export function quando(utc: string | null) {
  if (!utc) return "";
  const d = new Date(utc.replace(" ", "T") + "Z");
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(d).replace(",", " ·");
}

export function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// Materiais de varias producoes de uma vez (telas de area listam muitas).
export async function materiaisDe(ids: number[]) {
  const m = new Map<number, Material[]>();
  if (!ids.length) return m;
  const r = await db.execute({
    sql: `SELECT m.*, u.nome AS enviado_por_nome FROM materiais m
          LEFT JOIN usuarios u ON u.id = m.enviado_por
          WHERE m.producao_id IN (${ids.map(() => "?").join(",")})
          ORDER BY m.tipo, COALESCE(m.versao, 0) DESC, m.id`,
    args: ids,
  });
  for (const l of r.rows as unknown as (Material & { producao_id: number })[]) {
    m.set(l.producao_id, [...(m.get(l.producao_id) ?? []), l]);
  }
  return m;
}

// Ultimo pedido de ajuste de cada producao (pra mostrar o "o que mudar").
export async function ajustesDe(ids: number[]) {
  const m = new Map<number, { texto: string; autor: string | null }>();
  if (!ids.length) return m;
  const r = await db.execute({
    sql: `SELECT c.producao_id, c.texto, u.nome AS autor FROM comentarios c
          LEFT JOIN usuarios u ON u.id = c.usuario_id
          WHERE c.tipo = 'ajuste' AND c.producao_id IN (${ids.map(() => "?").join(",")})
          ORDER BY c.id`,
    args: ids,
  });
  for (const l of r.rows as unknown as { producao_id: number; texto: string; autor: string | null }[]) {
    m.set(l.producao_id, { texto: l.texto, autor: l.autor });
  }
  return m;
}

export async function tags() {
  const r = await db.execute("SELECT id, nome, cor FROM tags ORDER BY nome");
  return r.rows as unknown as Tag[];
}

export async function ofertas() {
  const r = await db.execute("SELECT id, nome, sigla, expert_id, contador FROM ofertas WHERE ativa = 1 ORDER BY nome");
  return r.rows as unknown as Oferta[];
}

export type Relatorio = {
  id: number;
  expert_id: number;
  dia: string;
  roi: number | null;
  vendas: number | null;
  criativos: string | null;
  testes: string | null;
  autor: string | null;
};

export async function relatorios(desde: string) {
  const r = await db.execute({
    sql: `SELECT r.*, u.nome AS autor FROM relatorios r LEFT JOIN usuarios u ON u.id = r.usuario_id
          WHERE r.dia >= ? ORDER BY r.dia DESC`,
    args: [desde],
  });
  return r.rows as unknown as Relatorio[];
}


// Quantas producoes estao na vez de cada um (badge da Area no menu).
export async function contaMinhaVez(eu: { id: number; papel: import("./fluxo").Papel }) {
  const { eMinhaVez } = await import("./fluxo");
  const r = await db.execute(
    "SELECT status, copy_id, editor_id, expert_id, ajuste_de FROM producoes WHERE status NOT IN ('arquivado', 'no_ar', 'bloqueado')"
  );
  return (r.rows as unknown as { status: string; copy_id: number | null; editor_id: number | null; expert_id: number | null }[]).filter((p) =>
    eMinhaVez(p, eu)
  ).length;
}

export async function siglaDe(id: number) {
  const r = await db.execute({ sql: "SELECT sigla, nome FROM usuarios WHERE id = ?", args: [id] });
  const l = r.rows[0] as { sigla: string | null; nome: string } | undefined;
  return (l?.sigla || l?.nome?.slice(0, 3) || "?").toUpperCase();
}

export type Video = {
  id: number;
  producao_id: number;
  tipo: "bruto" | "versao";
  url: string;
  rotulo: string | null;
  versao: number | null;
  criado_em: string;
  codigo: string;
  status: string;
  lado: string;
  ptipo: string;
  expert_nome: string | null;
  expert_sigla: string | null;
  expert_id: number | null;
  editor_sigla: string | null;
  oferta_sigla: string | null;
  numero: number | null;
};

// Cada video do acervo (o bruto ou cada versao editada) com a producao dele.
export async function videos(tipo: "bruto" | "versao") {
  const r = await db.execute({
    sql: `SELECT m.id, m.producao_id, m.tipo, m.url, m.rotulo, m.versao, m.criado_em,
            p.codigo, p.status, p.lado, p.tipo AS ptipo, p.expert_id, p.numero,
            ux.nome AS expert_nome, ux.sigla AS expert_sigla, ue.sigla AS editor_sigla, o.sigla AS oferta_sigla
          FROM materiais m JOIN producoes p ON p.id = m.producao_id
          LEFT JOIN usuarios ux ON ux.id = p.expert_id
          LEFT JOIN usuarios ue ON ue.id = p.editor_id
          LEFT JOIN ofertas o ON o.id = p.oferta_id
          WHERE m.tipo = ? AND p.status != 'arquivado'
          ORDER BY m.id DESC LIMIT 2000`,
    args: [tipo],
  });
  return r.rows as unknown as Video[];
}

export async function contaVideos() {
  const r = await db.execute(
    "SELECT m.tipo, COUNT(*) AS n FROM materiais m JOIN producoes p ON p.id = m.producao_id WHERE p.status != 'arquivado' GROUP BY m.tipo"
  );
  const c = { bruto: 0, versao: 0 };
  for (const l of r.rows) c[String(l.tipo) as "bruto" | "versao"] = Number(l.n);
  return c;
}
