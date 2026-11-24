import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { euOpcional } from "@/lib/sessao";
import { COOKIE, lerSessao } from "@/lib/auth";
import { contagens, contaMinhaVez, naoLidos, siglaDe } from "@/lib/dados";
import { Shell } from "./shell";

export const metadata: Metadata = {
  title: { default: "Esteira LTG", template: "%s · Esteira LTG" },
  description: "Esteira de criativos do Low Ticket Global: copy, edição, aprovação e tráfego",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tudo em paralelo: cada consulta e uma ida ao banco.
  const id = await lerSessao((await cookies()).get(COOKIE)?.value);
  const quem = id ? await euOpcional() : null;
  const [cont, avisos, vez, sigla] = quem
    ? await Promise.all([contagens(), naoLidos(quem.id), contaMinhaVez(quem), siglaDe(quem.id)])
    : [{}, 0, 0, ""];

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {quem ? (
          <Shell eu={quem} sigla={sigla} contagem={cont} minhaVez={vez} avisos={avisos}>
            {children}
          </Shell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
