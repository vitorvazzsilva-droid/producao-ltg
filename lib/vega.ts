// As ferramentas da Vega. Consultas rodam direto; alteracoes passam pela tela
// de permissao antes (ver app/vega/acoes.ts) e usam as MESMAS actions da tela,
// entao a Vega so consegue fazer o que a pessoa conseguiria clicando.
import type Anthropic from "@anthropic-ai/sdk";
import { avisos, ofertas, producoes, relatorios, tags, usuarios } from "./dados";
import { nomeCurto, tagsDe, tempo, type Producao } from "./producao-base";
import { CONTA_PARADA, DIAS_PARADA, ETAPAS, PAPEIS, PRIORIDADES, STATUS, TIPOS, eMinhaVez, prioridadeReal, type Papel, type Status } from "./fluxo";

export type Eu = { id: number; nome: string; papel: Papel; login: string };

type Def = {
  nome: string;
  rotulo: string;
  grupo: string;
  altera: boolean;
  descricao: string;
  props: Record<string, unknown>;
  obrigatorios: string[];
};

const S = (description: string) => ({ type: "string", description });
const N = (description: string) => ({ type: "integer", description });
const ETAPA = { type: "string", enum: ETAPAS, description: "Chave da etapa" };

export const FERRAMENTAS: Def[] = [
  { nome: "minha_fila", rotulo: "Minha fila", grupo: "Esteira e produções", altera: false, descricao: "O que está na vez da pessoa agora, da mais urgente pra menos.", props: {}, obrigatorios: [] },
  { nome: "buscar_producoes", rotulo: "Buscar produções", grupo: "Esteira e produções", altera: false, descricao: "Busca produções por código, nome curto, hook, copy ou nome de pessoa.", props: { texto: S("O que procurar") }, obrigatorios: ["texto"] },
  { nome: "listar_producoes", rotulo: "Listar produções", grupo: "Esteira e produções", altera: false, descricao: "Lista produções de uma etapa (ou de todas), opcionalmente de um expert.", props: { etapa: { ...ETAPA, description: "Etapa; vazio = todas" }, expert: S("Nome ou sigla do expert; vazio = todos") }, obrigatorios: [] },
  { nome: "o_que_esta_parado", rotulo: "O que está parado", grupo: "Esteira e produções", altera: false, descricao: `Produções há ${DIAS_PARADA} dias ou mais na mesma etapa, por etapa e com quem está.`, props: {}, obrigatorios: [] },
  { nome: "voltou_com_ajuste", rotulo: "Voltou com ajuste", grupo: "Esteira e produções", altera: false, descricao: "O que voltou com pedido de ajuste (vídeo ou copy) e o que foi pedido.", props: {}, obrigatorios: [] },
  { nome: "abrir_producao", rotulo: "Abrir produção", grupo: "Esteira e produções", altera: false, descricao: "Tudo de uma produção: ficha, copy, versões e etapa.", props: { codigo: S("Código canônico ou nome curto, ex. JHON_A_403") }, obrigatorios: ["codigo"] },
  { nome: "criar_producao", rotulo: "Criar produção", grupo: "Esteira e produções", altera: true, descricao: "Cria uma ou mais produções. Antes, pergunte o que faltar (expert, oferta, tags, Black/White).", props: { expert: S("Nome ou sigla do expert"), oferta: S("Nome ou sigla da oferta"), tags: { type: "array", items: { type: "string" }, description: "Nomes das tags (pelo menos uma)" }, lado: { type: "string", enum: ["black", "white"] }, tipo: { type: "string", enum: Object.keys(TIPOS) }, quantidade: N("Quantas (1 a 50)"), prioridade: { type: "string", enum: Object.keys(PRIORIDADES) }, briefing: S("Briefing opcional") }, obrigatorios: ["expert", "oferta", "tags", "lado"] },
  { nome: "mover_producao", rotulo: "Mover produção", grupo: "Esteira e produções", altera: true, descricao: "Move a produção pra outra etapa, seguindo as regras da esteira.", props: { codigo: S("Código ou nome curto"), para: ETAPA, motivo: S("Obrigatório quando pede ajuste ou bloqueia") }, obrigatorios: ["codigo", "para"] },
  { nome: "bloquear_producao", rotulo: "Bloquear produção", grupo: "Esteira e produções", altera: true, descricao: "Tira a produção do fluxo (Fora do fluxo) com um motivo.", props: { codigo: S("Código ou nome curto"), motivo: S("Por que está bloqueada") }, obrigatorios: ["codigo", "motivo"] },
  { nome: "comentar_producao", rotulo: "Comentar", grupo: "Esteira e produções", altera: true, descricao: "Deixa um comentário na produção (pode usar @login).", props: { codigo: S("Código ou nome curto"), texto: S("O comentário") }, obrigatorios: ["codigo", "texto"] },
  { nome: "abrir_copy", rotulo: "Abrir a copy", grupo: "Copy", altera: false, descricao: "Hook, roteiro e recados de uma produção.", props: { codigo: S("Código ou nome curto") }, obrigatorios: ["codigo"] },
  { nome: "versoes_da_copy", rotulo: "Versões da copy", grupo: "Copy", altera: false, descricao: "Histórico de mudanças e pedidos de ajuste da produção.", props: { codigo: S("Código ou nome curto") }, obrigatorios: ["codigo"] },
  { nome: "editar_copy", rotulo: "Editar a copy", grupo: "Copy", altera: true, descricao: "Troca o hook e/ou o roteiro. Só vale em Escrevendo a copy ou Reajuste de copy.", props: { codigo: S("Código ou nome curto"), hook: S("Hook novo; vazio mantém"), copy: S("Roteiro novo inteiro; vazio mantém") }, obrigatorios: ["codigo"] },
  { nome: "editar_observacoes", rotulo: "Editar as observações", grupo: "Copy", altera: true, descricao: "Troca os recados pra gravação e/ou pra edição.", props: { codigo: S("Código ou nome curto"), gravacao: S("Recado pra gravação; vazio mantém"), edicao: S("Recado pra edição; vazio mantém") }, obrigatorios: ["codigo"] },
  { nome: "marcar_black_white", rotulo: "Marcar Black ou White", grupo: "Copy", altera: true, descricao: "Troca se a copy é Black ou White.", props: { codigo: S("Código ou nome curto"), lado: { type: "string", enum: ["black", "white"] } }, obrigatorios: ["codigo", "lado"] },
  { nome: "listar_lateralizacoes", rotulo: "Listar lateralizações", grupo: "Tráfego e lateralização", altera: false, descricao: "Produções do tipo lateralização e em que etapa estão.", props: {}, obrigatorios: [] },
  { nome: "candidatos_para_lateralizar", rotulo: "Candidatos para lateralizar", grupo: "Tráfego e lateralização", altera: false, descricao: "Criativos no ar marcados como vencedores ou com melhor ROI no relatório — bons pra virar variação.", props: {}, obrigatorios: [] },
  { nome: "relatorios_do_trafego", rotulo: "Relatórios do tráfego", grupo: "Tráfego e lateralização", altera: false, descricao: "ROI, vendas, criativos que mais performaram e testes dos últimos 7 dias, por expert.", props: {}, obrigatorios: [] },
  { nome: "marcar_resultado", rotulo: "Marcar resultado", grupo: "Tráfego e lateralização", altera: true, descricao: "Marca o resultado de um criativo no ar: testando, vencedor ou perdedor.", props: { codigo: S("Código ou nome curto"), resultado: { type: "string", enum: ["testando", "vencedor", "perdedor"] }, nota: S("Nota opcional") }, obrigatorios: ["codigo", "resultado"] },
  { nome: "quem_sou_eu", rotulo: "Quem sou eu", grupo: "Pessoas e gestão", altera: false, descricao: "Nome e papel de quem está falando com a Lyra.", props: {}, obrigatorios: [] },
  { nome: "tags_ofertas_pessoas", rotulo: "Tags, ofertas e pessoas", grupo: "Pessoas e gestão", altera: false, descricao: "As tags, ofertas e a equipe (com siglas e papéis) cadastradas.", props: {}, obrigatorios: [] },
  { nome: "minhas_notificacoes", rotulo: "Minhas notificações", grupo: "Avisos", altera: false, descricao: "Os avisos da pessoa, os não lidos primeiro.", props: {}, obrigatorios: [] },
  { nome: "marcar_notificacoes_lidas", rotulo: "Marcar notificações como lidas", grupo: "Avisos", altera: true, descricao: "Marca todos os avisos da pessoa como lidos.", props: {}, obrigatorios: [] },
];

