"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { COOKIE, criarSessao, hashSenha, novoSal, senhaAleatoria } from "@/lib/auth";
import { eu, preparar, type Eu } from "@/lib/sessao";
import { RESULTADOS, STATUS, passoDoArrasto, passosPara, podeEditarCopy, podeExcluir, type Papel, type Status } from "@/lib/fluxo";
import { linkValido } from "@/lib/midia";
import { inicioDoPeriodo } from "@/lib/metas";
import { METRICAS, PERIODOS, STATUS_DO_MEMBRO, STATUS_TAREFA, type Metrica, type Periodo, type StatusTarefa } from "@/lib/metas-base";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ouNulo = (s: string) => (s === "" ? null : s);

// ---------- entrar / sair ----------

export async function entrar(_: unknown, f: FormData) {
  await preparar();
  const login = txt(f, "login").toLowerCase();
  const senha = String(f.get("senha") ?? "");
  const r = await db.execute({
    sql: "SELECT id, senha_hash, sal FROM usuarios WHERE login = ? AND ativo = 1",
    args: [login],
  });
  const u = r.rows[0] as { id: number; senha_hash: string; sal: string } | undefined;
  if (!u || (await hashSenha(senha, u.sal)) !== u.senha_hash) {
    return { erro: "Usuário ou senha errados." };
  }
  const s = await criarSessao(u.id);
  (await cookies()).set(COOKIE, s.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: s.maxAge,
  });
  redirect("/");
}

export async function sair() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// ---------- avisos ----------

async function avisar(ids: (number | null | undefined)[], producao: number, texto: string, menos: number) {
  const unicos = [...new Set(ids.filter((x): x is number => !!x && x !== menos))];
  for (const u of unicos) {
    await db.execute({
      sql: "INSERT INTO avisos (usuario_id, producao_id, texto) VALUES (?, ?, ?)",
      args: [u, producao, texto],
    });
  }
}

async function idsDoPapel(papel: Papel) {
  const r = await db.execute({ sql: "SELECT id FROM usuarios WHERE papel = ? AND ativo = 1", args: [papel] });
  return r.rows.map((l) => Number(l.id));
}

async function registrar(producao: number, usuario: number | null, texto: string, tipo = "evento") {
  await db.execute({
    sql: "INSERT INTO comentarios (producao_id, usuario_id, tipo, texto) VALUES (?, ?, ?, ?)",
    args: [producao, usuario, tipo, texto],
  });
  await db.execute({ sql: "UPDATE producoes SET atualizado_em = datetime('now') WHERE id = ?", args: [producao] });
}

async function carregar(id: number) {
  const r = await db.execute({ sql: "SELECT * FROM producoes WHERE id = ?", args: [id] });
  const p = r.rows[0] as
    | {
        id: number;
        codigo: string;
        status: Status;
        copy_id: number | null;
        editor_id: number | null;
        expert_id: number | null;
        ajuste_de: string | null;
        passa_gravacao: number | null;
        status_antes: string | null;
      }
    | undefined;
  if (!p) throw new Error("produção não existe");
  return p;
}

const podeEditarFicha = (e: Eu) => e.papel === "admin" || e.papel === "copy";

// @login nos comentarios: devolve os ids de quem foi marcado.
async function mencionados(texto: string) {
  const logins = [...new Set([...texto.matchAll(/@([a-z0-9.]+)/gi)].map((m) => m[1].toLowerCase()))];
  if (!logins.length) return [];
  const r = await db.execute({
    sql: `SELECT id FROM usuarios WHERE ativo = 1 AND login IN (${logins.map(() => "?").join(",")})`,
    args: logins,
  });
  return r.rows.map((l) => Number(l.id));
}

// ---------- producao ----------

const sigla = (s: string, n = 5) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, n);

// Distribui pela regra do Orbita: vai pra quem tem MENOS producoes abertas
// naquele papel agora (o admin/lider nao entra no sorteio).
async function quemTemMenos(papel: Papel, status: string[]) {
  const r = await db.execute({
    sql: `SELECT u.id, (SELECT COUNT(*) FROM producoes p WHERE p.${papel === "copy" ? "copy_id" : "editor_id"} = u.id
            AND p.status IN (${status.map(() => "?").join(",")})) AS n
          FROM usuarios u WHERE u.papel = ? AND u.ativo = 1 ORDER BY n, u.id LIMIT 1`,
    args: [...status, papel],
  });
  return r.rows[0] ? Number(r.rows[0].id) : null;
}

// Pra onde vai a producao quando a copy fica pronta (ou nasce sem copy):
// gravacao, se a etapa esta ligada e ainda nao tem bruto; senao edicao.
async function destinoDepoisDaCopy(p: { id: number; passa_gravacao: number | null; editor_id: number | null }): Promise<Status> {
  if (p.passa_gravacao !== 0) {
    const b = await db.execute({ sql: "SELECT COUNT(*) AS n FROM materiais WHERE producao_id = ? AND tipo = 'bruto'", args: [p.id] });
    if (!Number(b.rows[0].n)) return "gravar";
  }
  return p.editor_id ? "gravado" : "pronta";
}

