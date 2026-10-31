// "Kevin Lucas" -> "KL"; "Samuel" -> "SA".
export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
}
