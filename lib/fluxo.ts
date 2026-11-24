// A esteira inteira mora aqui: as etapas, os grupos (Copy, Experts, Edição,
// Tráfego, Fora do fluxo), quem age em cada uma e o que cada botao (ou
// arrasto) faz. Tela, quadro e action leem daqui.

export type Papel = "admin" | "copy" | "gravacao" | "editor" | "trafego";

export const PAPEIS: Record<Papel, string> = {
  admin: "Admin",
  copy: "Copy",
  gravacao: "Expert",
  editor: "Editor",
  trafego: "Tráfego",
};

export const STATUS = {
  copy: { rotulo: "Escrevendo a copy", cor: "azul" },
  copy_revisao: { rotulo: "Copy em revisão", cor: "roxo" },
  copy_reajuste: { rotulo: "Reajuste de copy", cor: "vermelho" },
  gravar: { rotulo: "Para gravar", cor: "rosa" },
  gravado: { rotulo: "Gravado", cor: "amarelo" },
  pronta: { rotulo: "Livre para pegar", cor: "roxo" },
  edicao: { rotulo: "Em edição", cor: "laranja" },
  revisao: { rotulo: "Em revisão", cor: "amarelo" },
  ajustes: { rotulo: "Ajustes pedidos", cor: "vermelho" },
  aprovado: { rotulo: "Aprovado", cor: "verde" },
  no_ar: { rotulo: "No ar", cor: "teal" },
  bloqueado: { rotulo: "Bloqueado", cor: "cinza" },
  arquivado: { rotulo: "Arquivado", cor: "cinza" },
} as const;

export type Status = keyof typeof STATUS;

export type Grupo = { id: string; rotulo: string; icone: string; cor: string; etapas: Status[] };

export const GRUPOS: Grupo[] = [
  { id: "copy", rotulo: "Copy", icone: "copy", cor: "#3557c9", etapas: ["copy", "copy_revisao", "copy_reajuste"] },
  { id: "experts", rotulo: "Experts", icone: "video", cor: "#c4892b", etapas: ["gravar", "gravado"] },
  { id: "edicao", rotulo: "Edição", icone: "lapis", cor: "#d0561f", etapas: ["pronta", "edicao", "revisao", "ajustes"] },
  { id: "trafego", rotulo: "Tráfego", icone: "megafone", cor: "#1d8a4b", etapas: ["aprovado", "no_ar"] },
  { id: "fora", rotulo: "Fora do fluxo", icone: "cadeado", cor: "#8a93ad", etapas: ["bloqueado"] },
];

export const grupoDe = (s: string) => GRUPOS.find((g) => g.etapas.includes(s as Status));

// Todas as colunas da esteira, na ordem.
export const ETAPAS: Status[] = GRUPOS.flatMap((g) => g.etapas);

// Etapas em que "parado" conta (no trafego e fora do fluxo o tempo nao pesa).
export const CONTA_PARADA = new Set<Status>(GRUPOS.slice(0, 3).flatMap((g) => g.etapas));
export const DIAS_PARADA = 5;

// O minimo da producao que as regras precisam enxergar.
export type Estado = {
  status: string;
  copy_id: number | null;
  editor_id: number | null;
  expert_id?: number | null;
  ajuste_de?: string | null;
};

export const ajusteDe = (p: Estado) => (p.ajuste_de === "copy" ? "copy" : "editor");

// De quem e a vez em cada etapa. "dono" diz qual responsavel conta.
export function vez(p: Estado): { papeis: Papel[]; dono?: "copy_id" | "editor_id" | "expert_id" } | null {
  switch (p.status) {
    case "copy":
    case "copy_reajuste":
      return { papeis: ["copy"], dono: "copy_id" };
    case "copy_revisao":
      return { papeis: ["admin"] };
    case "gravar":
      return { papeis: ["gravacao"], dono: "expert_id" };
    case "gravado":
    case "edicao":
    case "ajustes":
      return { papeis: ["editor"], dono: "editor_id" };
    case "pronta":
      return { papeis: ["editor"] };
    case "revisao":
      return { papeis: ["copy", "admin"], dono: "copy_id" };
    case "aprovado":
      return { papeis: ["trafego"] };
    default:
      return null;
  }
}

