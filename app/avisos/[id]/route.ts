import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { euOpcional } from "@/lib/sessao";

// Clicar no aviso: marca como lido e leva direto pra producao.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eu = await euOpcional();
  const destino = req.nextUrl.clone();
  destino.search = "";
  if (!eu) {
    destino.pathname = "/login";
    return NextResponse.redirect(destino);
  }
  const id = Number((await params).id);
  const r = await db.execute({
    sql: "UPDATE avisos SET lido = 1 WHERE id = ? AND usuario_id = ? RETURNING producao_id",
    args: [id, eu.id],
  });
  const prod = r.rows[0]?.producao_id;
  destino.pathname = prod ? `/producao/${prod}` : "/avisos";
  return NextResponse.redirect(destino);
}
