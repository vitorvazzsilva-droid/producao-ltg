import { db } from "./db";

export type Producao = {
  id: number;
  codigo: string;
  angulo: string;
  lado: string;
  tipo: string;
  formato: string | null;
  oferta: string;
  hook: string | null;
  copy: string | null;
  briefing: string | null;
  referencia_url: string | null;
  prazo: string | null;
  status: string;
  copy_id: number | null;
  editor_id: number | null;
  resultado: string | null;
  resultado_nota: string | null;
  aprovado_em: string | null;
  no_ar_em: string | null;
  criado_em: string;
  atualizado_em: string;
  copy_nome: string | null;
  editor_nome: string | null;
  versoes: number;
  brutos: number;
  ultima_versao: string | null;
};

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
  tipo: "comentario" | "ajuste" | "evento";
  texto: string;
  autor: string | null;
  papel: string | null;
  criado_em: string;
};

export type Usuario = { id: number; login: string; nome: string; papel: string; ativo: number; criado_em: string };

const CAMPOS = `
  p.*,
  uc.nome AS copy_nome,
  ue.nome AS editor_nome,
  (SELECT COUNT(*) FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'versao') AS versoes,
  (SELECT COUNT(*) FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'bruto') AS brutos,
  (SELECT url FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'versao' ORDER BY m.versao DESC, m.id DESC LIMIT 1) AS ultima_versao
  FROM producoes p
  LEFT JOIN usuarios uc ON uc.id = p.copy_id
  LEFT JOIN usuarios ue ON ue.id = p.editor_id
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
    onde.push("(p.copy_id = ? OR p.editor_id = ?)");
    args.push(f.pessoa, f.pessoa);
  }
  if (f.resultado) {
    onde.push("p.resultado = ?");
    args.push(f.resultado);
  }
  if (f.busca) {
    onde.push("(p.codigo LIKE ? OR p.angulo LIKE ? OR p.hook LIKE ? OR p.copy LIKE ?)");
    const q = `%${f.busca}%`;
    args.push(q, q, q, q);
  }
  if (f.comVersao) onde.push("EXISTS (SELECT 1 FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'versao')");
  if (f.comBruto) onde.push("EXISTS (SELECT 1 FROM materiais m WHERE m.producao_id = p.id AND m.tipo = 'bruto')");

  const r = await db.execute({
    sql: `SELECT ${CAMPOS} WHERE ${onde.join(" AND ")} ORDER BY p.atualizado_em DESC, p.id DESC LIMIT 500`,
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
    sql: `SELECT c.id, c.tipo, c.texto, c.criado_em, u.nome AS autor, u.papel
          FROM comentarios c LEFT JOIN usuarios u ON u.id = c.usuario_id
          WHERE c.producao_id = ? ORDER BY c.id`,
    args: [id],
  });
  return r.rows as unknown as Comentario[];
}

export async function usuarios(soAtivos = false) {
  const r = await db.execute(
    `SELECT id, login, nome, papel, ativo, criado_em FROM usuarios ${soAtivos ? "WHERE ativo = 1" : ""} ORDER BY ativo DESC, papel, nome`
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