export const GRUPOS_VEGA = [...new Set(FERRAMENTAS.map((f) => f.grupo))];

export function ferramentasApi(): Anthropic.Tool[] {
  return FERRAMENTAS.map((f) => ({
    name: f.nome,
    description: f.descricao + (f.altera ? " (Alteração: a pessoa aprova antes de rodar.)" : ""),
    input_schema: { type: "object" as const, properties: f.props, required: f.obrigatorios },
  }));
}

export const defDe = (nome: string) => FERRAMENTAS.find((f) => f.nome === nome);

// ---- resumo de producao pro modelo ----
const dias = (p: Producao) => Math.floor((p.horas_etapa ?? 0) / 24);
const parada = (p: Producao) => CONTA_PARADA.has(p.status as Status) && dias(p) >= DIAS_PARADA;

export function resumo(p: Producao) {
  return {
    codigo: p.codigo,
    curto: nomeCurto(p),
    etapa: STATUS[p.status as Status]?.rotulo ?? p.status,
    etapa_chave: p.status,
    expert: p.expert_nome,
    copy: p.copy_nome,
    editor: p.editor_nome,
    tipo: TIPOS[p.tipo as keyof typeof TIPOS] ?? p.tipo,
    lado: p.lado,
    prioridade: PRIORIDADES[prioridadeReal(p.prioridade, dias(p), p.status)],
    na_etapa: tempo(p.horas_etapa),
    parada: parada(p),
    tags: tagsDe(p).map((t) => t.nome),
    hook: p.hook,
    link: `/producao/${p.id}`,
  };
}

