"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Eu } from "@/lib/sessao";
import { PAPEIS } from "@/lib/fluxo";
import { Icone, Logo } from "./icones";
import { Busca } from "./busca";
import { sair } from "./acoes";

type Sub = { href: string; rotulo: string; icone: string };
type Item = { href: string; rotulo: string; icone: string; n?: number; sub?: { titulo: string; itens: Sub[] } };

// Titulo do topo, pela rota.
const TITULOS: [string, string][] = [
  ["/esteira", "Esteira"],
  ["/copy", "Copy"],
  ["/trafego", "Tráfego"],
  ["/vega", "Lyra"],
  ["/anuncios", "Anúncios"],
  ["/testes", "Relatório do dia"],
  ["/outras", "Outras produções"],
  ["/materiais", "Materiais"],
  ["/nova", "Nova produção"],
  ["/producao", "Produção"],
  ["/avisos", "Avisos"],
  ["/admin", "Equipe"],
  ["/equipe", "Equipe"],
  ["/metas", "Minhas metas"],
  ["/conta", "Minha conta"],
  ["/agenda", "Agenda"],
  ["/tarefas", "Gestão de tarefas"],
];

const AREAS = [
  { id: "producao", rotulo: "Produção", desc: "Copy, gravação, edição e tráfego", icone: "esteira", href: "/" },
  { id: "tarefas", rotulo: "Gestão de tarefas", desc: "Suas tarefas, projetos e lançamentos", icone: "tarefas", href: "/tarefas" },
  { id: "lateralizacao", rotulo: "Lateralização", desc: "Variações com avatar", icone: "ramo", href: "/outras?tipo=lateralizacao" },
  { id: "agenda", rotulo: "Agenda", desc: "Suas reuniões e gravações", icone: "calendario", href: "/agenda" },
];

