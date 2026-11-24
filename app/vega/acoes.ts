"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { eu as quemSou } from "@/lib/sessao";
import { cifrar, decifrar } from "@/lib/cofre";
import { PAPEIS, STATUS, type Status } from "@/lib/fluxo";
import { acharProducao, consultar, defDe, descreverAlteracao, ferramentasApi, type Eu } from "@/lib/vega";
import { comentar, criarProducao, lerTodosAvisos, marcarResultado, mudarEtapa, salvarCopy, salvarFicha } from "../acoes";
import { ofertas, tags, usuarios } from "@/lib/dados";

const MODELO = "claude-opus-5-5";
const MAX_VOLTAS = 10;

type Msg = Anthropic.Beta.BetaMessageParam;
type UsoFerramenta = { id: string; name: string; input: Record<string, unknown> };
type Pendente = { resultados: Anthropic.Beta.BetaToolResultBlockParam[]; restantes: UsoFerramenta[]; descricao: string };

const sistema = (e: Eu) => `Você é a Lyra, a assistente da esteira de criativos do Low Ticket Global (copy → gravação com o expert → edição → tráfego).
Você está falando com ${e.nome}, papel ${PAPEIS[e.papel]}. Responda em português do Brasil, curto e direto, como colega de equipe.
Use as ferramentas pra ler a esteira antes de responder sobre números, filas ou produções — não invente dados.
Chame as produções pelo nome curto (ex.: JHON_A_403) e, quando ajudar, ponha o link no formato [JHON_A_403](/producao/ID).
Alterações (criar, mover, editar, bloquear, comentar, marcar) só rodam depois que a pessoa aprova na tela; peça a ferramenta normalmente e ela vê o pedido.
Para criar produção, confirme antes expert, oferta, pelo menos uma tag e se é Black ou White; se faltar algo, pergunte em uma frase.
Se uma ferramenta der erro, explique o motivo em uma frase e diga o que a pessoa pode fazer.`;

async function eu(): Promise<Eu> {
  const e = await quemSou();
  return { id: e.id, nome: e.nome, papel: e.papel, login: e.login };
}

async function cliente(e: Eu) {
  const r = await db.execute({ sql: "SELECT anthropic_chave FROM usuarios WHERE id = ?", args: [e.id] });
  const g = r.rows[0]?.anthropic_chave as string | null | undefined;
  if (!g) return null;
  return new Anthropic({ apiKey: await decifrar(g) });
}

// ---------- chave ----------

export async function salvarChave(f: FormData) {
  const e = await eu();
  const chave = String(f.get("chave") ?? "").trim();
  if (!/^sk-ant-[\w-]{20,}$/.test(chave)) return { erro: "Essa não parece uma chave da Anthropic (começa com sk-ant-)." };
  try {
    await new Anthropic({ apiKey: chave }).models.retrieve(MODELO);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { erro: "A Anthropic recusou essa chave. Confira se copiou inteira." };
    if (err instanceof Anthropic.PermissionDeniedError) return { erro: "Essa chave não tem acesso ao modelo da Lyra." };
    if (err instanceof Anthropic.APIConnectionError) return { erro: "Não consegui falar com a Anthropic agora. Tente de novo." };
  }
  await db.execute({ sql: "UPDATE usuarios SET anthropic_chave = ? WHERE id = ?", args: [await cifrar(chave), e.id] });
  revalidatePath("/vega");
  return { ok: true };
}

export async function removerChave() {
  const e = await eu();
  await db.execute({ sql: "UPDATE usuarios SET anthropic_chave = NULL WHERE id = ?", args: [e.id] });
  revalidatePath("/vega");
}

export async function apagarConversa(f: FormData) {
  const e = await eu();
  await db.execute({ sql: "DELETE FROM vega_conversas WHERE id = ? AND usuario_id = ?", args: [Number(f.get("id")), e.id] });
  revalidatePath("/vega");
}

// ---------- conversa ----------

async function carregar(id: number, e: Eu) {
  const r = await db.execute({ sql: "SELECT * FROM vega_conversas WHERE id = ? AND usuario_id = ?", args: [id, e.id] });
  const c = r.rows[0] as { id: number; mensagens: string; pendente: string | null; liberadas: string } | undefined;
  if (!c) return null;
  return { id: c.id, mensagens: JSON.parse(c.mensagens) as Msg[], pendente: c.pendente ? (JSON.parse(c.pendente) as Pendente) : null, liberadas: new Set<string>(JSON.parse(c.liberadas)) };
}

async function guardar(c: { id: number; mensagens: Msg[]; pendente: Pendente | null; liberadas: Set<string> }) {
  await db.execute({
    sql: "UPDATE vega_conversas SET mensagens = ?, pendente = ?, liberadas = ?, atualizado_em = datetime('now') WHERE id = ?",
    args: [JSON.stringify(c.mensagens), c.pendente ? JSON.stringify(c.pendente) : null, JSON.stringify([...c.liberadas]), c.id],
  });
}

