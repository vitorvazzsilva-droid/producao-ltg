// Tipos e contas da producao que servem tanto no servidor quanto na tela
// (sem banco aqui, pra poder entrar em componente de cliente).

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
  briefing_gravacao: string | null;
  referencia_url: string | null;
  referencia_img: string | null;
  ajuste_de: string | null;
  prazo: string | null;
  status: string;
  copy_id: number | null;
  editor_id: number | null;
  criado_por: number | null;
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
  expert_id: number | null;
  oferta_id: number | null;
  numero: number | null;
  prioridade: string | null;
  formato_gravacao: string | null;
  passa_copy: number;
  passa_gravacao: number;
  doc_url: string | null;
  pasta_bruto: string | null;
  pasta_entrega: string | null;
  etapa_em: string | null;
  status_antes: string | null;
  expert_nome: string | null;
  expert_sigla: string | null;
  expert_cor: string | null;
  copy_sigla: string | null;
  editor_sigla: string | null;
  oferta_nome: string | null;
  oferta_sigla: string | null;
  tags_txt: string | null; // "nome|cor;;nome|cor"
  horas_etapa: number;
};

export type Tag = { id: number; nome: string; cor: string };
export type Oferta = { id: number; nome: string; sigla: string; expert_id: number | null; contador: number };

export const tagsDe = (p: Pick<Producao, "tags_txt">): { nome: string; cor: string }[] =>
  (p.tags_txt ?? "")
    .split(";;")
    .filter(Boolean)
    .map((t) => {
      const [nome, cor] = t.split("|");
      return { nome, cor: cor || "cinza" };
    });

// Nome curto do card: JHON_A_403 (expert, inicial da oferta, sequencial).
export function nomeCurto(p: Pick<Producao, "expert_sigla" | "oferta_sigla" | "numero" | "codigo">) {
  if (!p.expert_sigla || !p.numero) return p.codigo;
  return `${p.expert_sigla}_${(p.oferta_sigla ?? "X")[0]}_${String(p.numero).padStart(3, "0")}`;
}


// "há 20 h", "há 5 d", "há 1 mês"
export function tempo(horas: number) {
  if (horas < 1) return "agora";
  if (horas < 24) return `há ${horas} h`;
  const d = Math.floor(horas / 24);
  if (d < 30) return `há ${d} d`;
  const m = Math.floor(d / 30);
  return `há ${m} ${m === 1 ? "mês" : "meses"}`;
}

