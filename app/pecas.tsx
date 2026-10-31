import Link from "next/link";
import type { Producao } from "@/lib/dados";
import { LADOS, RESULTADOS, STATUS, TIPOS, type Status } from "@/lib/fluxo";
import { miniatura } from "@/lib/midia";
import { Icone } from "./icones";

export function Pill({ status }: { status: string }) {
  return <span className={`pill st-${status}`}>{STATUS[status as Status]?.rotulo ?? status}</span>;
}

export function Lado({ lado }: { lado: string }) {
  return <span className={"lado " + lado}>{LADOS[lado as keyof typeof LADOS] ?? lado}</span>;
}

export function Resultado({ r }: { r: string | null }) {
  if (!r) return null;
  return <span className={"res res-" + r}>{RESULTADOS[r as keyof typeof RESULTADOS] ?? r}</span>;
}

// Card da grade do acervo: miniatura vertical do ultimo corte, codigo e quem fez.
export function CardVideo({ p }: { p: Producao }) {
  const mini = miniatura(p.ultima_versao);
  return (
    <Link href={`/producao/${p.id}`} className="cv">
      <div className="cv-tela" style={mini ? { backgroundImage: `url(${mini})` } : undefined}>
        {!mini && <span className="cv-sem">{p.hook ?? p.angulo}</span>}
        <Lado lado={p.lado} />
        {p.versoes > 0 && <span className="cv-v">versão {p.versoes}</span>}
        <span className="cv-play">
          <Icone n="play" s={18} />
        </span>
      </div>
      <div className="cv-info">
        <div className="mono cv-cod">{p.codigo}</div>
        <div className="cv-quem">
          <span className="ponto" />
          {p.copy_nome ?? "sem copy"} · edição {p.editor_nome ?? "—"}
        </div>
        <div className="cv-quem">{TIPOS[p.tipo as keyof typeof TIPOS] ?? p.tipo}</div>
        <div className="cv-pe">
          <Pill status={p.status} />
          <Resultado r={p.resultado} />
        </div>
      </div>
    </Link>
  );
}

// Linha compacta pra listas de tarefa e colunas da esteira.
export function CardTarefa({ p, hoje }: { p: Producao; hoje: string }) {
  const aberto = !["aprovado", "no_ar", "arquivado"].includes(p.status);
  const atrasado = aberto && !!p.prazo && p.prazo < hoje;
  const ehHoje = aberto && p.prazo === hoje;
  return (
    <Link href={`/producao/${p.id}`} className={"ct" + (atrasado ? " ct-atrasado" : ehHoje ? " ct-hoje" : "")} draggable={false}>
      <div className="ct-hd">
        <Lado lado={p.lado} />
        <span className="mono ct-cod">{p.codigo}</span>
      </div>
      <p className="ct-hook">{p.hook ?? <i>sem hook ainda</i>}</p>
      {p.status === "ajustes" && <span className="ct-ajuste">ajuste {p.ajuste_de === "copy" ? "na copy" : "no vídeo"}</span>}
      <div className="ct-pe">
        <span>{p.editor_nome ? `edição ${p.editor_nome}` : p.copy_nome ? `copy ${p.copy_nome}` : "sem responsável"}</span>
        {p.versoes > 0 && (
          <span className="ct-v">
            <Icone n="video" s={13} /> v{p.versoes}
          </span>
        )}
        {p.prazo && (
          <span className={"ct-prazo" + (atrasado ? " atrasado" : ehHoje ? " hoje" : "")}>
            {atrasado ? "venceu " : ehHoje ? "hoje " : ""}
            {p.prazo.slice(8, 10)}/{p.prazo.slice(5, 7)}
          </span>
        )}
      </div>
    </Link>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="vazio">
      <b>{titulo}</b>
      {children && <p>{children}</p>}
    </div>
  );
}