export async function perguntar(f: FormData) {
  const e = await eu();
  const texto = String(f.get("texto") ?? "").trim();
  if (!texto) return { erro: "Escreva a pergunta." };
  const api = await cliente(e);
  if (!api) return { erro: "Conecte a sua chave da Anthropic primeiro." };
  let id = Number(f.get("conversa")) || 0;
  if (!id) {
    const r = await db.execute({ sql: "INSERT INTO vega_conversas (usuario_id, titulo) VALUES (?, ?)", args: [e.id, texto.slice(0, 60)] });
    id = Number(r.lastInsertRowid);
  }
  const c = await carregar(id, e);
  if (!c) return { erro: "Conversa não encontrada." };
  if (c.pendente) return { erro: "Responda o pedido de permissão antes de perguntar outra coisa.", conversa: id };
  c.mensagens.push({ role: "user", content: texto });
  const r = await rodar(api, c, e);
  revalidatePath("/vega");
  return { ...r, conversa: id };
}

// Resposta ao pedido de permissao: "permitir" (so esta), "sempre" (esta
// ferramenta ate a conversa acabar) ou "negar".
export async function decidir(f: FormData) {
  const e = await eu();
  const id = Number(f.get("conversa"));
  const decisao = String(f.get("decisao"));
  const c = await carregar(id, e);
  if (!c?.pendente) return { erro: "Nada esperando permissão." };
  const api = await cliente(e);
  if (!api) return { erro: "Conecte a sua chave da Anthropic primeiro." };
  const [atual, ...resto] = c.pendente.restantes;
  const resultados = [...c.pendente.resultados];
  if (decisao === "negar") {
    resultados.push({ type: "tool_result", tool_use_id: atual.id, content: "A pessoa NÃO permitiu essa alteração. Não tente de novo sem ela pedir.", is_error: true });
  } else {
    if (decisao === "sempre") c.liberadas.add(atual.name);
    resultados.push({ type: "tool_result", tool_use_id: atual.id, content: JSON.stringify(await alterar(atual.name, atual.input)) });
  }
  c.pendente = null;
  const r = await rodar(api, c, e, { resultados, restantes: resto });
  revalidatePath("/vega");
  return { ...r, conversa: id };
}

// O loop: chama o modelo, roda as consultas, para quando precisar de
// permissao ou quando a Vega terminar de responder.
async function rodar(
  api: Anthropic,
  c: { id: number; mensagens: Msg[]; pendente: Pendente | null; liberadas: Set<string> },
  e: Eu,
  continuar?: { resultados: Anthropic.Beta.BetaToolResultBlockParam[]; restantes: UsoFerramenta[] }
): Promise<{ ok?: true; erro?: string }> {
  try {
    if (continuar) {
      const parou = await processar(continuar.restantes, continuar.resultados, c, e);
      if (parou) return { ok: true };
    }
    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const resp = await api.beta.messages.create({
        model: MODELO,
        max_tokens: 16000,
        system: sistema(e),
        tools: ferramentasApi(),
        messages: c.mensagens,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      c.mensagens.push({ role: "assistant", content: resp.content });
      if (resp.stop_reason === "refusal") {
        c.mensagens.push({ role: "user", content: "(a Lyra não pôde responder isso)" });
        break;
      }
      if (resp.stop_reason === "pause_turn") continue;
      if (resp.stop_reason !== "tool_use") break;
      const usos = resp.content
        .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use")
        .map((b) => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }));
      if (await processar(usos, [], c, e)) return { ok: true };
    }
    await guardar(c);
    return { ok: true };
  } catch (err) {
    await guardar(c).catch(() => {});
    if (err instanceof Anthropic.AuthenticationError) return { erro: "A Anthropic recusou a sua chave. Troque em “Chave da Anthropic”." };
    if (err instanceof Anthropic.RateLimitError) return { erro: "Muitas perguntas seguidas — espere um minuto e tente de novo." };
    if (err instanceof Anthropic.BadRequestError) return { erro: `A Anthropic não aceitou o pedido: ${err.message}` };
    if (err instanceof Anthropic.APIError) return { erro: `A Anthropic deu erro (${err.status}). Tente de novo.` };
    return { erro: "Não consegui falar com a Lyra agora. Tente de novo." };
  }
}

// Roda as ferramentas de uma volta. Devolve true se parou num pedido de
// permissao (a conversa fica guardada com o pendente).
async function processar(usos: UsoFerramenta[], prontos: Anthropic.Beta.BetaToolResultBlockParam[], c: { id: number; mensagens: Msg[]; pendente: Pendente | null; liberadas: Set<string> }, e: Eu) {
  const resultados = [...prontos];
  for (let i = 0; i < usos.length; i++) {
    const u = usos[i];
    const def = defDe(u.name);
    if (!def) {
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: "Ferramenta desconhecida.", is_error: true });
      continue;
    }
    if (def.altera && !c.liberadas.has(u.name)) {
      c.pendente = { resultados, restantes: usos.slice(i), descricao: descreverAlteracao(u.name, u.input) };
      await guardar(c);
      return true;
    }
    const r = def.altera ? await alterar(u.name, u.input) : await consultar(u.name, u.input, e);
    resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(r) });
  }
  if (resultados.length) c.mensagens.push({ role: "user", content: resultados });
  return false;
}