export function Shell({
  eu,
  sigla,
  contagem,
  minhaVez,
  avisos,
  children,
}: {
  eu: Eu;
  sigla: string;
  contagem: Record<string, number>;
  minhaVez: number;
  avisos: number;
  children: React.ReactNode;
}) {
  const rota = usePathname();
  const [menu, setMenu] = useState(false);
  const [fechado, setFechado] = useState(false);
  const [area, setArea] = useState(false);
  const [flyout, setFlyout] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setFechado(localStorage.getItem("side-fechado") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    setArea(false);
    setFlyout(null);
    setMenu(false);
  }, [rota]);
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".area-box, .flyout, .nav-i.tem-sub")) {
        setArea(false);
        setFlyout(null);
      }
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const alternar = () => {
    setFechado((v) => {
      try {
        localStorage.setItem("side-fechado", v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  const trafego = (contagem.aprovado ?? 0);
  const grupos: { titulo: string; itens: Item[] }[] = [
    {
      titulo: "Trabalho",
      itens: [
        { href: "/", rotulo: "Início", icone: "inicio" },
        { href: "/copy", rotulo: "Copy", icone: "copy" },
        { href: "/trafego", rotulo: "Tráfego", icone: "megafone", n: trafego },
        { href: "/esteira", rotulo: "Esteira", icone: "esteira" },
      ],
    },
    { titulo: "IA", itens: [{ href: "/vega", rotulo: "Lyra", icone: "vega" }] },
    {
      titulo: "Equipe",
      itens:
        eu.papel === "admin"
          ? [{ href: "/admin", rotulo: "Equipe e metas", icone: "trofeu" }]
          : [{ href: "/metas", rotulo: "Minhas metas", icone: "trofeu" }],
    },
    {
      titulo: "Acervo",
      itens: [
        {
          href: "/anuncios",
          rotulo: "Anúncios",
          icone: "anuncios",
          sub: {
            titulo: "Anúncios",
            itens: [
              { href: "/anuncios?ver=bruto", rotulo: "Brutos", icone: "video" },
              { href: "/anuncios", rotulo: "Prontos", icone: "check" },
              { href: "/anuncios/metricas", rotulo: "Métricas", icone: "testes" },
              { href: "/anuncios/rankings", rotulo: "Rankings", icone: "trofeu" },
            ],
          },
        },
        { href: "/testes", rotulo: "Testes do tráfego", icone: "megafone" },
        {
          href: "/outras",
          rotulo: "Outras produções",
          icone: "pastaSeta",
          sub: {
            titulo: "Outras produções",
            itens: [
              { href: "/outras?tipo=lateralizacao", rotulo: "Lateralizações", icone: "ramo" },
              { href: "/outras?tipo=aula", rotulo: "Aulas", icone: "claquete" },
              { href: "/outras?tipo=vsl", rotulo: "VSLs", icone: "play" },
              { href: "/outras?tipo=organico", rotulo: "Orgânicos", icone: "camera" },
            ],
          },
        },
        {
          href: "/materiais",
          rotulo: "Materiais",
          icone: "pasta",
          sub: {
            titulo: "Materiais",
            itens: [
              { href: "/materiais?aba=ofertas", rotulo: "Ofertas", icone: "bolsa" },
              { href: "/materiais?aba=tags", rotulo: "Tags", icone: "etiqueta" },
              { href: "/materiais?aba=links", rotulo: "Links do lote", icone: "link" },
            ],
          },
        },
      ],
    },
  ];

  const sistema: Item = {
    href: "/conta",
    rotulo: "Sistema",
    icone: "sistema",
    sub: {
      titulo: "Sistema",
      itens: [
        { href: "/conta", rotulo: "Minha conta", icone: "chave" },
        ...(eu.papel === "admin" ? [{ href: "/equipe", rotulo: "Acessos da equipe", icone: "equipe" }] : []),
        { href: "/avisos", rotulo: "Avisos", icone: "sino" },
      ],
    },
  };

  const ativo = (h: string) => {
    const base = h.split("?")[0];
    if (base === "/") return rota === "/";
    return rota === base || rota.startsWith(base + "/") || (base === "/admin" && rota.startsWith("/equipe"));
  };
  const titulo = TITULOS.find(([p]) => rota === p || rota.startsWith(p + "/"))?.[1] ?? "Início";
  const areaAtual = rota.startsWith("/tarefas") ? AREAS[1] : rota.startsWith("/agenda") ? AREAS[3] : AREAS[0];

  const linha = (i: Item) =>
    i.sub ? (
      <div key={i.href} className="nav-wrap">
        <button
          className={"nav-i tem-sub" + (ativo(i.href) ? " on" : "") + (flyout === i.rotulo ? " aberto" : "")}
          onClick={() => setFlyout((f) => (f === i.rotulo ? null : i.rotulo))}
          title={i.rotulo}
        >
          <Icone n={i.icone} />
          <span>{i.rotulo}</span>
          <span className="nav-seta">
            <Icone n="dir" s={14} />
          </span>
        </button>
        {flyout === i.rotulo && (
          <div className="flyout">
            <div className="flyout-t">{i.sub.titulo}</div>
            {i.sub.itens.map((s) => (
              <Link key={s.href} href={s.href} className="flyout-i">
                <Icone n={s.icone} />
                {s.rotulo}
              </Link>
            ))}
            {i.rotulo === "Sistema" && (
              <form action={sair}>
                <button className="flyout-i">
                  <Icone n="sair" />
                  Sair
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    ) : (
      <Link key={i.href} href={i.href} className={"nav-i" + (ativo(i.href) ? " on" : "")} title={i.rotulo}>
        <Icone n={i.icone} />
        <span>{i.rotulo}</span>
        {!!i.n && <span className="nav-n">{i.n}</span>}
      </Link>
    );

  return (
    <div className={"app" + (menu ? " menu-aberto" : "") + (fechado ? " side-fechado" : "")}>
      <aside className="side">
        <div className="side-topo">
          <Link href="/" className="marca">
            <Logo />
            <span>esteira <b style={{ color: "#e3263c" }}>LTG</b></span>
          </Link>
          <button className="ic-btn so-pc" onClick={alternar} aria-label="Recolher menu" title="Recolher menu">
            <Icone n="painel" s={18} />
          </button>
        </div>

        <div className="area-box" ref={areaRef}>
          <button className="area-btn" onClick={() => setArea((v) => !v)}>
            <span className="area-ic">
              <Icone n={areaAtual.icone} />
            </span>
            <span className="area-txt">
              <small>Área</small>
              <b>{areaAtual.rotulo}</b>
            </span>
            {minhaVez > 0 && <span className="area-n">{minhaVez}</span>}
            <Icone n="updown" s={15} />
          </button>
          {area && (
            <div className="area-menu">
              {AREAS.map((a) => (
                <Link key={a.id} href={a.href} className={"area-op" + (a.id === areaAtual.id ? " on" : "")}>
                  <span className="area-ic">
                    <Icone n={a.icone} />
                  </span>
                  <span className="area-txt">
                    <b>{a.rotulo}</b>
                    <small>{a.desc}</small>
                  </span>
                  {a.id === areaAtual.id && <Icone n="check" />}
                </Link>
              ))}
            </div>
          )}
        </div>

        {(eu.papel === "admin" || eu.papel === "copy") && (
          <Link href="/nova" className="btn-nova">
            <Icone n="mais" /> <span>Nova produção</span>
          </Link>
        )}

        <nav>
          {grupos.map((g) => (
            <div key={g.titulo} className="nav-grupo">
              <div className="nav-t">{g.titulo}</div>
              {g.itens.map(linha)}
            </div>
          ))}
          <div className="nav-grupo nav-sistema">{linha(sistema)}</div>
        </nav>

        <div className="eu">
          <span className="avatar">{sigla}</span>
          <Link href="/conta" className="eu-nome">
            <b>{eu.nome}</b>
            <span>{PAPEIS[eu.papel]}</span>
          </Link>
          <Link href="/conta" className="ic-btn" title="Minha conta" aria-label="Minha conta">
            <Icone n="ajustes" />
          </Link>
        </div>
      </aside>

      <div className="principal">
        <header className="topo">
          <button className="ic-btn so-cel" aria-label="Menu" onClick={() => setMenu((v) => !v)}>
            <Icone n="lista" s={18} />
          </button>
          <span className="topo-t">{titulo}</span>
          <Busca />
          <a
            className="btn-feedback"
            href={`https://wa.me/?text=${encodeURIComponent("Feedback da esteira: ")}`}
            target="_blank"
            rel="noreferrer"
          >
            <Icone n="feedback" /> <span>Feedback</span>
          </a>
          <Link href="/avisos" className="sino" aria-label={`${avisos} avisos`}>
            <Icone n="sino" s={18} />
            {avisos > 0 && <span className="sino-n">{avisos > 99 ? "99+" : avisos}</span>}
          </Link>
        </header>
        <main>{children}</main>
      </div>
      <div className="veu" onClick={() => setMenu(false)} />
    </div>
  );
}
