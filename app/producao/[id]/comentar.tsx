"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { comentar } from "../../acoes";

type Pessoa = { login: string; nome: string; papel: string };

// Caixa de comentario com @mencao: digitou "@", aparece a equipe; escolher
// insere o @usuario, que vira aviso pra pessoa quando o comentario sai.
export function Comentar({ id, gente }: { id: number; gente: Pessoa[] }) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  const opcoes = busca === null ? [] : gente.filter((g) => (g.login + " " + g.nome.toLowerCase()).includes(busca.toLowerCase())).slice(0, 6);

  function ler(v: string, cursor: number) {
    setTexto(v);
    const m = v.slice(0, cursor).match(/(?:^|\s)@([\w.]*)$/);
    setBusca(m ? m[1] : null);
    setSel(0);
  }

  function escolher(p: Pessoa) {
    const el = campo.current!;
    const cursor = el.selectionStart;
    const antes = texto.slice(0, cursor).replace(/@([\w.]*)$/, `@${p.login} `);
    const novo = antes + texto.slice(cursor);
    // flushSync: o texto novo entra no campo antes de mover o cursor, senao
    // quem digita rapido escreve na posicao antiga.
    flushSync(() => {
      setTexto(novo);
      setBusca(null);
    });
    el.focus();
    el.setSelectionRange(antes.length, antes.length);
  }

  return (
    <form
      className="form-msg"
      onSubmit={(e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        const f = new FormData();
        f.set("id", String(id));
        f.set("texto", texto);
        iniciar(async () => {
          const r = (await comentar(f)) as { erro?: string } | undefined;
          if (r?.erro) return setErro(r.erro);
          setErro("");
          setTexto("");
        });
      }}
    >
      <div className="mencao-caixa">
        <textarea
          ref={campo}
          rows={2}
          value={texto}
          placeholder="Escreva pra equipe — use @ pra chamar alguém (ex.: @samuel 0:08 corta a respiração)"
          onChange={(e) => ler(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (!opcoes.length) return;
            if (e.key === "ArrowDown") (e.preventDefault(), setSel((s) => (s + 1) % opcoes.length));
            if (e.key === "ArrowUp") (e.preventDefault(), setSel((s) => (s - 1 + opcoes.length) % opcoes.length));
            if (e.key === "Enter" || e.key === "Tab") (e.preventDefault(), escolher(opcoes[sel]));
            if (e.key === "Escape") setBusca(null);
          }}
          disabled={pendente}
        />
        {opcoes.length > 0 && (
          <div className="mencao-lista">
            {opcoes.map((p, i) => (
              <button
                type="button"
                key={p.login}
                className={i === sel ? "on" : ""}
                onMouseDown={(e) => (e.preventDefault(), escolher(p))}
              >
                <b>{p.nome}</b> <span className="mono">@{p.login}</span> <span className="meta">{p.papel}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="btn sec-btn" disabled={pendente || !texto.trim()}>
        {pendente ? "Enviando…" : "Enviar"}
      </button>
      {erro && <p className="erro">{erro}</p>}
    </form>
  );
}
