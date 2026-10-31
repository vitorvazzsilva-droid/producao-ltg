import { NextRequest, NextResponse } from "next/server";
import { producoes } from "@/lib/dados";
import { euOpcional } from "@/lib/sessao";
import { STATUS, type Status } from "@/lib/fluxo";

export async function GET(req: NextRequest) {
  if (!(await euOpcional())) return NextResponse.json({ error: "sem sessao" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const lista = await producoes({ busca: q || undefined });
  return NextResponse.json(
    lista.slice(0, 12).map((p) => ({
      id: p.id,
      codigo: p.codigo,
      angulo: p.angulo,
      hook: p.hook,
      status: p.status,
      rotulo: STATUS[p.status as Status]?.rotulo ?? p.status,
    }))
  );
}
