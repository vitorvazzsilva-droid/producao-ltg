"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "./icones";

type Achado = { id: number; codigo: string; angulo: string; hook: string | null; status: string; rotulo: string };

// Busca rapida (Cmd+K / Ctrl+K): codigo, angulo, hook ou trecho da copy.
export function Busca() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<Achado[]>([]);
  const [sel, setSel] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta(true);
      }
      if (e.key === "Escape") setAberta(false);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    if (aberta) setTimeout(() => campo.current?.focus(), 10);
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const t = setTimeout(async () => {
      setCarregando(true);
      const r = await fetch(`/api/busca?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => []);
      setLista(Array.isArray(r) ? r : []);
      setSel(0);
      setCarregando(false);
    }, 150);
    return () => clearTimeout(t);
  }, [q, aberta]);

  const abrir = (a?: Achado) => {
    if (!a) return;
    setAberta(false);
    setQ("");
    router.push(`/producao/${a.id}`);
  };

  return (
    <>
      <button className="busca-btn" onClick={() => setAberta(true)}>
        <Icone n="busca" />
        <span>Buscar produção, copy, hook…</span>
        <kbd>⌘K</kbd>
      </button>

      {aberta && (
        <div className="paleta-fundo" onClick={() => setAberta(false)}>
          <div className="paleta" onClick={(e) => e.stopPropagation()}>
            <div className="paleta-campo">
              <Icone n="busca" />
              <input
                ref={campo}
                value={q}
                placeholder="Código, ângulo, hook ou trecho da copy"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, lista.length - 1));
                  if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
                  if (e.key === "Enter") abrir(lista[sel]);
                }}
              />
              <kbd>esc</kbd>
            </div>
            <div className="paleta-lista">
              {carregando && !lista.length && <div className="paleta-vazio">buscando…</div>}
              {!carregando && !lista.length && <div className="paleta-vazio">nada encontrado</div>}
              {lista.map((a, i) => (
                <button key={a.id} className={"paleta-i" + (i === sel ? " on" : "")} onMouseEnter={() => setSel(i)} onClick={() => abrir(a)}>
                  <span className="mono">{a.codigo}</span>
                  <span className="paleta-hook">{a.hook ?? a.angulo}</span>
                  <span className={`pill st-${a.status}`}>{a.rotulo}</span>
                </button>
              ))}
            </div>
            <div className="paleta-pe">
              <span>↑↓ andar</span>
              <span>Enter abrir</span>
              <span>Esc fechar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