// ---------- alteracoes (as mesmas actions da tela) ----------

const fd = (o: Record<string, string | number | null | undefined | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else if (v !== null && v !== undefined) f.set(k, String(v));
  }
  return f;
};

async function alterar(nome: string, ent: Record<string, unknown>): Promise<unknown> {
  const s = (k: string) => String(ent[k] ?? "").trim();
  try {
    if (nome === "marcar_notificacoes_lidas") return await lerTodosAvisos();
    if (nome === "criar_producao") {
      const [gente, ofs, tgs] = await Promise.all([usuarios(true), ofertas(), tags()]);
      const t = (x: string) => x.trim().toLowerCase();
      const ex = gente.find((u) => u.papel === "gravacao" && [t(u.nome), t(u.sigla ?? ""), t(u.login)].some((v) => v && (v === t(s("expert")) || v.startsWith(t(s("expert"))))));
      const of = ofs.find((o) => t(o.sigla) === t(s("oferta")) || t(o.nome) === t(s("oferta")) || t(o.nome).includes(t(s("oferta"))));
      const ids = ((ent.tags as string[]) ?? []).map((n) => tgs.find((x) => t(x.nome) === t(n))?.id).filter(Boolean) as number[];
      if (!ex) return { erro: `Não achei o expert “${s("expert")}”.` };
      if (!of) return { erro: `Não achei a oferta “${s("oferta")}”.` };
      if (!ids.length) return { erro: "Nenhuma das tags existe. Use tags_ofertas_pessoas pra ver as tags." };
      try {
        const r = (await criarProducao(
          fd({ expert_id: ex.id, oferta_id: of.id, tag: ids.map(String), lado: s("lado"), tipo: s("tipo") || "anuncio", quantidade: Number(ent.quantidade) || 1, prioridade: s("prioridade") || "media", passa_copy: "1", passa_gravacao: "1", copy_id: "auto", editor_id: "livre", briefing: s("briefing") })
        )) as { erro?: string } | undefined;
        if (r?.erro) return { erro: r.erro };
      } catch (err) {
        // criarProducao termina com redirect: e o jeito do Next dizer "deu certo".
        const d = String((err as { digest?: string })?.digest ?? "");
        if (!d.startsWith("NEXT_REDIRECT")) throw err;
        const m = d.match(/\/producao\/(\d+)/);
        return { ok: true, criadas: Number(ent.quantidade) || 1, link: m ? `/producao/${m[1]}` : "/esteira" };
      }
      return { ok: true };
    }
    const p = await acharProducao(s("codigo"));
    if (!p) return { erro: `Não achei a produção ${s("codigo")}.` };
    const res = async (r: unknown) => ((r as { erro?: string } | undefined)?.erro ? { erro: (r as { erro: string }).erro } : { ok: true, producao: s("codigo") });
    switch (nome) {
      case "mover_producao":
        if (!STATUS[s("para") as Status]) return { erro: "Etapa inválida." };
        return await res(await mudarEtapa(fd({ id: p.id, para: s("para"), texto: s("motivo") || null })));
      case "bloquear_producao":
        return await res(await mudarEtapa(fd({ id: p.id, para: "bloqueado", texto: s("motivo") })));
      case "comentar_producao":
        return await res(await comentar(fd({ id: p.id, texto: s("texto") })));
      case "editar_copy":
        return await res(await salvarCopy(fd({ id: p.id, hook: s("hook") || p.hook, copy: s("copy") || p.copy, briefing: p.briefing, briefing_gravacao: p.briefing_gravacao })));
      case "editar_observacoes":
        return await res(await salvarCopy(fd({ id: p.id, hook: p.hook, copy: p.copy, briefing: s("edicao") || p.briefing, briefing_gravacao: s("gravacao") || p.briefing_gravacao })));
      case "marcar_black_white":
        return await res(
          await salvarFicha(
            fd({ id: p.id, lado: s("lado"), tipo: p.tipo, formato: p.formato, referencia_url: p.referencia_url, referencia_img: p.referencia_img, prazo: p.prazo, copy_id: p.copy_id, editor_id: p.editor_id, expert_id: p.expert_id, prioridade: p.prioridade, formato_gravacao: p.formato_gravacao, doc_url: p.doc_url, pasta_bruto: p.pasta_bruto, pasta_entrega: p.pasta_entrega })
          )
        );
      case "marcar_resultado":
        return await res(await marcarResultado(fd({ id: p.id, resultado: s("resultado"), resultado_nota: s("nota") })));
    }
    return { erro: "ferramenta desconhecida" };
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Não deu certo." };
  }
}
