import type { Metadata } from "next";
import "./globals.css";
import { euOpcional } from "@/lib/sessao";
import { contagens, naoLidos } from "@/lib/dados";
import { Shell } from "./shell";

export const metadata: Metadata = {
  title: { default: "Produção LTG", template: "%s · Produção LTG" },
  description: "Esteira de criativos do Low Ticket Global: copy, edição, aprovação e tráfego",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const quem = await euOpcional();
  const [cont, avisos] = quem ? await Promise.all([contagens(), naoLidos(quem.id)]) : [{}, 0];

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {quem ? (
          <Shell eu={quem} contagem={cont} avisos={avisos}>
            {children}
          </Shell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