export type Passo = {
  id: string;
  de: Status[];
  para: Status;
  rotulo: string;
  quem: Papel[];
  principal?: boolean;
  pedeTexto?: string; // placeholder do comentario obrigatorio
  pedeVersao?: boolean; // so libera se ja tem versao editada
  pedeBruto?: boolean; // so libera se ja tem video gravado
  ajusteDe?: "copy" | "editor";
  quando?: (p: Estado) => boolean;
};

const ATIVAS: Status[] = ["copy", "copy_revisao", "copy_reajuste", "gravar", "gravado", "pronta", "edicao", "revisao", "ajustes", "aprovado", "no_ar"];

// "para" de alguns passos e decidido na hora (ver destinoDepoisDaCopy na
// action); aqui fica o destino mais comum.
export const PASSOS: Passo[] = [
  { id: "enviar_copy", de: ["copy"], para: "copy_revisao", rotulo: "Mandar a copy pra revisão", quem: ["copy", "admin"], principal: true },
  { id: "aprovar_copy", de: ["copy_revisao"], para: "gravar", rotulo: "Aprovar a copy", quem: ["admin"], principal: true },
  {
    id: "reajustar_copy",
    de: ["copy_revisao"],
    para: "copy_reajuste",
    rotulo: "Pedir reajuste de copy",
    quem: ["admin"],
    ajusteDe: "copy",
    pedeTexto: "O que precisa mudar na copy? Ex.: o hook está longo, falta o CTA…",
  },
  { id: "reenviar_copy", de: ["copy_reajuste"], para: "copy_revisao", rotulo: "Copy ajustada — mandar pra revisão", quem: ["copy", "admin"], principal: true },
  { id: "gravei", de: ["gravar"], para: "pronta", rotulo: "Gravei — mandar pra edição", quem: ["gravacao", "admin"], principal: true, pedeBruto: true },
  { id: "pegar", de: ["pronta"], para: "edicao", rotulo: "Pegar pra editar", quem: ["editor", "admin"], principal: true },
  { id: "comecar", de: ["gravado"], para: "edicao", rotulo: "Começar a edição", quem: ["editor", "admin"], principal: true },
  { id: "revisar", de: ["edicao", "ajustes"], para: "revisao", rotulo: "Enviar pra revisão", quem: ["editor", "admin"], principal: true, pedeVersao: true },
  { id: "aprovar", de: ["revisao"], para: "aprovado", rotulo: "Aprovar", quem: ["copy", "admin"], principal: true },
  {
    id: "ajustar",
    de: ["revisao"],
    para: "ajustes",
    rotulo: "Pedir ajuste no vídeo",
    quem: ["copy", "admin"],
    ajusteDe: "editor",
    pedeTexto: "O que precisa mudar no vídeo? Ex.: 0:12 tirar a música, legenda maior no hook…",
  },
  {
    id: "pedir_copy",
    de: ["gravar", "gravado", "pronta", "edicao"],
    para: "copy_reajuste",
    rotulo: "Pedir reajuste de copy",
    quem: ["gravacao", "editor", "admin"],
    ajusteDe: "copy",
    pedeTexto: "O que precisa mudar na copy? Ex.: o hook está longo, falta o CTA…",
  },
  { id: "subir", de: ["aprovado"], para: "no_ar", rotulo: "Subiu no tráfego", quem: ["trafego", "admin"], principal: true },
  { id: "bloquear", de: ATIVAS, para: "bloqueado", rotulo: "Bloquear", quem: ["admin"], pedeTexto: "Por que está bloqueada? Ex.: esperando a oferta, expert viajando…" },
  { id: "desbloquear", de: ["bloqueado"], para: "copy", rotulo: "Desbloquear", quem: ["admin"], principal: true },
  { id: "arquivar", de: [...ATIVAS, "bloqueado"], para: "arquivado", rotulo: "Arquivar", quem: ["admin"] },
  { id: "reabrir", de: ["arquivado"], para: "copy", rotulo: "Reabrir", quem: ["admin"] },
];

