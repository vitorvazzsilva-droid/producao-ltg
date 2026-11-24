"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Producao } from "@/lib/producao-base";
import { nomeCurto, tagsDe, tempo } from "@/lib/producao-base";
import { GRUPOS, PRIORIDADES, STATUS, TIPOS, passoDoArrasto, pesoPrioridade, type Papel, type Status } from "@/lib/fluxo";
import { mudarEtapa } from "../acoes";
import { CardEsteira, Lado, diasNaEtapa, estaParada, prioridadeDe, responsavel } from "../card";
import { Icone } from "../icones";

type Pessoa = { id: number; nome: string; papel: string };
type Pedido = { p: Producao; para: Status; placeholder: string };

const POR_PAGINA = 10;

const ORDENS = {
  prioridade: "Prioridade e tempo na etapa",
  tempo: "Mais tempo na etapa",
  recentes: "Mais recentes",
  codigo: "Código",
};

export function Quadro({
  lista,
  eu,
  pessoas,
  grupos = GRUPOS.map((g) => g.id),
  filtros = ["copywriter", "expert", "editor", "tipo"],
  minhas,
  chave,
}: {
  lista: Producao[];
  eu: { id: number; papel: Papel };
  pessoas: Pessoa[];
  grupos?: string[];
  filtros?: ("copywriter" | "expert" | "editor" | "tipo")[];
  minhas?: boolean; // mostra o seletor Minhas | Todas
  chave: string; // pra lembrar filtros/colunas por tela
}) {
  const router = useRouter();
  const [cards, setCards] = useState(lista);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<Status | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(null);
  const [, iniciar] = useTransition();

  const [vista, setVista] = useState<"quadro" | "lista">("quadro");
  const [so, setSo] = useState<"minhas" | "todas">(minhas && eu.papel !== "admin" ? "minhas" : "todas");
  const [q, setQ] = useState("");
  const [copyF, setCopyF] = useState("");
  const [expertF, setExpertF] = useState("");
  const [editorF, setEditorF] = useState("");
  const [tipoF, setTipoF] = useState("");
  const [ladoF, setLadoF] = useState("");
  const [soParadas, setSoParadas] = useState(false);
  const [maisFiltros, setMaisFiltros] = useState(false);
  const [ordem, setOrdem] = useState<keyof typeof ORDENS>("prioridade");
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [paginas, setPaginas] = useState<Record<string, number>>({});
  const [salvo, setSalvo] = useState(false);

  // Filtros salvos (o marcador) e colunas recolhidas ficam no navegador.
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem("filtros-" + chave) ?? "null");
      if (f) {
        setCopyF(f.copyF ?? "");
        setExpertF(f.expertF ?? "");
        setEditorF(f.editorF ?? "");
        setTipoF(f.tipoF ?? "");
        setLadoF(f.ladoF ?? "");
        setSoParadas(!!f.soParadas);
        setOrdem(f.ordem ?? "prioridade");
        setSalvo(true);
      }
      const r = JSON.parse(localStorage.getItem("recolhidas-" + chave) ?? "[]");
      if (Array.isArray(r)) setRecolhidas(new Set(r));
      const v = localStorage.getItem("vista-" + chave);
      if (v === "lista" || v === "quadro") setVista(v);
    } catch {}
  }, [chave]);

  useEffect(() => setCards(lista), [lista]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const guardar = (k: string, v: unknown) => {
    try {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    } catch {}
  };

  const recolher = (s: string) =>
    setRecolhidas((r) => {
      const n = new Set(r);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      guardar("recolhidas-" + chave, [...n]);
      return n;
    });

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cards.filter((p) => {
      if (so === "minhas" && ![p.copy_id, p.editor_id, p.expert_id].includes(eu.id)) return false;
      if (copyF && String(p.copy_id) !== copyF) return false;
      if (expertF && String(p.expert_id) !== expertF) return false;
      if (editorF && (editorF === "sem" ? p.editor_id !== null : String(p.editor_id) !== editorF)) return false;
      if (tipoF && p.tipo !== tipoF) return false;
      if (ladoF && p.lado !== ladoF) return false;
      if (soParadas && !estaParada(p)) return false;
      if (t) {
        const alvo = [p.codigo, nomeCurto(p), p.copy_nome, p.editor_nome, p.expert_nome, p.hook].join(" ").toLowerCase();
        if (!alvo.includes(t)) return false;
      }
      return true;
    });
  }, [cards, q, so, copyF, expertF, editorF, tipoF, ladoF, soParadas, eu.id]);

  const ordenar = (a: Producao, b: Producao) => {
    if (ordem === "tempo") return b.horas_etapa - a.horas_etapa;
    if (ordem === "recentes") return b.id - a.id;
    if (ordem === "codigo") return a.codigo.localeCompare(b.codigo);
    return pesoPrioridade(prioridadeDe(b)) - pesoPrioridade(prioridadeDe(a)) || b.horas_etapa - a.horas_etapa;
  };

  async function enviar(p: Producao, para: Status, texto?: string) {
    const antes = p.status;
    setCards((cs) => cs.map((c) => (c.id === p.id ? { ...c, status: para, horas_etapa: 0 } : c)));
    const f = new FormData();
    f.set("id", String(p.id));
    f.set("para", para);
    if (texto) f.set("texto", texto);
    const r = (await mudarEtapa(f)) as { erro?: string; para?: Status } | undefined;
    if (r?.erro) {
      setCards((cs) => cs.map((c) => (c.id === p.id ? { ...c, status: antes } : c)));
      setAviso({ t: r.erro, erro: true });
      return false;
    }
    const final = r?.para ?? para;
    setCards((cs) => cs.map((c) => (c.id === p.id ? { ...c, status: final } : c)));
    setAviso({ t: `${nomeCurto(p)} → ${STATUS[final].rotulo}` });
    iniciar(() => router.refresh());
    return true;
  }

  function soltar(para: Status) {
    setSobre(null);
    const p = cards.find((c) => c.id === arrastando);
    setArrastando(null);
    if (!p || p.status === para) return;
    const passo = passoDoArrasto(p, eu.papel, para);
    if (!passo) {
      setAviso({ t: `Você não pode mover de “${STATUS[p.status as Status].rotulo}” pra “${STATUS[para].rotulo}”.`, erro: true });
      return;
    }
    if (passo.pedeTexto) setPedido({ p, para, placeholder: passo.pedeTexto });
    else enviar(p, para);
  }

  const gs = GRUPOS.filter((g) => grupos.includes(g.id));
  const copies = pessoas.filter((x) => x.papel === "copy" || x.papel === "admin");
  const experts = pessoas.filter((x) => x.papel === "gravacao");
  const editores = pessoas.filter((x) => x.papel === "editor");

  const sel = (v: string, set: (s: string) => void, todo: string, ops: { v: string; r: string }[]) => (
    <label className="sel">
      <select value={v} onChange={(e) => set(e.target.value)}>
        <option value="">{todo}</option>
        {ops.map((o) => (
          <option key={o.v} value={o.v}>
            {o.r}
          </option>
        ))}
      </select>
      <Icone n="baixo" s={14} />
    </label>
  );

  const barraFiltros = (
    <div className="filtros">
      {minhas && (
        <div className="seg">
          <button className={so === "minhas" ? "on" : ""} onClick={() => setSo("minhas")}>
            Minhas
          </button>
          <button className={so === "todas" ? "on" : ""} onClick={() => setSo("todas")}>
            Todas
          </button>
        </div>
      )}
      <label className="campo-busca">
        <Icone n="busca" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar código ou pessoa" />
      </label>
      {filtros.includes("copywriter") && sel(copyF, setCopyF, "Todo copywriter", copies.map((x) => ({ v: String(x.id), r: x.nome })))}
      {filtros.includes("expert") && sel(expertF, setExpertF, "Todo expert", experts.map((x) => ({ v: String(x.id), r: x.nome })))}
      {filtros.includes("editor") &&
        sel(editorF, setEditorF, "Todo editor", [{ v: "sem", r: "Sem editor" }, ...editores.map((x) => ({ v: String(x.id), r: x.nome }))])}
      {filtros.includes("tipo") && sel(tipoF, setTipoF, "Todo tipo", Object.entries(TIPOS).map(([v, r]) => ({ v, r })))}
      <button className={"tog" + (soParadas ? " on" : "")} onClick={() => setSoParadas((v) => !v)}>
        <Icone n="relogio" /> Só paradas
      </button>
      <button className={"ic-quad" + (maisFiltros || ladoF ? " on" : "")} onClick={() => setMaisFiltros((v) => !v)} title="Mais filtros">
        <Icone n="filtro" />
      </button>
      {maisFiltros && sel(ladoF, setLadoF, "Black e White", [{ v: "black", r: "Só Black" }, { v: "white", r: "Só White" }])}
      <span className="sp" />
      <button
        className={"ic-quad" + (salvo ? " on" : "")}
        title={salvo ? "Filtro salvo — clique pra limpar" : "Salvar estes filtros"}
        onClick={() => {
          if (salvo) {
            try {
              localStorage.removeItem("filtros-" + chave);
            } catch {}
            setSalvo(false);
            setCopyF("");
            setExpertF("");
            setEditorF("");
            setTipoF("");
            setLadoF("");
            setSoParadas(false);
            setOrdem("prioridade");
          } else {
            guardar("filtros-" + chave, { copyF, expertF, editorF, tipoF, ladoF, soParadas, ordem });
            setSalvo(true);
          }
        }}
      >
        <Icone n="marcador" />
      </button>
      <label className="sel ordem">
        <Icone n="ordenar" s={15} />
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as keyof typeof ORDENS)}>
          {Object.entries(ORDENS).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
        <Icone n="baixo" s={14} />
      </label>
    </div>
  );

  return (
    <>
      <div className="quadro-topo">
        {barraFiltros}
        <div className="seg vista">
          <button
            className={vista === "quadro" ? "on" : ""}
            onClick={() => {
              setVista("quadro");
              guardar("vista-" + chave, "quadro");
            }}
          >
            <Icone n="quadro" /> Quadro
          </button>
          <button
            className={vista === "lista" ? "on" : ""}
            onClick={() => {
              setVista("lista");
              guardar("vista-" + chave, "lista");
            }}
          >
            <Icone n="lista" /> Lista
          </button>
        </div>
      </div>

      {vista === "lista" ? (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Etapa</th>
                <th>Com quem</th>
                <th>Expert</th>
                <th>Tipo</th>
                <th>Prioridade</th>
                <th>Na etapa</th>
              </tr>
            </thead>
            <tbody>
              {gs
                .flatMap((g) => g.etapas)
                .flatMap((s) => filtrados.filter((p) => p.status === s).sort(ordenar))
                .map((p) => {
                  const r = responsavel(p);
                  return (
                    <tr key={p.id} onClick={() => router.push(`/producao/${p.id}`)}>
                      <td>
                        <span className="mono b">{nomeCurto(p)}</span> <Lado lado={p.lado} />
                      </td>
                      <td>
                        <span className={`pill st-${p.status}`}>{STATUS[p.status as Status]?.rotulo}</span>
                      </td>
                      <td>{r.nome ?? <span className="meta">{r.vazio}</span>}</td>
                      <td>{p.expert_nome ?? "—"}</td>
                      <td>{TIPOS[p.tipo as keyof typeof TIPOS] ?? p.tipo}</td>
                      <td>{PRIORIDADES[prioridadeDe(p)]}</td>
                      <td className={estaParada(p) ? "vermelho" : ""}>{tempo(p.horas_etapa)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!filtrados.length && <div className="vazio-l">Nada com esses filtros.</div>}
        </div>
      ) : (
        <div className="board">
          {gs.map((g) => {
            const doGrupo = filtrados.filter((p) => g.etapas.includes(p.status as Status));
            return (
              <section key={g.id} className="bgrupo">
                <div className="bgrupo-hd" style={{ borderColor: g.cor }}>
                  <Icone n={g.icone} />
                  <b>{g.rotulo}</b>
                  <span className="meta">{doGrupo.length}</span>
                  {g.id === "trafego" && (
                    <Link href="/trafego" className="bgrupo-link">
                      Fases no Tráfego <Icone n="dir" s={13} />
                    </Link>
                  )}
                </div>
                <div className="bcols">
                  {g.etapas.map((s) => {
                    const col = filtrados.filter((p) => p.status === s).sort(ordenar);
                    const paradas = col.filter(estaParada).length;
                    const fechada = recolhidas.has(s) || (s === "bloqueado" && !col.length && !recolhidas.has("!" + s));
                    const pag = paginas[s] ?? 1;
                    const visiveis = col.slice(0, pag * POR_PAGINA);
                    const briefing = s === "copy" ? visiveis.filter((p) => !p.copy?.trim()) : [];
                    const resto = s === "copy" ? visiveis.filter((p) => p.copy?.trim()) : visiveis;
                    const zona = {
                      onDragOver: (e: React.DragEvent) => {
                        if (arrastando === null) return;
                        e.preventDefault();
                        if (sobre !== s) setSobre(s);
                      },
                      onDragLeave: (e: React.DragEvent) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null);
                      },
                      onDrop: (e: React.DragEvent) => {
                        e.preventDefault();
                        soltar(s);
                      },
                    };
                    if (fechada) {
                      return (
                        <div key={s} className={"bcol fechada" + (sobre === s ? " sobre" : "")} {...zona}>
                          <button className="bcol-abrir" onClick={() => recolher(s === "bloqueado" && !recolhidas.has(s) ? "!" + s : s)} aria-label="Abrir coluna">
                            <Icone n="dir" s={14} />
                          </button>
                          <span className="bcol-n">{col.length}</span>
                          <span className="bcol-vert">{STATUS[s].rotulo}</span>
                        </div>
                      );
                    }
                    const card = (p: Producao) => (
                      <div
                        key={p.id}
                        className={"arrastavel" + (arrastando === p.id ? " fantasma" : "")}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(p.id));
                          setArrastando(p.id);
                        }}
                        onDragEnd={() => {
                          setArrastando(null);
                          setSobre(null);
                        }}
                      >
                        <CardEsteira p={p} mostrarMini={["revisao", "ajustes", "aprovado", "no_ar"].includes(s)} />
                      </div>
                    );
                    return (
                      <div key={s} className={"bcol" + (sobre === s ? " sobre" : "")} {...zona}>
                        <div className="bcol-hd">
                          <button className="ic-btn mini" onClick={() => recolher(s === "bloqueado" ? "!" + s : s)} aria-label="Recolher coluna">
                            <Icone n="baixo" s={14} />
                          </button>
                          <span className="bcol-t" title={STATUS[s].rotulo}>
                            {STATUS[s].rotulo}
                          </span>
                          {paradas > 0 && <span className="bcol-par">{paradas} {paradas === 1 ? "parada" : "paradas"}</span>}
                          <span className="bcol-c">{col.length > POR_PAGINA ? `${visiveis.length}/${col.length}` : col.length}</span>
                        </div>
                        <div className="bcol-lista">
                          {s === "copy" && briefing.length > 0 && (
                            <div className="bsub">
                              <b>Briefing</b> <span className="bsub-n">{briefing.length}</span>
                              <span>com copywriter, a começar</span>
                            </div>
                          )}
                          {briefing.map(card)}
                          {resto.map(card)}
                          {!col.length && <div className="bcol-vazia">vazia</div>}
                          {col.length > visiveis.length && (
                            <button className="bcol-mais" onClick={() => setPaginas((x) => ({ ...x, [s]: pag + 1 }))}>
                              Mostrar mais {Math.min(POR_PAGINA, col.length - visiveis.length)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {pedido && (
        <div className="modal-fundo" onClick={() => setPedido(null)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const texto = String(new FormData(e.currentTarget).get("texto") ?? "").trim();
              if (!texto) return;
              const ok = await enviar(pedido.p, pedido.para, texto);
              if (ok) setPedido(null);
            }}
          >
            <b>
              {nomeCurto(pedido.p)} → {STATUS[pedido.para].rotulo}
            </b>
            <textarea name="texto" rows={4} autoFocus placeholder={pedido.placeholder} required />
            <div className="modal-pe">
              <button type="button" className="btn sec-btn" onClick={() => setPedido(null)}>
                Cancelar
              </button>
              <button className="btn btn-roxo">Mover</button>
            </div>
          </form>
        </div>
      )}
      {aviso && <div className={"toast" + (aviso.erro ? " erro" : "")}>{aviso.t}</div>}
    </>
  );
}

// Resumo por grupo no topo da Esteira (cards com barra por etapa).
export function tagsTexto(p: Producao) {
  return tagsDe(p)
    .map((t) => t.nome)
    .join(", ");
}
export { diasNaEtapa };
