// A esteira inteira mora aqui: as etapas, quem age em cada uma e o que cada
// botao faz. Tela e action leem daqui, entao mudar o fluxo e mexer so neste
// arquivo.

export type Papel = "admin" | "copy" | "editor" | "trafego";

export const PAPEIS: Record<Papel, string> = {
  admin: "Admin",
  copy: "Copy",
  editor: "Editor",
  trafego: "Tráfego",
};

export const STATUS = {
  copy: { rotulo: "Em copy", cor: "azul" },
  pronta: { rotulo: "Pronta pra editar", cor: "roxo" },
  edicao: { rotulo: "Em edição", cor: "laranja" },
  revisao: { rotulo: "Em revisão", cor: "amarelo" },
  ajustes: { rotulo: "Ajustes pedidos", cor: "vermelho" },
  aprovado: { rotulo: "Aprovado", cor: "verde" },
  no_ar: { rotulo: "No ar", cor: "teal" },
  arquivado: { rotulo: "Arquivado", cor: "cinza" },
} as const;

export type Status = keyof typeof STATUS;

// Ordem das colunas da esteira.
export const ETAPAS: Status[] = ["copy", "pronta", "edicao", "revisao", "ajustes", "aprovado", "no_ar"];

// De quem e a vez em cada etapa. "dono" diz qual responsavel da producao
// conta: se ja tem editor marcado, so ele ve como sua vez.
export const VEZ: Partial<Record<Status, { papeis: Papel[]; dono?: "copy_id" | "editor_id" }>> = {
  copy: { papeis: ["copy"], dono: "copy_id" },
  pronta: { papeis: ["editor"], dono: "editor_id" },
  edicao: { papeis: ["editor"], dono: "editor_id" },
  ajustes: { papeis: ["editor"], dono: "editor_id" },
  revisao: { papeis: ["copy", "admin"], dono: "copy_id" },
  aprovado: { papeis: ["trafego"] },
};

export type Passo = {
  id: string;
  de: Status[];
  para: Status;
  rotulo: string;
  quem: Papel[];
  principal?: boolean;
  pedeTexto?: string; // placeholder do campo obrigatorio
  pedeVersao?: boolean; // so libera se ja tem versao editada
};

export const PASSOS: Passo[] = [
  { id: "mandar", de: ["copy"], para: "pronta", rotulo: "Copy pronta — mandar pro editor", quem: ["copy", "admin"], principal: true },
  { id: "pegar", de: ["pronta"], para: "edicao", rotulo: "Começar a edição", quem: ["editor", "admin"], principal: true },
  { id: "revisar", de: ["edicao", "ajustes"], para: "revisao", rotulo: "Enviar pra revisão", quem: ["editor", "admin"], principal: true, pedeVersao: true },
  { id: "aprovar", de: ["revisao"], para: "aprovado", rotulo: "Aprovar", quem: ["copy", "admin"], principal: true },
  {
    id: "ajustar",
    de: ["revisao"],
    para: "ajustes",
    rotulo: "Pedir ajustes",
    quem: ["copy", "admin"],
    pedeTexto: "O que precisa mudar? Ex.: 0:12 tirar a música, legenda maior no hook…",
  },
  { id: "subir", de: ["aprovado"], para: "no_ar", rotulo: "Subiu no tráfego", quem: ["trafego", "admin"], principal: true },
  { id: "voltar_copy", de: ["pronta", "edicao"], para: "copy", rotulo: "Voltar pra copy", quem: ["copy", "admin"] },
  { id: "arquivar", de: ["copy", "pronta", "edicao", "revisao", "ajustes", "aprovado", "no_ar"], para: "arquivado", rotulo: "Arquivar", quem: ["admin"] },
  { id: "reabrir", de: ["arquivado"], para: "copy", rotulo: "Reabrir", quem: ["admin"] },
];

export function passosPara(status: string, papel: Papel) {
  return PASSOS.filter((p) => p.de.includes(status as Status) && (p.quem.includes(papel) || papel === "admin"));
}

export function eMinhaVez(
  p: { status: string; copy_id: number | null; editor_id: number | null },
  eu: { id: number; papel: Papel }
) {
  const v = VEZ[p.status as Status];
  if (!v || !v.papeis.includes(eu.papel)) return false;
  if (!v.dono || eu.papel === "admin") return true;
  const dono = p[v.dono];
  return dono === null || dono === eu.id;
}

export const LADOS = { black: "BLACK", white: "WHITE" };
export const TIPOS = { anuncio: "Anúncio", lateralizacao: "Lateralização", organico: "Orgânico" };
export const RESULTADOS = { testando: "Testando", vencedor: "Vencedor", perdedor: "Não performou" };
