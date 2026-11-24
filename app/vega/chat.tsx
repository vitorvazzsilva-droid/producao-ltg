"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { apagarConversa, decidir, perguntar, removerChave, salvarChave } from "./acoes";
import { Form } from "../form";
import { Icone } from "../icones";

export type Item = { quem: "eu" | "vega" | "acao"; texto: string; altera?: boolean; negado?: boolean };

const SUGESTOES = [
  { ic: "fila", t: "Minha fila", d: "O que está comigo agora, em ordem de urgência.", p: "O que está na minha fila agora, em ordem de urgência?" },
  { ic: "relogio", t: "O que está parado", d: "Há mais de 5 dias na mesma etapa, por etapa e com quem está.", p: "O que está parado há mais de 5 dias? Separe por etapa e diga com quem está." },
  { ic: "voltar", t: "Voltou com ajuste", d: "O que voltou para mim com ajuste, e o que foi pedido.", p: "O que voltou com ajuste e o que foi pedido em cada um?" },
  { ic: "mais", t: "Criar produção", d: "Ela pergunta o que precisa saber antes de criar.", p: "Quero abrir uma nova produção." },
  { ic: "sino", t: "Minhas notificações", d: "Um resumo das não lidas que pedem atenção.", p: "Resuma as minhas notificações não lidas que pedem atenção." },
];

// Texto da Vega: **negrito** e [rotulo](/link) viram marcacao; o resto fica texto.
function Fala({ t }: { t: string }) {
  return (
    <>
      {t.split("\n").map((linha, i) => (
        <p key={i}>
          {linha.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).map((x, j) => {
            const l = x.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (l) return l[2].startsWith("/") ? <Link key={j} href={l[2]} className="link-roxo mono">{l[1]}</Link> : <a key={j} href={l[2]} target="_blank" rel="noreferrer" className="link-roxo">{l[1]}</a>;
            if (x.startsWith("**") && x.endsWith("**")) return <b key={j}>{x.slice(2, -2)}</b>;
            return x;
          })}
        </p>
      ))}
    </>
  );
}

