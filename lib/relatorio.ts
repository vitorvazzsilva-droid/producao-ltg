import type { Relatorio } from "./dados";

// "JHON_ATMOZ_KEV_376_H1  4,54" -> { codigo, roi }
export function criativosDe(txt: string | null) {
  return (txt ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)[\s;:|-]+(-?\d+(?:[.,]\d+)?)\s*$/);
      return m ? { codigo: m[1].trim(), roi: Number(m[2].replace(",", ".")) } : { codigo: l, roi: null as number | null };
    });
}

// Soma de uma janela de dias: ROI medio ponderado pelas vendas e o total.
export function janela(rs: Relatorio[]) {
  const com = rs.filter((r) => r.roi !== null);
  const vendas = rs.reduce((s, r) => s + (r.vendas ?? 0), 0);
  const peso = com.reduce((s, r) => s + (r.vendas ?? 1), 0);
  const roi = com.length ? com.reduce((s, r) => s + (r.roi ?? 0) * (r.vendas ?? 1), 0) / (peso || 1) : null;
  return { roi, vendas, dias: rs.length };
}

// Melhor ROI de cada criativo na janela (o mesmo criativo em varios dias
// fica com o maior).
export function topCriativos(rs: Relatorio[], n = 3) {
  const m = new Map<string, number>();
  for (const r of rs)
    for (const c of criativosDe(r.criativos)) if (c.roi !== null) m.set(c.codigo, Math.max(m.get(c.codigo) ?? -Infinity, c.roi));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export const fmtRoi = (n: number | null) => (n === null ? "—" : n.toFixed(2).replace(".", ","));

export function diaSP(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}
