import Link from "next/link";
import { Icone } from "./icones";

export function Stat({ rotulo, n, nota, barra }: { rotulo: string; n: number; nota: string; barra?: number }) {
  return (
    <div className="stat">
      <div className="stat-hd">
        <span>{rotulo}</span>
        <b>{n}</b>
      </div>
      <div className="stat-barra">
        <i style={{ width: `${Math.min(100, barra ?? 0)}%` }} />
      </div>
      <small>{nota}</small>
    </div>
  );
}

export function VazioGrande({ titulo, texto, icone = "doc", acao }: { titulo: string; texto: string; icone?: string; acao?: { href: string; rotulo: string } }) {
  return (
    <div className="vazio-g">
      <span className="vazio-ic">
        <Icone n={icone} s={20} />
      </span>
      <b>{titulo}</b>
      <p>{texto}</p>
      {acao && (
        <Link href={acao.href} className="btn sec-btn">
          {acao.rotulo}
        </Link>
      )}
    </div>
  );
}
