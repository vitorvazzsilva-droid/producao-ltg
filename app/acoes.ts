"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { COOKIE, criarSessao, hashSenha, novoSal, senhaAleatoria } from "@/lib/auth";
import { eu, preparar, type Eu } from "@/lib/sessao";
import { RESULTADOS, STATUS, passoDoArrasto, passosPara, podeEditarCopy, type Papel, type Status } from "@/lib/fluxo";
import { linkValido } from "@/lib/midia";

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
    | { id: number; codigo: string; status: Status; copy_id: number | null; editor_id: number | null; ajuste_de: string | null }
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

function slugAngulo(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 18) || "CRIATIVO"
  );
}

export async function criarProducao(f: FormData) {
  const e = await eu();
  const angulo = txt(f, "angulo");
  if (!angulo) return { erro: "ângulo obrigatório" };
  const ref = txt(f, "referencia_url");
  const img = txt(f, "referencia_img");
  const n = await db.execute("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM producoes");
  const codigo = `LTG_${String(n.rows[0].n).padStart(3, "0")}_${slugAngulo(angulo)}`;
  const copyId = Number(f.get("copy_id")) || (e.papel === "copy" ? e.id : null);
  const editorId = Number(f.get("editor_id")) || null;

  const r = await db.execute({
    sql: `INSERT INTO producoes (codigo, angulo, lado, tipo, formato, hook, copy, briefing, referencia_url, referencia_img, prazo, copy_id, editor_id, criado_por)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      codigo,
      angulo,
      txt(f, "lado") || "black",
      txt(f, "tipo") || "anuncio",
      ouNulo(txt(f, "formato")),
      ouNulo(txt(f, "hook")),
      ouNulo(txt(f, "copy")),
      ouNulo(txt(f, "briefing")),
      ref && linkValido(ref) ? ref : null,
      img && linkValido(img) ? img : null,
      ouNulo(txt(f, "prazo")),
      copyId,
      editorId,
      e.id,
    ],
  });
  const id = Number(r.lastInsertRowid);
  await registrar(id, e.id, `criou a produção ${codigo}`);
  if (copyId) await avisar([copyId], id, `${e.nome} criou ${codigo} pra você escrever`, e.id);
  redirect(`/producao/${id}`);
}

export async function salvarCopy(f: FormData) {
  const e = await eu();
  const id = Number(f.get("id"));
  const p = await carregar(id);
  if (!podeEditarCopy(p, e.papel)) {
    return { erro: "A copy só pode ser editada em “Em copy” ou “Ajustes pedidos”." };
  }
  await db.execute({
    sql: "UPDATE producoes SET hook = ?, copy = ?, briefing = ?, atualizado_em = datetime('now') WHERE id = ?",
    args: [ouNulo(txt(f, "hook")), ouNulo(txt(f, "copy")), ouNulo(txt(f, "briefing")), id],
  });
  revalidatePath(`/producao/${id}`);
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
  await db.execute({
    sql: `UPDATE producoes SET angulo = ?, lado = ?, tipo = ?, formato = ?, referencia_url = ?, referencia_img = ?, prazo = ?,
            copy_id = ?, editor_id = ?, atualizado_em = datetime('now') WHERE id = ?`,
    args: [
      txt(f, "angulo") || "criativo",
      txt(f, "lado") || "black",
      txt(f, "tipo") || "anuncio",
      ouNulo(txt(f, "formato")),
      ref && linkValido(ref) ? ref : null,
      img && linkValido(img) ? img : null,
      ouNulo(txt(f, "prazo")),
      copyId,
      editorId,
      id,
    ],
  });
  if (editorId && editorId !== antes.editor_id) {
    await avisar([editorId], id, `${e.nome} colocou você como editor de ${antes.codigo}`, e.id);
  }
  if (copyId && copyId !== antes.copy_id) {
    await avisar([copyId], id, `${e.nome} colocou você como copy de ${antes.codigo}`, e.id);
  }
  revalidatePath(`/producao/${id}`);
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
    return { erro: destino ? `Você não pode mover de “${STATUS[p.status].rotulo}” pra “${STATUS[destino]?.rotulo ?? destino}”.` : "Essa ação não vale nessa etapa." };
  }
  const nota = txt(f, "texto");
  if (passo.pedeTexto && !nota) return { erro: "Escreva o que precisa mudar.", pedeTexto: passo.pedeTexto };
  if (passo.pedeVersao) {
    const v = await db.execute({ sql: "SELECT COUNT(*) AS n FROM materiais WHERE producao_id = ? AND tipo = 'versao'", args: [id] });
    if (!Number(v.rows[0].n)) return { erro: "Suba a versão editada antes de mandar pra revisão." };
  }

  // Quem pega a edicao vira o editor da producao; quem manda a copy vira o
  // copy, se ainda nao tinha.
  const editorId = passo.id === "pegar" && !p.editor_id && e.papel === "editor" ? e.id : p.editor_id;
  const copyId = passo.id === "mandar" && !p.copy_id && e.papel === "copy" ? e.id : p.copy_id;
  // Copy ajustada volta pra edicao se ja tem editor; sem editor, pra fila.
  const para: Status = passo.id === "copy_ajustada" && !editorId ? "pronta" : passo.para;
  const ajuste = para === "ajustes" ? passo.ajusteDe ?? "editor" : null;

  await db.execute({
    sql: `UPDATE producoes SET status = ?, editor_id = ?, copy_id = ?, ajuste_de = ?,
            aprovado_em = CASE WHEN ? = 'aprovado' THEN datetime('now') ELSE aprovado_em END,
            no_ar_em = CASE WHEN ? = 'no_ar' THEN datetime('now') ELSE no_ar_em END,
            resultado = CASE WHEN ? = 'no_ar' THEN COALESCE(resultado, 'testando') ELSE resultado END,
            atualizado_em = datetime('now')
          WHERE id = ?`,
    args: [para, editorId, copyId, ajuste, para, para, para, id],
  });

  if (nota) await registrar(id, e.id, nota, ajuste ? "ajuste" : "comentario");
  await registrar(id, e.id, `moveu de “${STATUS[p.status].rotulo}” para “${STATUS[para].rotulo}”`);

  const cod = p.codigo;
  const avisoPor: Partial<Record<Status, () => Promise<void>>> = {
    pronta: async () =>
      avisar(editorId ? [editorId] : await idsDoPapel("editor"), id, `${e.nome} passou ${cod} pra edição`, e.id),
    edicao: async () =>
      passo.id === "copy_ajustada" ? avisar([editorId], id, `${e.nome} ajustou a copy de ${cod} — pode seguir`, e.id) : undefined,
    revisao: async () =>
      avisar([copyId, ...(await idsDoPapel("admin"))], id, `${e.nome} mandou ${cod} pra revisão`, e.id),
    ajustes: async () =>
      avisar(
        [ajuste === "copy" ? copyId : editorId],
        id,
        `${e.nome} pediu ajuste ${ajuste === "copy" ? "na copy" : "no vídeo"} de ${cod}`,
        e.id
      ),
    aprovado: async () =>
      avisar([copyId, editorId, ...(await idsDoPapel("trafego"))], id, `${cod} foi aprovado por ${e.nome}`, e.id),
    no_ar: async () => avisar([copyId, editorId], id, `${cod} subiu no tráfego`, e.id),
  };
  await avisoPor[para]?.();

  revalidatePath(`/producao/${id}`);
  revalidatePath("/esteira");
  return { ok: true, para };
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
  revalidatePath(`/producao/${id}`);
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
  revalidatePath(`/producao/${id}`);
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
  revalidatePath(`/producao/${m.producao_id}`);
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
  revalidatePath(`/producao/${id}`);
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

export async function criarUsuario(_: unknown, f: FormData) {
  await soAdmin();
  const nome = txt(f, "nome");
  const papel = txt(f, "papel") as Papel;
  const login = (txt(f, "login") || nome.split(" ")[0])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  if (!nome || !login) return { erro: "Coloque o nome." };
  if (!["admin", "copy", "editor", "trafego"].includes(papel)) return { erro: "Escolha a função." };
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
  if (id === e.id || !["admin", "copy", "editor", "trafego"].includes(papel)) return;
  await db.execute({ sql: "UPDATE usuarios SET papel = ? WHERE id = ?", args: [papel, id] });
  revalidatePath("/equipe");
}