export async function acharProducao(codigo: string) {
  const alvo = codigo.trim().toUpperCase().replace(/\s/g, "");
  const todas = await producoes({ status: [...ETAPAS, "arquivado"] });
  return todas.find((p) => p.codigo.toUpperCase() === alvo || nomeCurto(p).toUpperCase() === alvo) ?? null;
}

const achaPessoa = async (txt: string, papel?: string) => {
  const t = txt.trim().toLowerCase();
  const gente = (await usuarios(true)).filter((u) => !papel || u.papel === papel);
  return gente.find((u) => u.sigla?.toLowerCase() === t || u.login === t || u.nome.toLowerCase() === t) ?? gente.find((u) => u.nome.toLowerCase().includes(t)) ?? null;
};

// Consultas: rodam direto e devolvem JSON.
export async function consultar(nome: string, ent: Record<string, unknown>, eu: Eu): Promise<unknown> {
  const s = (k: string) => String(ent[k] ?? "").trim();
  const ativas = () => producoes({ status: ETAPAS.filter((e) => e !== "bloqueado") });
  switch (nome) {
    case "minha_fila": {
      const fila = (await ativas()).filter((p) => eMinhaVez(p, eu));
      return fila.map(resumo).sort((a, b) => Object.keys(PRIORIDADES).indexOf(b.prioridade) - Object.keys(PRIORIDADES).indexOf(a.prioridade));
    }
    case "buscar_producoes":
      return (await producoes({ busca: s("texto"), status: [...ETAPAS] })).slice(0, 30).map(resumo);
    case "listar_producoes": {
      const etapa = s("etapa");
      let l = await producoes({ status: etapa && ETAPAS.includes(etapa as Status) ? [etapa] : ETAPAS });
      if (s("expert")) {
        const x = await achaPessoa(s("expert"), "gravacao");
        l = l.filter((p) => p.expert_id === x?.id);
      }
      return { total: l.length, producoes: l.slice(0, 60).map(resumo) };
    }
    case "o_que_esta_parado":
      return (await ativas()).filter(parada).map(resumo);
    case "voltou_com_ajuste": {
      const l = (await ativas()).filter((p) => p.status === "ajustes" || p.status === "copy_reajuste");
      const { ajustesDe } = await import("./dados");
      const aj = await ajustesDe(l.map((p) => p.id));
      return l.map((p) => ({ ...resumo(p), pedido: aj.get(p.id)?.texto ?? null, pedido_por: aj.get(p.id)?.autor ?? null }));
    }
    case "abrir_producao":
    case "abrir_copy": {
      const p = await acharProducao(s("codigo"));
      if (!p) return { erro: `Não achei a produção ${s("codigo")}.` };
      const base = { ...resumo(p), copy_texto: p.copy, recado_gravacao: p.briefing_gravacao, recado_edicao: p.briefing };
      if (nome === "abrir_copy") return base;
      return { ...base, oferta: p.oferta_nome, prazo: p.prazo, versoes_editadas: p.versoes, brutos: p.brutos, resultado: p.resultado };
    }
    case "versoes_da_copy": {
      const p = await acharProducao(s("codigo"));
      if (!p) return { erro: `Não achei a produção ${s("codigo")}.` };
      const { comentarios } = await import("./dados");
      return (await comentarios(p.id)).slice(-30).map((c) => ({ quando: c.criado_em, quem: c.autor, tipo: c.tipo, texto: c.texto }));
    }
    case "listar_lateralizacoes":
      return (await producoes({ status: ETAPAS, tipo: "lateralizacao" })).map(resumo);
    case "candidatos_para_lateralizar": {
      const noAr = await producoes({ status: ["no_ar"] });
      return noAr.filter((p) => p.resultado === "vencedor").map(resumo);
    }
    case "relatorios_do_trafego": {
      const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - 7 * 86400000));
      const gente = await usuarios(true);
      return (await relatorios(d)).map((r) => ({ ...r, expert: gente.find((g) => g.id === r.expert_id)?.nome }));
    }
    case "quem_sou_eu":
      return { nome: eu.nome, login: eu.login, papel: PAPEIS[eu.papel] };
    case "tags_ofertas_pessoas": {
      const [t, o, g] = await Promise.all([tags(), ofertas(), usuarios(true)]);
      return {
        tags: t.map((x) => x.nome),
        ofertas: o.map((x) => ({ nome: x.nome, sigla: x.sigla, de: g.find((u) => u.id === x.expert_id)?.nome ?? "todos" })),
        pessoas: g.map((u) => ({ nome: u.nome, login: u.login, sigla: u.sigla, papel: PAPEIS[u.papel as Papel] })),
      };
    }
    case "minhas_notificacoes":
      return (await avisos(eu.id, 30)).map((a) => ({ texto: a.texto, lido: !!a.lido, quando: a.criado_em, producao: a.codigo }));
  }
  return { erro: "ferramenta desconhecida" };
}

