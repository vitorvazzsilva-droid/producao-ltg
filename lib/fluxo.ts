// A esteira inteira mora aqui: as etapas, quem age em cada uma e o que cada
// botao (ou arrasto) faz. Tela, quadro e action leem daqui, entao mudar o
// fluxo e mexer so neste arquivo.

export type Papel = "admin" | "copy" | "gravacao" | "editor" | "trafego";

export const PAPEIS: Record<Papel, string> = {
  admin: "Admin",
  copy: "Copy",
  gravacao: "Gravação",
  editor: "Editor",
  trafego: "Tráfego",
};

export const STATUS = {
  copy: { rotulo: "Em copy", cor: "azul" },
  gravar: { rotulo: "Pra gravar", cor: "rosa" },
  pronta: { rotulo: "Pronta pra editar", cor: "roxo" },
  edicao: { rotulo: "Em edição", cor: "laranja" },
  revisao: { rotulo: "Em revisão", cor: "amarelo" },
  ajustes: { rotulo: "Ajustes pedidos", cor: "vermelho" },
  aprovado: { rotulo: "Aprovado", cor: "verde" },
  no_ar: { rotulo: "No ar", cor: "teal" },
  arquivado: { rotulo: "Arquivado", cor: "cinza" },
} as const;

export type Status = keyof typeof STATUS;

// Colunas do quadro. "No ar" nao e coluna: vive em Testes do trafego.
export const ETAPAS: Status[] = ["copy", "gravar", "pronta", "edicao", "revisao", "ajustes", "aprovado"];

// O minimo da producao que as regras precisam enxergar.
export type Estado = { status: string; copy_id: number | null; editor_id: number | null; ajuste_de?: string | null };

// Quem corrige em "ajustes pedidos": por padrao o editor (a revisao
// reprovou o video); 'copy' quando foi o editor que pediu mudanca na copy.
export const ajusteDe = (p: Estado) => (p.ajuste_de === "copy" ? "copy" : "editor");

// De quem e a vez em cada etapa. "dono" diz qual responsavel conta: se ja
// tem editor marcado, so ele ve como sua vez.
export function vez(p: Estado): { papeis: Papel[]; dono?: "copy_id" | "editor_id" } | null {
  switch (p.status) {
    case "copy":
      return { papeis: ["copy"], dono: "copy_id" };
    case "gravar":
      return { papeis: ["gravacao", "admin"] };
    case "pronta":
    case "edicao":
      return { papeis: ["editor"], dono: "editor_id" };
    case "ajustes":
      return ajusteDe(p) === "copy" ? { papeis: ["copy"], dono: "copy_id" } : { papeis: ["editor"], dono: "editor_id" };
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
  ajusteDe?: "copy" | "editor"; // quem vai corrigir, quando o passo leva pra ajustes
  quando?: (p: Estado) => boolean;
};

export const PASSOS: Passo[] = [
  { id: "mandar", de: ["copy"], para: "gravar", rotulo: "Copy pronta — mandar pra gravação", quem: ["copy", "admin"], principal: true },
  {
    id: "gravei",
    de: ["gravar"],
    para: "pronta",
    rotulo: "Gravei — mandar pro editor",
    quem: ["gravacao", "admin"],
    principal: true,
    pedeBruto: true,
  },
  { id: "pegar", de: ["pronta"], para: "edicao", rotulo: "Pegar pra editar", quem: ["editor", "admin"], principal: true },
  {
    id: "revisar",
    de: ["edicao", "ajustes"],
    para: "revisao",
    rotulo: "Enviar pra revisão",
    quem: ["editor", "admin"],
    principal: true,
    pedeVersao: true,
    quando: (p) => p.status === "edicao" || ajusteDe(p) === "editor",
  },
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
    id: "ajustar_copy",
    de: ["gravar", "pronta", "edicao"],
    para: "ajustes",
    rotulo: "Pedir ajuste na copy",
    quem: ["gravacao", "editor", "admin"],
    ajusteDe: "copy",
    pedeTexto: "O que precisa mudar na copy? Ex.: o hook está longo, falta o CTA…",
  },
  {
    id: "copy_ajustada",
    de: ["ajustes"],
    para: "edicao",
    rotulo: "Copy ajustada — devolver",
    quem: ["copy", "admin"],
    principal: true,
    quando: (p) => ajusteDe(p) === "copy",
  },
  { id: "subir", de: ["aprovado"], para: "no_ar", rotulo: "Subiu no tráfego", quem: ["trafego", "admin"], principal: true },
  { id: "voltar_copy", de: ["gravar", "pronta"], para: "copy", rotulo: "Voltar pra copy", quem: ["copy", "admin"] },
  { id: "arquivar", de: ["copy", "pronta", "edicao", "revisao", "ajustes", "aprovado", "no_ar"], para: "arquivado", rotulo: "Arquivar", quem: ["admin"] },
  { id: "reabrir", de: ["arquivado"], para: "copy", rotulo: "Reabrir", quem: ["admin"] },
];

export function passosPara(p: Estado, papel: Papel) {
  return PASSOS.filter(
    (s) => s.de.includes(p.status as Status) && s.quem.includes(papel) && (!s.quando || s.quando(p))
  );
}

// Arrastar no quadro: acha o passo que leva da coluna atual pra coluna de
// destino. O admin pode mover qualquer card pra qualquer etapa ("mover").
export function passoDoArrasto(p: Estado, papel: Papel, para: Status): Passo | null {
  const s = passosPara(p, papel).find(
    (x) => x.para === para || (x.id === "copy_ajustada" && (para === "edicao" || para === "pronta" || para === "gravar"))
  );
  if (s) return s;
  if (papel === "admin" && para !== p.status) return MOVER(para);
  return null;
}

export const MOVER = (para: Status): Passo => ({
  id: "mover",
  de: [...ETAPAS, "no_ar", "arquivado"],
  para,
  rotulo: `Mover pra ${STATUS[para].rotulo}`,
  quem: ["admin"],
  ...(para === "ajustes" ? { ajusteDe: "editor" as const, pedeTexto: "O que precisa mudar?" } : {}),
});

export function eMinhaVez(p: Estado, eu: { id: number; papel: Papel }) {
  const v = vez(p);
  if (!v || !v.papeis.includes(eu.papel)) return false;
  if (!v.dono || eu.papel === "admin") return true;
  const dono = p[v.dono];
  return dono === null || dono === eu.id;
}

// O copy mexe no texto enquanto a copy esta aberta; o admin, sempre.
export const podeEditarCopy = (p: Estado, papel: Papel) =>
  papel === "admin" || (papel === "copy" && (p.status === "copy" || p.status === "ajustes"));

export const LADOS = { black: "BLACK", white: "WHITE" };
export const TIPOS = { anuncio: "Anúncio", lateralizacao: "Lateralização", organico: "Orgânico" };
export const RESULTADOS = { testando: "Testando", vencedor: "Vencedor", perdedor: "Não performou" };