export function passosPara(p: Estado, papel: Papel) {
  return PASSOS.filter((s) => s.de.includes(p.status as Status) && s.quem.includes(papel) && (!s.quando || s.quando(p)));
}

// Arrastar no quadro: acha o passo que leva da coluna atual pra coluna de
// destino. O admin pode mover qualquer card pra qualquer etapa ("mover").
export function passoDoArrasto(p: Estado, papel: Papel, para: Status): Passo | null {
  const s = passosPara(p, papel).find((x) => x.para === para);
  if (s) return s;
  if (papel === "admin" && para !== p.status) return MOVER(para);
  return null;
}

export const MOVER = (para: Status): Passo => ({
  id: "mover",
  de: [...ETAPAS, "arquivado"],
  para,
  rotulo: `Mover pra ${STATUS[para].rotulo}`,
  quem: ["admin"],
  ...(para === "ajustes" ? { ajusteDe: "editor" as const, pedeTexto: "O que precisa mudar?" } : {}),
  ...(para === "copy_reajuste" ? { ajusteDe: "copy" as const, pedeTexto: "O que precisa mudar na copy?" } : {}),
  ...(para === "bloqueado" ? { pedeTexto: "Por que está bloqueada?" } : {}),
});

export function eMinhaVez(p: Estado, eu: { id: number; papel: Papel }) {
  const v = vez(p);
  if (!v) return false;
  if (eu.papel === "admin") return v.papeis.includes("admin");
  if (!v.papeis.includes(eu.papel)) return false;
  if (!v.dono) return true;
  const dono = p[v.dono];
  return dono === null || dono === undefined || dono === eu.id;
}

// O copy mexe no texto enquanto a copy esta aberta; o admin, sempre.
export const podeEditarCopy = (p: Estado, papel: Papel) =>
  papel === "admin" || (papel === "copy" && (p.status === "copy" || p.status === "copy_reajuste"));

export const LADOS = { black: "BLACK", white: "WHITE" };
export const TIPOS = { anuncio: "Anúncio", aula: "Aula", vsl: "VSL", lateralizacao: "Lateralização", organico: "Orgânico" };
export const RESULTADOS = { testando: "Testando", vencedor: "Vencedor", perdedor: "Não performou" };

export const PRIORIDADES = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" } as const;
export type Prioridade = keyof typeof PRIORIDADES;
const ORDEM_PRI: Prioridade[] = ["baixa", "media", "alta", "urgente"];

// A prioridade sobe sozinha com o tempo parado: 3 dias Alta, 7 Urgente.
export function prioridadeReal(base: string | null, dias: number, status: string): Prioridade {
  const b = (ORDEM_PRI.includes(base as Prioridade) ? base : "media") as Prioridade;
  if (!CONTA_PARADA.has(status as Status)) return b;
  const porTempo: Prioridade = dias >= 7 ? "urgente" : dias >= 3 ? "alta" : "baixa";
  return ORDEM_PRI[Math.max(ORDEM_PRI.indexOf(b), ORDEM_PRI.indexOf(porTempo))];
}
export const pesoPrioridade = (p: Prioridade) => ORDEM_PRI.indexOf(p);

export const FORMATOS_GRAVACAO = { horizontal: "Horizontal (16:9)", vertical: "Vertical (9:16)", depois: "Depois" };

// Excluir criativo de vez: o admin, sempre; o copy, so a copy DELE que ainda
// nao saiu de "Escrevendo a copy".
export const podeExcluir = (p: { status: string; copy_id: number | null; criado_por?: number | null }, eu: { id: number; papel: Papel }) =>
  eu.papel === "admin" || (eu.papel === "copy" && p.status === "copy" && (p.copy_id === eu.id || p.criado_por === eu.id));
