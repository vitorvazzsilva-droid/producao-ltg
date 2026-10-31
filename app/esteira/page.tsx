import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes, hojeSP, usuarios } from "@/lib/dados";
import { ETAPAS, LADOS, STATUS, TIPOS, type Status } from "@/lib/fluxo";
import { Quadro } from "./quadro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esteira" };

type Q = { pessoa?: string; lado?: string; tipo?: string; etapa?: string };

export default async function Esteira({ searchParams }: { searchParams: Promise<Q> }) {
  const eu = await quemSou();
  const q = await searchParams;
  const pessoa = Number(q.pessoa) || undefined;
  const lado = q.lado && q.lado in LADOS ? q.lado : undefined;
  const tipo = q.tipo && q.tipo in TIPOS ? q.tipo : undefined;
  const etapa = ETAPAS.includes(q.etapa as Status) ? (q.etapa as Status) : undefined;
  const [lista, gente] = await Promise.all([producoes({ status: ETAPAS, pessoa, lado, tipo }), usuarios(true)]);

  // Os filtros se somam: cada link troca so o proprio campo.
  const link = (mudar: Partial<Q>) => {
    const p = new URLSearchParams(Object.entries({ ...q, ...mudar }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/esteira?${s}` : "/esteira";
  };

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Esteira</h1>
          <p className="sub">Arraste o card pra próxima etapa, ou abra o card e use os botões.</p>
        </div>
      </div>

      <div className="barra-esteira">
        <div className="filtros">
          <Link href={link({ pessoa: undefined })} className={"chip-f" + (!pessoa ? " on" : "")}>
            Todo mundo
          </Link>
          {gente
            .filter((u) => u.papel === "copy" || u.papel === "editor")
            .map((u) => (
              <Link key={u.id} href={link({ pessoa: String(u.id) })} className={"chip-f" + (pessoa === u.id ? " on" : "")}>
                {u.nome}
              </Link>
            ))}
        </div>
        <div className="filtros">
          <Link href={link({ lado: undefined })} className={"chip-f" + (!lado ? " on" : "")}>
            Black e white
          </Link>
          {Object.entries(LADOS).map(([k, v]) => (
            <Link key={k} href={link({ lado: k })} className={"chip-f" + (lado === k ? " on" : "")}>
              {v}
            </Link>
          ))}
        </div>
        <div className="filtros">
          <Link href={link({ tipo: undefined })} className={"chip-f" + (!tipo ? " on" : "")}>
            Todo tipo
          </Link>
          {Object.entries(TIPOS).map(([k, v]) => (
            <Link key={k} href={link({ tipo: k })} className={"chip-f" + (tipo === k ? " on" : "")}>
              {v}
            </Link>
          ))}
        </div>
      </div>

      {etapa && (
        <p className="so-etapa">
          Mostrando só <span className={`pill st-${etapa}`}>{STATUS[etapa].rotulo}</span>
          <Link href={link({ etapa: undefined })} className="lk">
            ver todas as etapas
          </Link>
        </p>
      )}

      <Quadro lista={lista} eu={{ id: eu.id, papel: eu.papel }} hoje={hojeSP()} etapas={etapa ? [etapa] : ETAPAS} />
    </div>
  );
}