// Frase curta do que a alteracao vai fazer (aparece no pedido de permissao).
export function descreverAlteracao(nome: string, e: Record<string, unknown>) {
  const s = (k: string) => String(e[k] ?? "");
  switch (nome) {
    case "criar_producao":
      return `Criar ${Number(e.quantidade) || 1} produção(ões) — expert ${s("expert")}, oferta ${s("oferta")}, ${s("lado").toUpperCase()}, tags ${(e.tags as string[] | undefined)?.join(", ") ?? ""}`;
    case "mover_producao":
      return `Mover ${s("codigo")} para “${STATUS[s("para") as Status]?.rotulo ?? s("para")}”${s("motivo") ? ` — ${s("motivo")}` : ""}`;
    case "bloquear_producao":
      return `Bloquear ${s("codigo")} — ${s("motivo")}`;
    case "comentar_producao":
      return `Comentar em ${s("codigo")}: “${s("texto")}”`;
    case "editar_copy":
      return `Editar a copy de ${s("codigo")}${s("hook") ? ` — hook: “${s("hook")}”` : ""}${s("copy") ? " — roteiro novo" : ""}`;
    case "editar_observacoes":
      return `Editar os recados de ${s("codigo")}`;
    case "marcar_black_white":
      return `Marcar ${s("codigo")} como ${s("lado").toUpperCase()}`;
    case "marcar_resultado":
      return `Marcar ${s("codigo")} como ${s("resultado")}`;
    case "marcar_notificacoes_lidas":
      return "Marcar todos os seus avisos como lidos";
  }
  return nome;
}