export async function criarProducao(f: FormData) {
  const e = await eu();
  if (e.papel !== "admin" && e.papel !== "copy") return { erro: "Só o copy ou o admin criam produção." };
  const expertId = Number(f.get("expert_id")) || null;
  const ofertaId = Number(f.get("oferta_id")) || null;
  const tagIds = f.getAll("tag").map(Number).filter(Boolean);
  const lado = txt(f, "lado");
  if (!tagIds.length) return { erro: "Marque pelo menos uma tag." };
  if (!expertId) return { erro: "Escolha o expert." };
  if (!ofertaId) return { erro: "Escolha a oferta." };
  if (lado !== "black" && lado !== "white") return { erro: "Diga se a copy é Black ou White." };
  const qtd = Math.min(50, Math.max(1, Math.floor(Number(f.get("quantidade")) || 1)));
  const passaCopy = f.get("passa_copy") ? 1 : 0;
  const passaGrav = f.get("passa_gravacao") ? 1 : 0;

  const ex = (await db.execute({ sql: "SELECT id, nome, sigla FROM usuarios WHERE id = ?", args: [expertId] })).rows[0] as
    | { id: number; nome: string; sigla: string | null }
    | undefined;
  const of = (await db.execute({ sql: "SELECT id, sigla, contador FROM ofertas WHERE id = ?", args: [ofertaId] })).rows[0] as
    | { id: number; sigla: string; contador: number }
    | undefined;
  if (!ex || !of) return { erro: "Expert ou oferta não existe mais." };
  const siglaEx = ex.sigla || sigla(ex.nome, 4);

  const escolhaCopy = txt(f, "copy_id"); // "auto" | id
  const escolhaEditor = txt(f, "editor_id"); // "livre" | "auto" | id
  const abertasCopy = ["copy", "copy_revisao", "copy_reajuste"];
  const abertasEdicao = ["gravado", "edicao", "revisao", "ajustes"];
  const lote = `${Date.now().toString(36)}`;
  // Material base: a nova nasce com o hook/copy/formato da producao escolhida.
  const baseId = Number(f.get("base_id")) || null;
  const base = baseId
    ? ((await db.execute({ sql: "SELECT hook, copy, formato FROM producoes WHERE id = ?", args: [baseId] })).rows[0] as
        | { hook: string | null; copy: string | null; formato: string | null }
        | undefined)
    : undefined;
  const ids: number[] = [];

  // Reserva o bloco de sequenciais da oferta de uma vez.
  await db.execute({ sql: "UPDATE ofertas SET contador = contador + ? WHERE id = ?", args: [qtd, ofertaId] });
  const inicio = Number((await db.execute({ sql: "SELECT contador FROM ofertas WHERE id = ?", args: [ofertaId] })).rows[0].contador) - qtd;

  for (let i = 1; i <= qtd; i++) {
    const numero = inicio + i;
    let copyId: number | null = null;
    if (passaCopy) {
      copyId = escolhaCopy === "auto" || !escolhaCopy ? await quemTemMenos("copy", abertasCopy) : Number(escolhaCopy);
      if (!copyId && e.papel === "copy") copyId = e.id;
    }
    const editorId =
      escolhaEditor === "auto" ? await quemTemMenos("editor", abertasEdicao) : escolhaEditor && escolhaEditor !== "livre" ? Number(escolhaEditor) : null;
    const siglaCopy = copyId ? String((await db.execute({ sql: "SELECT COALESCE(sigla, UPPER(SUBSTR(nome,1,3))) AS s FROM usuarios WHERE id = ?", args: [copyId] })).rows[0]?.s ?? "") : "SEM";
    const codigo = `${siglaEx}_${of.sigla}_${sigla(siglaCopy, 4) || "SEM"}_${String(numero).padStart(3, "0")}`;
    const status: Status = passaCopy ? "copy" : passaGrav ? "gravar" : editorId ? "gravado" : "pronta";
    const r = await db.execute({
      sql: `INSERT INTO producoes (codigo, angulo, lado, tipo, formato, prazo, status, copy_id, editor_id, expert_id, oferta_id, numero,
              prioridade, formato_gravacao, passa_copy, passa_gravacao, doc_url, pasta_bruto, pasta_entrega, briefing, lote, criado_por, etapa_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        codigo,
        codigo,
        lado,
        txt(f, "tipo") || "anuncio",
        ouNulo(txt(f, "formato")) ?? base?.formato ?? null,
        ouNulo(txt(f, "prazo")),
        status,
        copyId,
        editorId,
        expertId,
        ofertaId,
        numero,
        ["baixa", "media", "alta", "urgente"].includes(txt(f, "prioridade")) ? txt(f, "prioridade") : "media",
        ouNulo(txt(f, "formato_gravacao")),
        passaCopy,
        passaGrav,
        linkOuNulo(txt(f, "doc_url")),
        linkOuNulo(txt(f, "pasta_bruto")),
        linkOuNulo(txt(f, "pasta_entrega")),
        ouNulo(txt(f, "briefing")),
        lote,
        e.id,
      ],
    });
    const id = Number(r.lastInsertRowid);
    ids.push(id);
    if (base && (base.hook || base.copy)) {
      await db.execute({ sql: "UPDATE producoes SET hook = ?, copy = ? WHERE id = ?", args: [base.hook, base.copy, id] });
    }
    if (tagIds.length) await db.batch(tagIds.map((t) => `INSERT OR IGNORE INTO producao_tags (producao_id, tag_id) VALUES (${id}, ${Number(t)})`));
    await db.execute({ sql: "INSERT INTO passagens (producao_id, de, para, usuario_id, copy_id, editor_id) VALUES (?, NULL, ?, ?, ?, ?)", args: [id, status, e.id, copyId, editorId] });
    await registrar(id, e.id, `criou a produção ${codigo}`);
    if (copyId) await avisar([copyId], id, `${e.nome} criou ${codigo} pra você escrever`, e.id);
    else if (status === "gravar") await avisar([expertId], id, `${e.nome} criou ${codigo} pra você gravar`, e.id);
  }
  revalidatePath("/", "layout");
  redirect(qtd === 1 ? `/producao/${ids[0]}` : "/esteira");
}

const linkOuNulo = (s: string) => (s && linkValido(s) ? s : null);

export async function criarOferta(f: FormData) {
  const e = await eu();
  if (e.papel !== "admin" && e.papel !== "copy") return { erro: "sem permissão" };
  const nome = txt(f, "nome");
  const sg = sigla(txt(f, "sigla") || nome, 5);
  if (!nome || !sg) return { erro: "Coloque o nome da oferta." };
  const expert = Number(f.get("expert_id")) || null;
  const r = await db.execute({ sql: "INSERT INTO ofertas (nome, sigla, expert_id) VALUES (?, ?, ?)", args: [nome, sg, expert] });
  revalidatePath("/nova");
  return { ok: { id: Number(r.lastInsertRowid), nome, sigla: sg, expert_id: expert } };
}

export async function criarTag(f: FormData) {
  const e = await eu();
  if (e.papel !== "admin" && e.papel !== "copy") return { erro: "sem permissão" };
  const nome = txt(f, "nome").slice(0, 30);
  const cor = ["cinza", "azul", "roxo", "rosa", "vermelho", "verde", "laranja"].includes(txt(f, "cor")) ? txt(f, "cor") : "cinza";
  if (!nome) return { erro: "Coloque o nome da tag." };
  await db.execute({ sql: "INSERT OR IGNORE INTO tags (nome, cor) VALUES (?, ?)", args: [nome, cor] });
  const r = await db.execute({ sql: "SELECT id, nome, cor FROM tags WHERE nome = ?", args: [nome] });
  revalidatePath("/nova");
  return { ok: r.rows[0] as { id: number; nome: string; cor: string } };
}

export async function salvarCopy(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const p = await carregar(id);
  if (!podeEditarCopy(p, e.papel)) {
    return { erro: "A copy só pode ser editada em “Escrevendo a copy” ou “Reajuste de copy”." };
  }
  await db.execute({
    sql: "UPDATE producoes SET hook = ?, copy = ?, briefing = ?, briefing_gravacao = ?, atualizado_em = datetime('now') WHERE id = ?",
    args: [ouNulo(txt(f, "hook")), ouNulo(txt(f, "copy")), ouNulo(txt(f, "briefing")), ouNulo(txt(f, "briefing_gravacao")), id],
  });
  revalidatePath("/", "layout");
}

export async function salvarFicha(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  if (!podeEditarFicha(e)) return { erro: "sem permissão" };
  const ref = txt(f, "referencia_url");
  const img = txt(f, "referencia_img");
  const antes = await carregar(id);
  const copyId = Number(f.get("copy_id")) || null;
  const editorId = Number(f.get("editor_id")) || null;
  const expertId = Number(f.get("expert_id")) || null;
  await db.execute({
    sql: `UPDATE producoes SET lado = ?, tipo = ?, formato = ?, referencia_url = ?, referencia_img = ?, prazo = ?,
            copy_id = ?, editor_id = ?, expert_id = ?, prioridade = ?, formato_gravacao = ?,
            doc_url = ?, pasta_bruto = ?, pasta_entrega = ?, atualizado_em = datetime('now') WHERE id = ?`,
    args: [
      txt(f, "lado") || "black",
      txt(f, "tipo") || "anuncio",
      ouNulo(txt(f, "formato")),
      ref && linkValido(ref) ? ref : null,
      img && linkValido(img) ? img : null,
      ouNulo(txt(f, "prazo")),
      copyId,
      editorId,
      expertId,
      ["baixa", "media", "alta", "urgente"].includes(txt(f, "prioridade")) ? txt(f, "prioridade") : "media",
      ouNulo(txt(f, "formato_gravacao")),
      linkOuNulo(txt(f, "doc_url")),
      linkOuNulo(txt(f, "pasta_bruto")),
      linkOuNulo(txt(f, "pasta_entrega")),
      id,
    ],
  });
  const tagIds = f.getAll("tag").map(Number).filter(Boolean);
  if (f.has("tags_enviadas")) {
    await db.batch([
      `DELETE FROM producao_tags WHERE producao_id = ${id}`,
      ...tagIds.map((t) => `INSERT OR IGNORE INTO producao_tags (producao_id, tag_id) VALUES (${id}, ${Number(t)})`),
    ]);
  }
  if (editorId && editorId !== antes.editor_id) await avisar([editorId], id, `${e.nome} colocou você como editor de ${antes.codigo}`, e.id);
  if (copyId && copyId !== antes.copy_id) await avisar([copyId], id, `${e.nome} colocou você como copy de ${antes.codigo}`, e.id);
  if (expertId && expertId !== antes.expert_id) await avisar([expertId], id, `${e.nome} colocou você pra gravar ${antes.codigo}`, e.id);
  revalidatePath("/", "layout");
}

export async function mudarEtapa(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const p = await carregar(id);
  // Botao manda o id do passo; arrastar no quadro manda so a coluna de destino.
  const destino = String(f.get("para") ?? "") as Status;
  const passo =
    f.get("passo") === "mover" || (!f.get("passo") && destino)
      ? passoDoArrasto(p, e.papel, destino)
      : passosPara(p, e.papel).find((x) => x.id === f.get("passo"));
  if (!passo || (passo.id !== "mover" && !passosPara(p, e.papel).some((x) => x.id === passo.id))) {
    return {
      erro: destino
        ? `Você não pode mover de “${STATUS[p.status]?.rotulo ?? p.status}” pra “${STATUS[destino]?.rotulo ?? destino}”.`
        : "Essa ação não vale nessa etapa.",
    };
  }
  const nota = txt(f, "texto");
  if (passo.pedeTexto && !nota) return { erro: "Escreva o motivo.", pedeTexto: passo.pedeTexto };
  if (passo.pedeBruto) {
    const b = await db.execute({ sql: "SELECT COUNT(*) AS n FROM materiais WHERE producao_id = ? AND tipo = 'bruto'", args: [id] });
    if (!Number(b.rows[0].n)) return { erro: "Cole o link do vídeo gravado antes de mandar pra edição." };
  }
  if (passo.pedeVersao) {
    const v = await db.execute({ sql: "SELECT COUNT(*) AS n FROM materiais WHERE producao_id = ? AND tipo = 'versao'", args: [id] });
    if (!Number(v.rows[0].n)) return { erro: "Suba a versão editada antes de mandar pra revisão." };
  }

  // Quem pega a edicao vira o editor; quem manda a copy vira o copy.
  const editorId = (passo.id === "pegar" || passo.id === "comecar") && !p.editor_id && e.papel === "editor" ? e.id : p.editor_id;
  const copyId = passo.id === "enviar_copy" && !p.copy_id && e.papel === "copy" ? e.id : p.copy_id;

  let para: Status = passo.para;
  if (passo.id === "aprovar_copy") para = await destinoDepoisDaCopy({ id, passa_gravacao: p.passa_gravacao, editor_id: editorId });
  if (passo.id === "gravei") para = editorId ? "gravado" : "pronta";
  if (passo.id === "desbloquear") para = (p.status_antes && STATUS[p.status_antes as Status] ? p.status_antes : "copy") as Status;
  const ajuste = para === "ajustes" ? "editor" : para === "copy_reajuste" ? "copy" : null;
  const statusAntes = para === "bloqueado" ? p.status : p.status_antes;

  await db.execute({
    sql: `UPDATE producoes SET status = ?, editor_id = ?, copy_id = ?, ajuste_de = ?, status_antes = ?, etapa_em = datetime('now'),
            aprovado_em = CASE WHEN ? = 'aprovado' THEN datetime('now') ELSE aprovado_em END,
            no_ar_em = CASE WHEN ? = 'no_ar' THEN datetime('now') ELSE no_ar_em END,
            resultado = CASE WHEN ? = 'no_ar' THEN COALESCE(resultado, 'testando') ELSE resultado END,
            atualizado_em = datetime('now')
          WHERE id = ?`,
    args: [para, editorId, copyId, ajuste, statusAntes, para, para, para, id],
  });

  await db.execute({
    sql: "INSERT INTO passagens (producao_id, de, para, usuario_id, copy_id, editor_id) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, p.status, para, e.id, copyId, editorId],
  });

  if (nota) await registrar(id, e.id, nota, ajuste ? "ajuste" : "comentario");
  await registrar(id, e.id, `moveu de “${STATUS[p.status]?.rotulo ?? p.status}” para “${STATUS[para].rotulo}”`);

  const cod = p.codigo;
  const admins = await idsDoPapel("admin");
  const avisoPor: Partial<Record<Status, () => Promise<void>>> = {
    copy_revisao: async () => avisar(admins, id, `${e.nome} mandou a copy de ${cod} pra revisão`, e.id),
    copy_reajuste: async () => avisar([copyId], id, `${e.nome} pediu reajuste na copy de ${cod}`, e.id),
    gravar: async () => avisar([p.expert_id ?? null, ...(p.expert_id ? [] : await idsDoPapel("gravacao"))], id, `A copy de ${cod} foi aprovada — pode gravar`, e.id),
    gravado: async () => avisar([editorId], id, `${e.nome} gravou ${cod} — pode editar`, e.id),
    pronta: async () => avisar(await idsDoPapel("editor"), id, `${cod} está livre pra pegar na edição`, e.id),
    revisao: async () => avisar([copyId, ...admins], id, `${e.nome} mandou ${cod} pra revisão`, e.id),
    ajustes: async () => avisar([editorId], id, `${e.nome} pediu ajuste no vídeo de ${cod}`, e.id),
    aprovado: async () => avisar([copyId, editorId, ...(await idsDoPapel("trafego"))], id, `${cod} foi aprovado por ${e.nome}`, e.id),
    no_ar: async () => avisar([copyId, editorId, p.expert_id ?? null], id, `${cod} subiu no tráfego`, e.id),
    bloqueado: async () => avisar([copyId, editorId, p.expert_id ?? null], id, `${e.nome} bloqueou ${cod}: ${nota}`, e.id),
  };
  await avisoPor[para]?.();

  revalidatePath("/", "layout");
  return { ok: true, para };
}

// Relatorio diario do trafego (tela Testes do trafego).
export async function enviarRelatorio(f: FormData) {
  const e = await eu();
  if (e.papel !== "admin" && e.papel !== "trafego") return { erro: "Só o tráfego envia relatório." };
  const expert = Number(f.get("expert_id"));
  const dia = txt(f, "dia");
  if (!expert || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { erro: "Escolha o expert e o dia." };
  const num = (k: string) => {
    const v = txt(f, k).replace(",", ".");
    return v === "" || isNaN(Number(v)) ? null : Number(v);
  };
  await db.execute({
    sql: `INSERT INTO relatorios (expert_id, dia, roi, vendas, criativos, testes, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (expert_id, dia) DO UPDATE SET roi = excluded.roi, vendas = excluded.vendas, criativos = excluded.criativos,
            testes = excluded.testes, usuario_id = excluded.usuario_id, criado_em = datetime('now')`,
    args: [expert, dia, num("roi"), num("vendas"), ouNulo(txt(f, "criativos")), ouNulo(txt(f, "testes")), e.id],
  });
  revalidatePath("/testes");
  return { ok: true };
}

export async function marcarResultado(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  if (e.papel !== "admin" && e.papel !== "trafego") return { erro: "Só o tráfego marca o resultado." };
  const resultado = txt(f, "resultado");
  if (!["testando", "vencedor", "perdedor"].includes(resultado)) return { erro: "resultado inválido" };
  const nota = ouNulo(txt(f, "resultado_nota"));
  await db.execute({
    sql: "UPDATE producoes SET resultado = ?, resultado_nota = ?, atualizado_em = datetime('now') WHERE id = ?",
    args: [resultado, nota, id],
  });
  const p = await carregar(id);
  await registrar(id, e.id, `marcou o resultado: ${RESULTADOS[resultado as keyof typeof RESULTADOS]}${nota ? ` — ${nota}` : ""}`);
  if (resultado === "vencedor") await avisar([p.copy_id, p.editor_id], id, `${p.codigo} virou VENCEDOR no tráfego`, e.id);
  revalidatePath("/", "layout");
}

export async function addMaterial(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const tipo = f.get("tipo") === "bruto" ? "bruto" : "versao";
  if (tipo === "versao" && e.papel !== "editor" && e.papel !== "admin") return { erro: "Só o editor sobe versão." };
  const url = txt(f, "url");
  if (!linkValido(url)) return { erro: "link inválido" };
  const p = await carregar(id);
  let versao: number | null = null;
  if (tipo === "versao") {
    const v = await db.execute({ sql: "SELECT COALESCE(MAX(versao), 0) + 1 AS n FROM materiais WHERE producao_id = ? AND tipo = 'versao'", args: [id] });
    versao = Number(v.rows[0].n);
  }
  await db.execute({
    sql: "INSERT INTO materiais (producao_id, tipo, url, rotulo, versao, enviado_por) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, tipo, url, ouNulo(txt(f, "rotulo")), versao, e.id],
  });
  await registrar(id, e.id, tipo === "versao" ? `subiu a versão ${versao}` : "adicionou material bruto");
  if (tipo === "bruto") await avisar([p.editor_id], id, `${p.codigo}: material bruto novo`, e.id);
  revalidatePath("/", "layout");
}

export async function removerMaterial(f: FormData) {
  const e = await eu();
  const id = Number(f.get("material"));
  const r = await db.execute({ sql: "SELECT producao_id, enviado_por FROM materiais WHERE id = ?", args: [id] });
  const m = r.rows[0] as { producao_id: number; enviado_por: number } | undefined;
  if (!m) return;
  if (e.papel !== "admin" && m.enviado_por !== e.id) return { erro: "só quem subiu pode tirar" };
  await db.execute({ sql: "DELETE FROM materiais WHERE id = ?", args: [id] });
  await registrar(m.producao_id, e.id, "tirou um link de vídeo");
  revalidatePath("/", "layout");
}

export async function comentar(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const texto = txt(f, "texto");
  if (!texto) return;
  const p = await carregar(id);
  await registrar(id, e.id, texto.slice(0, 4000), "comentario");
  const marcados = await mencionados(texto);
  await avisar(marcados, id, `${e.nome} mencionou você em ${p.codigo}`, e.id);
  await avisar(
    [p.copy_id, p.editor_id].filter((x) => !marcados.includes(x as number)),
    id,
    `${e.nome} comentou em ${p.codigo}`,
    e.id
  );
  revalidatePath("/", "layout");
}

export async function lerAvisos() {
  const e = await eu();
  await db.execute({ sql: "UPDATE avisos SET lido = 1 WHERE usuario_id = ? AND lido = 0", args: [e.id] });
  revalidatePath("/avisos");
}

// ---------- equipe ----------

async function soAdmin() {
  const e = await eu();
  if (e.papel !== "admin") throw new Error("só o admin mexe na equipe");
  return e;
}

const normalizaLogin = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.@_-]/g, "");

export async function criarUsuario(_: unknown, f: FormData) {
  await soAdmin();
  const nome = txt(f, "nome");
  const papel = txt(f, "papel") as Papel;
  const login = normalizaLogin(txt(f, "login") || nome.split(" ")[0]);
  if (!nome || !login) return { erro: "Coloque o nome." };
  if (!["admin", "copy", "gravacao", "editor", "trafego"].includes(papel)) return { erro: "Escolha a função." };
  const existe = await db.execute({ sql: "SELECT 1 FROM usuarios WHERE login = ?", args: [login] });
  if (existe.rows.length) return { erro: `Já existe alguém com o usuário “${login}”.` };
  const senha = senhaAleatoria();
  const sal = novoSal();
  await db.execute({
    sql: "INSERT INTO usuarios (login, nome, papel, senha_hash, sal) VALUES (?, ?, ?, ?, ?)",
    args: [login, nome, papel, await hashSenha(senha, sal), sal],
  });
  revalidatePath("/equipe");
  return { ok: { nome, login, senha } };
}

export async function novaSenha(_: unknown, f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  const r = await db.execute({ sql: "SELECT nome, login FROM usuarios WHERE id = ?", args: [id] });
  const u = r.rows[0] as { nome: string; login: string } | undefined;
  if (!u) return { erro: "Não achei essa pessoa." };
  const senha = senhaAleatoria();
  const sal = novoSal();
  await db.execute({
    sql: "UPDATE usuarios SET senha_hash = ?, sal = ? WHERE id = ?",
    args: [await hashSenha(senha, sal), sal, id],
  });
  return { ok: { nome: u.nome, login: u.login, senha } };
}

export async function trocarMinhaSenha(_: unknown, f: FormData) {
  const e = await eu();
  const atual = String(f.get("atual") ?? "");
  const nova = String(f.get("nova") ?? "");
  if (nova.length < 8) return { erro: "A senha nova precisa de pelo menos 8 caracteres." };
  const r = await db.execute({ sql: "SELECT senha_hash, sal FROM usuarios WHERE id = ?", args: [e.id] });
  const u = r.rows[0] as { senha_hash: string; sal: string };
  if ((await hashSenha(atual, u.sal)) !== u.senha_hash) return { erro: "A senha atual não confere." };
  const sal = novoSal();
  await db.execute({ sql: "UPDATE usuarios SET senha_hash = ?, sal = ? WHERE id = ?", args: [await hashSenha(nova, sal), sal, e.id] });
  return { ok: true };
}

export async function ativarUsuario(f: FormData) {
  const e = await soAdmin();
  const id = Number(f.get("id"));
  if (id === e.id) return { erro: "Você não pode tirar o seu próprio acesso." };
  await db.execute({ sql: "UPDATE usuarios SET ativo = 1 - ativo WHERE id = ?", args: [id] });
  revalidatePath("/equipe");
}

export async function mudarPapel(f: FormData) {
  const e = await soAdmin();
  const id = Number(f.get("id"));
  const papel = txt(f, "papel");
  if (id === e.id || !["admin", "copy", "gravacao", "editor", "trafego"].includes(papel)) return;
  await db.execute({ sql: "UPDATE usuarios SET papel = ? WHERE id = ?", args: [papel, id] });
  revalidatePath("/equipe");
}

// Nome e usuario de quem ja tem acesso. A sessao e pelo id, entao trocar o
// usuario nao derruba ninguem — so muda o que a pessoa digita no login.
export async function editarUsuario(f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  const nome = txt(f, "nome");
  const login = normalizaLogin(txt(f, "login"));
  if (!nome || !login) return { erro: "Nome e usuário não podem ficar vazios." };
  const existe = await db.execute({ sql: "SELECT 1 FROM usuarios WHERE login = ? AND id != ?", args: [login, id] });
  if (existe.rows.length) return { erro: `Já existe alguém com o usuário “${login}”.` };
  const sg = txt(f, "sigla").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const cor = /^#[0-9a-f]{6}$/i.test(txt(f, "cor")) ? txt(f, "cor") : null;
  await db.execute({
    sql: "UPDATE usuarios SET nome = ?, login = ?, sigla = COALESCE(?, sigla), cor = COALESCE(?, cor) WHERE id = ?",
    args: [nome, login, sg || null, cor, id],
  });
  revalidatePath("/", "layout");
}

// ---------- metas (painel /admin) ----------

async function membroAtivo(id: number) {
  const r = await db.execute({ sql: "SELECT id, nome FROM usuarios WHERE id = ? AND ativo = 1", args: [id] });
  return r.rows[0] as { id: number; nome: string } | undefined;
}

function lerMeta(f: FormData) {
  const tipo = txt(f, "tipo") === "manual" ? "manual" : "automatica";
  const metrica = tipo === "automatica" ? txt(f, "metrica") : null;
  const periodo = txt(f, "periodo");
  const alvo = Math.floor(Number(f.get("alvo")));
  const titulo = txt(f, "titulo") || (metrica && METRICAS[metrica as Metrica]?.rotulo) || "";
  if (!titulo) return { erro: "Dê um título pra meta." };
  if (tipo === "automatica" && !METRICAS[metrica as Metrica]) return { erro: "Escolha o que a meta conta na esteira." };
  if (!PERIODOS[periodo as Periodo]) return { erro: "Escolha o período." };
  if (!(alvo > 0) || alvo > 100000) return { erro: "O alvo precisa ser um número maior que zero." };
  return {
    ok: { titulo, tipo, metrica, periodo, alvo, descricao: ouNulo(txt(f, "descricao")), prazo: ouNulo(txt(f, "prazo")) },
  };
}

export async function criarMeta(f: FormData) {
  const e = await soAdmin();
  const membro = await membroAtivo(Number(f.get("usuario_id")));
  if (!membro) return { erro: "Escolha pra quem é a meta." };
  const m = lerMeta(f);
  if (!m.ok) return { erro: m.erro };
  const v = m.ok;
  await db.execute({
    sql: `INSERT INTO metas (usuario_id, titulo, descricao, tipo, metrica, alvo, periodo, prazo, criado_por)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [membro.id, v.titulo, v.descricao, v.tipo, v.metrica, v.alvo, v.periodo, v.prazo, e.id],
  });
  await avisarSoltos([membro.id], `${e.nome} criou uma meta pra você: ${v.titulo}`, e.id);
  revalidatePath("/", "layout");
}

export async function salvarMeta(f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  const membro = await membroAtivo(Number(f.get("usuario_id")));
  if (!membro) return { erro: "Escolha pra quem é a meta." };
  const m = lerMeta(f);
  if (!m.ok) return { erro: m.erro };
  const v = m.ok;
  await db.execute({
    sql: `UPDATE metas SET usuario_id = ?, titulo = ?, descricao = ?, tipo = ?, metrica = ?, alvo = ?, periodo = ?, prazo = ? WHERE id = ?`,
    args: [membro.id, v.titulo, v.descricao, v.tipo, v.metrica, v.alvo, v.periodo, v.prazo, id],
  });
  // O alvo novo vale pro periodo em andamento; os fechados ficam como estavam.
  await db.execute({ sql: "UPDATE metas_periodos SET alvo = ? WHERE meta_id = ? AND fechado = 0", args: [v.alvo, id] });
  revalidatePath("/", "layout");
}

// Numero da meta manual: no periodo atual (semana/mes) ou na meta avulsa.
export async function progressoMeta(f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  const r = await db.execute({ sql: "SELECT * FROM metas WHERE id = ?", args: [id] });
  const m = r.rows[0] as { tipo: string; periodo: string; alvo: number; status: string } | undefined;
  if (!m || m.tipo !== "manual") return { erro: "Meta automática conta sozinha pela esteira." };
  if (m.status !== "aberta") return { erro: "Meta encerrada." };
  const valor = Math.max(0, Math.floor(Number(f.get("valor"))));
  if (!Number.isFinite(valor)) return { erro: "Número inválido." };
  if (m.periodo === "avulsa") {
    await db.execute({ sql: "UPDATE metas SET progresso = ? WHERE id = ?", args: [valor, id] });
  } else {
    const ini = inicioDoPeriodo(m.periodo as "semana" | "mes", new Date());
    await db.execute({
      sql: `INSERT INTO metas_periodos (meta_id, inicio, alvo, feito) VALUES (?, ?, ?, ?)
            ON CONFLICT(meta_id, inicio) DO UPDATE SET feito = excluded.feito`,
      args: [id, ini, m.alvo, valor],
    });
  }
  revalidatePath("/", "layout");
}

export async function concluirMeta(f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  await db.execute({
    sql: `UPDATE metas SET status = CASE status WHEN 'aberta' THEN 'concluida' ELSE 'aberta' END,
            concluida_em = CASE status WHEN 'aberta' THEN datetime('now') ELSE NULL END WHERE id = ?`,
    args: [id],
  });
  revalidatePath("/", "layout");
}

export async function excluirMeta(f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  await db.batch([`DELETE FROM metas_periodos WHERE meta_id = ${id}`, `DELETE FROM metas WHERE id = ${id}`]);
  revalidatePath("/", "layout");
}

// ---------- tarefas avulsas ----------

// Aviso sem producao: clicar leva pra lista de avisos.
async function avisarSoltos(ids: number[], texto: string, menos: number) {
  for (const u of new Set(ids.filter((x) => x && x !== menos))) {
    await db.execute({ sql: "INSERT INTO avisos (usuario_id, texto) VALUES (?, ?)", args: [u, texto] });
  }
}

export async function criarTarefa(f: FormData) {
  const e = await soAdmin();
  const membro = await membroAtivo(Number(f.get("usuario_id")));
  if (!membro) return { erro: "Escolha pra quem é a tarefa." };
  const titulo = txt(f, "titulo");
  if (!titulo) return { erro: "Dê um título pra tarefa." };
  await db.execute({
    sql: "INSERT INTO tarefas (usuario_id, titulo, descricao, prazo, criado_por) VALUES (?, ?, ?, ?, ?)",
    args: [membro.id, titulo.slice(0, 200), ouNulo(txt(f, "descricao")), ouNulo(txt(f, "prazo")), e.id],
  });
  await avisarSoltos([membro.id], `${e.nome} te passou uma tarefa: ${titulo}`, e.id);
  revalidatePath("/", "layout");
}

export async function salvarTarefa(f: FormData) {
  await soAdmin();
  const id = Number(f.get("id"));
  const membro = await membroAtivo(Number(f.get("usuario_id")));
  if (!membro) return { erro: "Escolha pra quem é a tarefa." };
  const titulo = txt(f, "titulo");
  if (!titulo) return { erro: "Dê um título pra tarefa." };
  await db.execute({
    sql: "UPDATE tarefas SET usuario_id = ?, titulo = ?, descricao = ?, prazo = ?, atualizado_em = datetime('now') WHERE id = ?",
    args: [membro.id, titulo.slice(0, 200), ouNulo(txt(f, "descricao")), ouNulo(txt(f, "prazo")), id],
  });
  revalidatePath("/", "layout");
}

export async function excluirTarefa(f: FormData) {
  await soAdmin();
  await db.execute({ sql: "DELETE FROM tarefas WHERE id = ?", args: [Number(f.get("id"))] });
  revalidatePath("/", "layout");
}

// Admin muda pra qualquer status; o membro so na tarefa dele e so ate
// "pra aprovar" (quem conclui e o admin).
export async function statusTarefa(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const status = txt(f, "status") as StatusTarefa;
  if (!STATUS_TAREFA[status]) return { erro: "Status inválido." };
  const r = await db.execute({ sql: "SELECT usuario_id, titulo, status FROM tarefas WHERE id = ?", args: [id] });
  const t = r.rows[0] as { usuario_id: number; titulo: string; status: string } | undefined;
  if (!t) return { erro: "Essa tarefa não existe mais." };
  if (e.papel !== "admin") {
    if (t.usuario_id !== e.id) return { erro: "Essa tarefa não é sua." };
    if (t.status === "concluida" || !STATUS_DO_MEMBRO.includes(status)) return { erro: "Só o admin conclui a tarefa." };
  }
  await db.execute({ sql: "UPDATE tarefas SET status = ?, atualizado_em = datetime('now') WHERE id = ?", args: [status, id] });
  if (status === "aprovacao" && t.status !== "aprovacao") {
    await avisarSoltos(await idsDoPapel("admin"), `${e.nome} mandou pra aprovar: ${t.titulo}`, e.id);
  }
  if (e.papel === "admin" && t.usuario_id !== e.id && status !== t.status) {
    await avisarSoltos([t.usuario_id], `${e.nome} marcou “${t.titulo}” como ${STATUS_TAREFA[status].toLowerCase()}`, e.id);
  }
  revalidatePath("/", "layout");
}

// ---------- excluir ----------

// Apaga o criativo e tudo dele (links, comentarios, historico, avisos e as
// passagens — sai tambem da conta das metas). Sem volta.
export async function excluirProducao(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const r = await db.execute({ sql: "SELECT id, codigo, status, copy_id, criado_por FROM producoes WHERE id = ?", args: [id] });
  const p = r.rows[0] as { id: number; codigo: string; status: string; copy_id: number | null; criado_por: number | null } | undefined;
  if (!p) return { erro: "Esse criativo já foi excluído." };
  if (!podeExcluir(p, e)) return { erro: "Só o admin exclui criativo que já saiu da copy." };
  await db.batch([
    `DELETE FROM avisos WHERE producao_id = ${id}`,
    `DELETE FROM comentarios WHERE producao_id = ${id}`,
    `DELETE FROM materiais WHERE producao_id = ${id}`,
    `DELETE FROM passagens WHERE producao_id = ${id}`,
    `DELETE FROM producoes WHERE id = ${id}`,
  ]);
  revalidatePath("/", "layout");
  const volta = txt(f, "voltar");
  if (volta.startsWith("/") && !volta.startsWith("//")) redirect(volta);
  return { ok: true };
}

// Comentario: quem escreveu ou o admin. Historico automatico nao sai.
export async function excluirComentario(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const r = await db.execute({ sql: "SELECT usuario_id, tipo FROM comentarios WHERE id = ?", args: [id] });
  const c = r.rows[0] as { usuario_id: number | null; tipo: string } | undefined;
  if (!c) return;
  if (c.tipo === "evento") return { erro: "O histórico não pode ser apagado." };
  if (e.papel !== "admin" && c.usuario_id !== e.id) return { erro: "Só quem escreveu pode apagar." };
  await db.execute({ sql: "DELETE FROM comentarios WHERE id = ?", args: [id] });
  revalidatePath("/", "layout");
}

// Marca como lidos os avisos da pessoa (a Vega usa).
export async function lerTodosAvisos() {
  const e = await eu();
  await db.execute({ sql: "UPDATE avisos SET lido = 1 WHERE usuario_id = ?", args: [e.id] });
  revalidatePath("/", "layout");
  return { ok: true };
}
