"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Eu } from "@/lib/sessao";
import { PAPEIS } from "@/lib/fluxo";
import { iniciais } from "@/lib/iniciais";
import { Icone, Logo } from "./icones";
import { Busca } from "./busca";
import { sair } from "./acoes";

type Item = { href: string; rotulo: string; icone: string; n?: number };

export function Shell({
  eu,
  contagem,
  avisos,
  children,
}: {
  eu: Eu;
  contagem: Record<string, number>;
  avisos: number;
  children: React.ReactNode;
}) {
  const rota = usePathname();
  const [menu, setMenu] = useState(false);

  // So as tres areas do trabalho (e Equipe pro admin cadastrar o pessoal).
  const grupos: { titulo: string; itens: Item[] }[] = [
    {
      titulo: "Áreas",
      itens: [
        { href: "/copys", rotulo: "1  Copys", icone: "copy", n: (contagem.copy ?? 0) + (contagem.gravar ?? 0) },
        { href: "/gravados", rotulo: "2  Gravados", icone: "video", n: (contagem.pronta ?? 0) + (contagem.edicao ?? 0) },
        { href: "/editados", rotulo: "3  Editados", icone: "check", n: contagem.revisao },
      ],
    },
    ...(eu.papel === "admin" ? [{ titulo: "Equipe", itens: [{ href: "/equipe", rotulo: "Equipe", icone: "equipe" }] }] : []),
  ];

  const ativo = (h: string) => (h === "/" ? rota === "/" : rota.startsWith(h));

  return (
    <div className={"app" + (menu ? " menu-aberto" : "")}>
      <aside className="side" onClick={(e) => (e.target as HTMLElement).closest("a") && setMenu(false)}>
        <Link href="/copys" className="marca">
          <Logo />
          <span>
            produção <b>LTG</b>
          </span>
        </Link>

        {(eu.papel === "admin" || eu.papel === "copy") && (
          <Link href="/nova" className="btn-nova">
            <Icone n="mais" /> Nova copy
          </Link>
        )}

        <nav>
          {grupos.map((g) => (
            <div key={g.titulo} className="nav-grupo">
              <div className="nav-t">{g.titulo}</div>
              {g.itens.map((i) => (
                <Link key={i.href} href={i.href} className={"nav-i" + (ativo(i.href) ? " on" : "")}>
                  <Icone n={i.icone} />
                  <span>
                    {/^\d/.test(i.rotulo) && <b className="nav-num">{i.rotulo[0]}</b>}
                    {i.rotulo.replace(/^\d\s+/, "")}
                  </span>
                  {!!i.n && <span className="nav-n">{i.n}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="eu">
          <span className="avatar">{iniciais(eu.nome)}</span>
          <Link href="/conta" className="eu-nome">
            <b>{eu.nome}</b>
            <span>{PAPEIS[eu.papel]}</span>
          </Link>
          <form action={sair}>
            <button className="ic-btn" title="Sair" aria-label="Sair">
              <Icone n="sair" />
            </button>
          </form>
        </div>
      </aside>

      <div className="principal">
        <header className="topo">
          <button className="ic-btn so-cel" aria-label="Menu" onClick={() => setMenu((v) => !v)}>
            <Icone n="esteira" />
          </button>
          <Busca />
          <Link href="/avisos" className="sino" aria-label={`${avisos} avisos`}>
            <Icone n="sino" s={18} />
            {avisos > 0 && <span className="sino-n">{avisos}</span>}
          </Link>
        </header>
        <main>{children}</main>
      </div>
      <div className="veu" onClick={() => setMenu(false)} />
    </div>
  );
}
