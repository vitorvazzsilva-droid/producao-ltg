import { NextRequest, NextResponse } from "next/server";
import { COOKIE, lerSessao } from "@/lib/auth";

// Quem nao tem sessao assinada nao ve nenhuma tela alem do login.
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/login")) return NextResponse.next();

  if (await lerSessao(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "sem sessao" }, { status: 401 });
  }
  const destino = req.nextUrl.clone();
  destino.pathname = "/login";
  destino.search = "";
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