export function Chat({
  nome,
  papel,
  temChave,
  conversas,
  atual,
  capacidades,
}: {
  nome: string;
  papel: string;
  temChave: boolean;
  conversas: { id: number; titulo: string; quando: string }[];
  atual: { id: number; itens: Item[]; pendente: string | null } | null;
  capacidades: { consultas: number; alteracoes: number; grupos: { nome: string; itens: { rotulo: string; altera: boolean }[] }[] };
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [, iniciar] = useTransition();
  const fim = useRef<HTMLDivElement>(null);
  const [verChave, setVerChave] = useState(!temChave);

  useEffect(() => fim.current?.scrollIntoView({ block: "end" }), [atual?.itens.length, enviando, atual?.pendente]);

  async function mandar(p: string) {
    if (!p.trim() || enviando) return;
    setErro("");
    setEnviando(p);
    setTexto("");
    const f = new FormData();
    f.set("texto", p);
    if (atual) f.set("conversa", String(atual.id));
    const r = (await perguntar(f)) as { erro?: string; conversa?: number };
    setEnviando(null);
    if (r.erro) setErro(r.erro);
    iniciar(() => router.push(`/vega?c=${r.conversa ?? atual?.id ?? ""}`));
    router.refresh();
  }

  async function responder(decisao: string) {
    if (!atual || enviando) return;
    setEnviando("");
    const f = new FormData();
    f.set("conversa", String(atual.id));
    f.set("decisao", decisao);
    const r = (await decidir(f)) as { erro?: string };
    setEnviando(null);
    if (r.erro) setErro(r.erro);
    router.refresh();
  }

  const itens = atual?.itens ?? [];

  return (
    <div className="vega card">
      <aside className="vega-conv">
        <Link href="/vega" className="btn sec-btn vega-nova">
          <Icone n="lapis" /> Nova conversa
        </Link>
        <div className="vega-t">Conversas</div>
        {conversas.map((c) => (
          <div key={c.id} className={"vega-ci" + (atual?.id === c.id ? " on" : "")}>
            <Link href={`/vega?c=${c.id}`}>
              <span>{c.titulo}</span>
              <small>{c.quando}</small>
            </Link>
            <form action={apagarConversa}>
              <input type="hidden" name="id" value={c.id} />
              <button className="ic-btn mini" title="Apagar conversa" aria-label="Apagar conversa">
                <Icone n="x" s={13} />
              </button>
            </form>
          </div>
        ))}
        {!conversas.length && <p className="meta vega-sem">Nenhuma conversa ainda.</p>}
      </aside>

      <section className="vega-meio">
        <div className="vega-hd">
          <span className="vega-logo">
            <Icone n="vega" s={20} />
          </span>
          <div>
            <span>
              <b>Lyra</b> <span className={"vega-st" + (temChave ? "" : " off")}>{temChave ? "Pronta" : "Sem chave"}</span>
            </span>
            <small>Lê o que você lê · só muda o que você permitir</small>
          </div>
          <button className="btn-fant vega-chave-btn" onClick={() => setVerChave((v) => !v)}>
            <Icone n="chave" /> Chave da Anthropic
          </button>
        </div>

        <div className="vega-corpo">
          {verChave && (
            <div className="vega-chave">
              <b>{temChave ? "Sua chave está conectada" : "Conecte a sua chave da Anthropic"}</b>
              <p>
                A Lyra roda no Claude, com a <b>sua</b> chave de API (a assinatura do Claude não serve aqui). Crie em{" "}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="link-roxo">
                  console.anthropic.com
                </a>{" "}
                → API Keys, e cole abaixo. Ela fica guardada cifrada e só você usa.
              </p>
              <Form acao={salvarChave} className="vega-chave-f" limpar feito="Chave salva.">
                <input name="chave" type="password" placeholder="sk-ant-…" autoComplete="off" required />
                <button className="btn">{temChave ? "Trocar chave" : "Conectar"}</button>
              </Form>
              {temChave && (
                <form action={removerChave}>
                  <button className="lk lk-x">Desconectar a chave</button>
                </form>
              )}
            </div>
          )}

          {!itens.length && !enviando ? (
            <div className="vega-oi">
              <h2>Oi, {nome}. Sou a Lyra.</h2>
              <p>Eu acompanho a operação com você. Leio a esteira, os números e as filas. Antes de mudar qualquer coisa, eu pergunto.</p>
              <div className="vega-sug">
                {SUGESTOES.map((s) => (
                  <button key={s.t} className="vega-s" onClick={() => mandar(s.p)} disabled={!temChave}>
                    <span className="vega-s-ic">
                      <Icone n={s.ic} />
                    </span>
                    <b>{s.t}</b>
                    <small>{s.d}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="vega-msgs">
              {itens.map((m, i) =>
                m.quem === "acao" ? (
                  <div key={i} className={"vega-acao" + (m.altera ? " altera" : "") + (m.negado ? " negado" : "")}>
                    <Icone n={m.negado ? "x" : m.altera ? "lapis" : "olho"} s={13} /> {m.texto}
                  </div>
                ) : (
                  <div key={i} className={"vega-m " + m.quem}>
                    <Fala t={m.texto} />
                  </div>
                )
              )}
              {enviando !== null && (
                <>
                  {enviando && <div className="vega-m eu">{enviando}</div>}
                  <div className="vega-m vega pensando">
                    <i />
                    <i />
                    <i />
                  </div>
                </>
              )}
              {atual?.pendente && enviando === null && (
                <div className="vega-perm">
                  <b>
                    <Icone n="cadeado" s={14} /> A Lyra quer fazer uma alteração
                  </b>
                  <p>{atual.pendente}</p>
                  <div className="vega-perm-b">
                    <button className="btn btn-roxo" onClick={() => responder("permitir")}>
                      Permitir
                    </button>
                    <button className="btn sec-btn" onClick={() => responder("sempre")}>
                      Sempre nesta conversa
                    </button>
                    <button className="btn perigo" onClick={() => responder("negar")}>
                      Não permitir
                    </button>
                  </div>
                </div>
              )}
              <div ref={fim} />
            </div>
          )}
        </div>

        {erro && <p className="erro vega-erro">{erro}</p>}
        <form
          className="vega-in"
          onSubmit={(e) => {
            e.preventDefault();
            mandar(texto);
          }}
        >
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={temChave ? "Pergunte, ou digite / para ver as ações…" : "Conecte a sua chave da Anthropic para conversar"}
            rows={2}
            disabled={!temChave || !!atual?.pendente}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                mandar(texto);
              }
            }}
          />
          {texto === "/" && (
            <div className="vega-barra">
              {SUGESTOES.map((s) => (
                <button type="button" key={s.t} onClick={() => mandar(s.p)}>
                  <Icone n={s.ic} s={14} /> {s.t}
                </button>
              ))}
            </div>
          )}
          <div className="vega-in-pe">
            <span className="meta">
              <kbd>/</kbd> <kbd>Enter</kbd> envia · <kbd>Shift</kbd> + <kbd>Enter</kbd> quebra a linha
            </span>
            <button className="btn btn-roxo" disabled={!texto.trim() || enviando !== null || !temChave}>
              Perguntar <Icone n="enviar" s={14} />
            </button>
          </div>
        </form>
      </section>

      <aside className="vega-dir">
        <b>O que a Lyra pode fazer</b>
        <small>Segue o seu papel {papel}. Ela não vê nada que você não vê.</small>
        <div className="vega-nums">
          <div>
            <b>{capacidades.consultas}</b>
            <span>consultas</span>
          </div>
          <div>
            <b>{capacidades.alteracoes}</b>
            <span>alterações</span>
          </div>
        </div>
        <div className="vega-aviso">
          <b>Pede permissão em toda alteração</b>
          <span>Consultas nunca pedem. “Sempre nesta conversa” libera uma ação até a conversa acabar.</span>
        </div>
        {capacidades.grupos.map((g) => (
          <div key={g.nome} className="vega-g">
            <div className="vega-g-hd">
              <span>{g.nome}</span>
              <span className="meta">
                <Icone n="olho" s={12} /> {g.itens.filter((x) => !x.altera).length} <Icone n="lapis" s={12} /> {g.itens.filter((x) => x.altera).length}
              </span>
            </div>
            <div className="vega-g-l">
              {g.itens.map((x) => (
                <span key={x.rotulo} className={"vega-cap" + (x.altera ? " altera" : "")}>
                  <Icone n={x.altera ? "lapis" : "olho"} s={12} /> {x.rotulo}
                </span>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
