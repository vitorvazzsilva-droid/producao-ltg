"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Video } from "@/lib/dados";
import { STATUS, TIPOS, type Status } from "@/lib/fluxo";
import { baixar, miniatura } from "@/lib/midia";
import { Lado } from "../card";
import { Icone } from "../icones";

const PAGINA = 48;

const nomeCurtoV = (v: Video) =>
  v.expert_sigla && v.numero ? `${v.expert_sigla}_${(v.oferta_sigla ?? "X")[0]}_${String(v.numero).padStart(3, "0")}` : v.codigo;
const nomeVideo = (v: Video) => (v.tipo === "versao" && v.versao ? `${v.codigo}_H${v.versao}` : v.codigo);

export function Acervo({
  lista,
  ver,
  conta,
  aba: aba0,
  experts,
}: {
  lista: Video[];
  ver: "bruto" | "versao";
  conta: { bruto: number; versao: number };
  aba: "tudo" | "criativos" | "lateralizacoes";
  experts: { id: number; nome: string }[];
}) {
  const [aba, setAba] = useState(aba0);
  const [q, setQ] = useState("");
  const [expert, setExpert] = useState("");
  const [tipo, setTipo] = useState("");
  const [lado, setLado] = useState("");
  const [mais, setMais] = useState(false);
  const [vista, setVista] = useState<"grade" | "lista">("grade");
  const [qtd, setQtd] = useState(PAGINA);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [salvos, setSalvos] = useState<Set<number>>(new Set());
  const [soSalvos, setSoSalvos] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);

  useEffect(() => {
    try {
      setSalvos(new Set(JSON.parse(localStorage.getItem("anuncios-salvos") ?? "[]")));
      const v = localStorage.getItem("anuncios-vista");
      if (v === "lista" || v === "grade") setVista(v);
    } catch {}
  }, []);

  const filtrada = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lista.filter((v) => {
      if (aba === "criativos" && v.ptipo === "lateralizacao") return false;
      if (aba === "lateralizacoes" && v.ptipo !== "lateralizacao") return false;
      if (expert && String(v.expert_id) !== expert) return false;
      if (tipo && v.ptipo !== tipo) return false;
      if (lado && v.lado !== lado) return false;
      if (soSalvos && !salvos.has(v.id)) return false;
      if (t && !(nomeVideo(v) + " " + (v.expert_nome ?? "")).toLowerCase().includes(t)) return false;
      return true;
    });
  }, [lista, aba, q, expert, tipo, lado, soSalvos, salvos]);
  const visiveis = filtrada.slice(0, qtd);
  const todosMarcados = visiveis.length > 0 && visiveis.every((v) => marcados.has(v.id));

  const salvar = (id: number) =>
    setSalvos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        localStorage.setItem("anuncios-salvos", JSON.stringify([...n]));
      } catch {}
      return n;
    });

  const marcar = (id: number) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const sel = (v: string, set: (s: string) => void, todo: string, ops: [string, string][]) => (
    <label className="sel">
      <select value={v} onChange={(e) => set(e.target.value)}>
        <option value="">{todo}</option>
        {ops.map(([k, r]) => (
          <option key={k} value={k}>
            {r}
          </option>
        ))}
      </select>
      <Icone n="baixo" s={14} />
    </label>
  );

  return (
    <>
      <div className="cab">
        <div>
          <h1>Anúncios</h1>
          <p className="sub">O bruto e o pronto de cada produção — tocar, baixar, achar.</p>
        </div>
        <button className={"btn-fant" + (soSalvos ? " on" : "")} onClick={() => setSoSalvos((v) => !v)}>
          <Icone n="marcador" /> Salvos{salvos.size ? ` ${salvos.size}` : ""}
        </button>
      </div>

      <div className="abas-linha">
        <div className="seg">
          {(
            [
              ["tudo", "Tudo"],
              ["criativos", "Criativos"],
              ["lateralizacoes", "Lateralizações"],
            ] as const
          ).map(([k, r]) => (
            <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}>
              {r}
            </button>
          ))}
        </div>
        <div className="seg">
          <Link href="/anuncios" className={ver === "versao" ? "on" : ""}>
            Pronto <span className="meta">{conta.versao}</span>
          </Link>
          <Link href="/anuncios?ver=bruto" className={ver === "bruto" ? "on" : ""}>
            Bruto <span className="meta">{conta.bruto}</span>
          </Link>
        </div>
      </div>

      <div className="filtros">
        <label className="campo-busca sem-ic">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pelo nome" />
        </label>
        {sel(expert, setExpert, "Todo expert", experts.map((x) => [String(x.id), x.nome]))}
        {sel(tipo, setTipo, "Todo tipo", Object.entries(TIPOS))}
        <button className={"ic-quad" + (mais || lado ? " on" : "")} onClick={() => setMais((v) => !v)} title="Mais filtros">
          <Icone n="filtro" />
        </button>
        {mais &&
          sel(lado, setLado, "Black e White", [
            ["black", "Só Black"],
            ["white", "Só White"],
          ])}
        <span className="sp" />
        <div className="seg">
          <button
            className={vista === "grade" ? "on" : ""}
            onClick={() => {
              setVista("grade");
              try {
                localStorage.setItem("anuncios-vista", "grade");
              } catch {}
            }}
          >
            <Icone n="quadro" /> Grade
          </button>
          <button
            className={vista === "lista" ? "on" : ""}
            onClick={() => {
              setVista("lista");
              try {
                localStorage.setItem("anuncios-vista", "lista");
              } catch {}
            }}
          >
            <Icone n="lista" /> Lista
          </button>
        </div>
      </div>

      <div className="marcar-linha">
        <label className="chk">
          <input
            type="checkbox"
            checked={todosMarcados}
            onChange={() => setMarcados(todosMarcados ? new Set() : new Set(visiveis.map((v) => v.id)))}
          />
          Marcar os {visiveis.length} à vista
        </label>
        <span className="meta">
          {visiveis.length} de {filtrada.length} carregados{filtrada.length > visiveis.length ? " — “Mostrar mais”, no fim, traz o resto" : ""}
        </span>
        {marcados.size > 0 && (
          <span className="marcados-acoes">
            <b>{marcados.size} marcados</b>
            <button
              className="btn sec-btn"
              onClick={() => {
                const links = lista.filter((v) => marcados.has(v.id)).map((v) => `${nomeVideo(v)}  ${v.url}`);
                navigator.clipboard?.writeText(links.join("\n"));
              }}
            >
              <Icone n="copiar" /> Copiar links
            </button>
            <button
              className="btn sec-btn"
              onClick={() =>
                lista
                  .filter((v) => marcados.has(v.id))
                  .forEach((v, i) => setTimeout(() => window.open(baixar(v.url), "_blank"), i * 400))
              }
            >
              <Icone n="baixar" /> Baixar
            </button>
          </span>
        )}
      </div>

      {!filtrada.length ? (
        <div className="vazio-g">
          <span className="vazio-ic">
            <Icone n="video" s={20} />
          </span>
          <b>{ver === "bruto" ? "Nenhum bruto ainda" : "Nenhum vídeo pronto ainda"}</b>
          <p>{ver === "bruto" ? "Quando o expert colar o link do vídeo gravado, ele aparece aqui." : "Cada versão que a edição subir aparece aqui."}</p>
        </div>
      ) : vista === "grade" ? (
        <div className="grade-v">
          {visiveis.map((v) => {
            const mini = miniatura(v.url);
            return (
              <div key={v.id} className={"gv" + (marcados.has(v.id) ? " marcado" : "")}>
                <a href={v.url} target="_blank" rel="noreferrer" className="gv-tela" style={mini ? { backgroundImage: `url(${mini})` } : undefined}>
                  <span className="gv-sup">
                    {v.ptipo === "lateralizacao" && <span className="gv-v">V</span>}
                    <Lado lado={v.lado} />
                  </span>
                  <span className="gv-play">
                    <Icone n="play" s={18} />
                  </span>
                  <span className="gv-inf">{v.tipo === "versao" ? `versão ${v.versao ?? 1}` : "bruto"}</span>
                </a>
                <label className="gv-chk" title="Marcar">
                  <input type="checkbox" checked={marcados.has(v.id)} onChange={() => marcar(v.id)} />
                </label>
                <div className="gv-info">
                  <Link href={`/producao/${v.producao_id}`} className="gv-nome mono" title={nomeVideo(v)}>
                    {nomeVideo(v)}
                  </Link>
                  <div className="gv-quem">
                    <i className="bola verde" />
                    {v.expert_nome ?? "Sem expert"}
                    {v.editor_sigla ? ` · edição ${v.editor_sigla}` : ""} · {TIPOS[v.ptipo as keyof typeof TIPOS] ?? v.ptipo}
                  </div>
                  <button
                    className="gv-cod mono"
                    onClick={() => {
                      navigator.clipboard?.writeText(nomeCurtoV(v));
                      setCopiado(v.id);
                      setTimeout(() => setCopiado(null), 1200);
                    }}
                    title="Copiar o código"
                  >
                    {nomeCurtoV(v)}
                    <Icone n={copiado === v.id ? "check" : "copiar"} s={13} />
                  </button>
                  <div className="gv-pe">
                    <span className={`pill st-${v.status}`}>{STATUS[v.status as Status]?.rotulo ?? v.status}</span>
                    <span className="sp" />
                    <button className={"ic-btn" + (salvos.has(v.id) ? " roxo" : "")} onClick={() => salvar(v.id)} title="Salvar">
                      <Icone n="marcador" s={15} />
                    </button>
                    <a className="ic-btn" href={baixar(v.url)} target="_blank" rel="noreferrer" title="Baixar">
                      <Icone n="baixar" s={15} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th />
                <th>Nome</th>
                <th>Expert</th>
                <th>Tipo</th>
                <th>Etapa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((v) => (
                <tr key={v.id}>
                  <td>
                    <input type="checkbox" checked={marcados.has(v.id)} onChange={() => marcar(v.id)} />
                  </td>
                  <td>
                    <Link href={`/producao/${v.producao_id}`} className="mono b">
                      {nomeVideo(v)}
                    </Link>{" "}
                    <Lado lado={v.lado} />
                  </td>
                  <td>{v.expert_nome ?? "—"}</td>
                  <td>{TIPOS[v.ptipo as keyof typeof TIPOS] ?? v.ptipo}</td>
                  <td>
                    <span className={`pill st-${v.status}`}>{STATUS[v.status as Status]?.rotulo ?? v.status}</span>
                  </td>
                  <td>
                    <a className="ic-btn" href={baixar(v.url)} target="_blank" rel="noreferrer" title="Baixar">
                      <Icone n="baixar" s={15} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtrada.length > visiveis.length && (
        <div className="mais-linha">
          <button className="btn sec-btn" onClick={() => setQtd((n) => n + PAGINA)}>
            Mostrar mais ({filtrada.length - visiveis.length})
          </button>
        </div>
      )}
    </>
  );
}
