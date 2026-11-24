// Constantes das metas/tarefas, sem banco: o front (client) tambem le daqui.

export const METRICAS = {
  copys_enviadas: { rotulo: "Copys enviadas pra gravação", papel: "copy", para: "gravar", de: null, quem: "copy_id" },
  copys_aprovadas: { rotulo: "Criativos aprovados (como copy)", papel: "copy", para: "aprovado", de: null, quem: "copy_id" },
  gravados: { rotulo: "Vídeos gravados", papel: "gravacao", para: "pronta", de: "gravar", quem: "usuario_id" },
  entregues_revisao: { rotulo: "Vídeos entregues pra revisão", papel: "editor", para: "revisao", de: null, quem: "editor_id" },
  videos_aprovados: { rotulo: "Vídeos aprovados (como editor)", papel: "editor", para: "aprovado", de: null, quem: "editor_id" },
} as const;
export type Metrica = keyof typeof METRICAS;

export const PERIODOS = { semana: "Semanal", mes: "Mensal", avulsa: "Avulsa (com prazo)" } as const;
export type Periodo = keyof typeof PERIODOS;

export const STATUS_TAREFA = {
  a_fazer: "A fazer",
  fazendo: "Fazendo",
  aprovacao: "Pra aprovar",
  concluida: "Concluída",
} as const;
export type StatusTarefa = keyof typeof STATUS_TAREFA;
// O membro mexe so ate "pra aprovar"; concluir e com o admin.
export const STATUS_DO_MEMBRO: StatusTarefa[] = ["a_fazer", "fazendo", "aprovacao"];

