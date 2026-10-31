import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, lerSessao, hashSenha, novoSal } from "./auth";
import { db, initDb } from "./db";
import type { Papel } from "./fluxo";

export type Eu = { id: number; login: string; nome: string; papel: Papel };

// Primeiro acesso: sem ninguem no banco, nasce o admin "vitor" com a senha
// do ADMIN_PASSWORD. Daqui pra frente a equipe e criada pela tela Equipe.
async function semearAdmin() {
  const r = await db.execute("SELECT COUNT(*) AS n FROM usuarios");
  if (Number(r.rows[0].n) > 0) return;
  const senha = process.env.ADMIN_PASSWORD;
  if (!senha) return;
  const sal = novoSal();
  await db.execute({
    sql: "INSERT INTO usuarios (login, nome, papel, senha_hash, sal) VALUES ('vitor', 'Vitor', 'admin', ?, ?)",
    args: [await hashSenha(senha, sal), sal],
  });
}

export async function preparar() {
  await initDb();
  await semearAdmin();
}

export async function euOpcional(): Promise<Eu | null> {
  const id = await lerSessao((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  await preparar();
  const r = await db.execute({
    sql: "SELECT id, login, nome, papel FROM usuarios WHERE id = ? AND ativo = 1",
    args: [id],
  });
  return (r.rows[0] as Eu | undefined) ?? null;
}

export async function eu(): Promise<Eu> {
  const x = await euOpcional();
  if (!x) redirect("/login");
  return x;
}
