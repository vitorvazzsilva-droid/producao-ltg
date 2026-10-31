import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes } from "@/lib/dados";
import { TIPOS } from "@/lib/fluxo";
import { CardVideo, Pill, Vazio } from "../pecas";
import { Icone } from "../icones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anúncios" };

type Q = { aba?: string; lado?: string; tipo?: string; q?: string; ver?: string };

// Acervo: o pronto (aprovado ou no ar) e o que ainda tem so material bruto.
export default async function Anuncios({ searchParams }: { searchParams: Promise<Q> }) {
  await quemSou();
  const q = await searchParams;
  const aba = q.aba === "bruto" || q.aba === "tudo" ? q.aba : "pronto";
  const filtro = { lado: q.lado || undefined, tipo: q.tipo || undefined, busca: q.q || undefined };
  const [prontos, brutos, tudo] = await Promise.all([
    producoes({ ...filtro, status: ["aprovado", "no_ar"] }),
    producoes({ ...filtro, comBruto: true }),
    producoes(filtro),
  ]);
  const lista = aba === "pronto" ? prontos : aba === "bruto" ? brutos : tudo;
  const lista_ = q.ver === "lista";

  const link = (mudar: Partial<Q>) => {
    const p = new URLSearchParams(Object.entries({ ...q, ...mudar }).filter(([, v]) => v) as [string, string][]);
    return `/anuncios?${p}`;
  };

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Anúncios</h1>
          <p className="sub">O bruto e o pronto de cada produção — assistir, baixar, achar.</p>
        </div>
      </div>

      <div className="abas">
        <Link href={link({ aba: "tudo" })} className={"aba" + (aba === "tudo" ? " on" : "")}>
          Tudo <span>{tudo.length}</span>
        </Link>
        <Link href={link({ aba: "pronto" })} className={"aba" + (aba === "pronto" ? " on" : "")}>
          Pronto <span>{prontos.length}</span>
        </Link>
        <Link href={link({ aba: "bruto" })} className={"aba" + (aba === "bruto" ? " on" : "")}>
          Bruto <span>{brutos.length}</span>
        </Link>
      </div>

      <form className="barra-filtro" action="/anuncios">
        <input type="hidden" name="aba" value={aba} />
        {q.ver && <input type="hidden" name="ver" value={q.ver} />}
        <input name="q" defaultValue={q.q} placeholder="Buscar pelo nome, hook ou copy" />
        <select name="lado" defaultValue={q.lado ?? ""}>
          <option value="">Black e white</option>
          <option value="black">Só BLACK</option>
          <option value="white">Só WHITE</option>
        </select>
        <select name="tipo" defaultValue={q.tipo ?? ""}>
          <option value="">Todo tipo</option>
          {Object.entries(TIPOS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn sec-btn">Filtrar</button>
        <span className="sp" />
        <div className="vistas">
          <Link href={link({ ver: undefined })} className={!lista_ ? "on" : ""}>
            <Icone n="anuncios" s={14} /> Grade
          </Link>
          <Link href={link({ ver: "lista" })} className={lista_ ? "on" : ""}>
            <Icone n="copy" s={14} /> Lista
          </Link>
        </div>
      </form>

      {!lista.length ? (
        <Vazio titulo={aba === "pronto" ? "Nada aprovado ainda" : "Nada por aqui"}>
          {aba === "pronto" ? "Quando um criativo for aprovado na revisão ele aparece aqui." : "Mude os filtros ou crie uma produção nova."}
        </Vazio>
      ) : lista_ ? (
        <div className="tabela">
          {lista.map((p) => (
            <Link key={p.id} href={`/producao/${p.id}`} className="linha">
              <span className={"lado " + p.lado}>{p.lado.toUpperCase()}</span>
              <span className="mono">{p.codigo}</span>
              <span className="linha-hook">{p.hook ?? p.angulo}</span>
              <span className="linha-quem">{p.editor_nome ?? "—"}</span>
              <Pill status={p.status} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="grade">
          {lista.map((p) => (
            <CardVideo key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
