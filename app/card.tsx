import Link from "next/link";
import { nomeCurto, tagsDe, tempo, type Producao } from "@/lib/producao-base";
import { CONTA_PARADA, DIAS_PARADA, PRIORIDADES, TIPOS, grupoDe, prioridadeReal, type Status } from "@/lib/fluxo";
import { miniatura } from "@/lib/midia";
import { IcPrioridade, Icone } from "./icones";

// Cor fixa por texto (formato, expert sem cor cadastrada): sempre a mesma.
const PALETA = ["#5b47d6", "#2563eb", "#0f766e", "#15803d", "#b45309", "#be185d", "#7c3aed", "#0e7490", "#c2410c", "#4d7c0f"];
export function corDe(txt: string | null | undefined) {
  if (!txt) return "#a8a3b8";
  let h = 0;
  for (const c of txt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}

export const iniciais3 = (nome: string | null | undefined, sigla?: string | null) =>
  (sigla || (nome ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").slice(0, 3) || "—").toUpperCase().slice(0, 3);

export const diasNaEtapa = (p: Producao) => Math.floor((p.horas_etapa ?? 0) / 24);
export const estaParada = (p: Producao) => CONTA_PARADA.has(p.status as Status) && diasNaEtapa(p) >= DIAS_PARADA;
export const prioridadeDe = (p: Producao) => prioridadeReal(p.prioridade, diasNaEtapa(p), p.status);

// Quem aparece no topo do card: o responsavel da fase em que ele esta.
export function responsavel(p: Producao): { nome: string | null; sigla: string | null; vazio: string } {
  const g = grupoDe(p.status)?.id;
  if (g === "copy") return { nome: p.copy_nome, sigla: p.copy_sigla, vazio: "Sem copywriter" };
  if (g === "experts") return { nome: p.expert_nome, sigla: p.expert_sigla, vazio: "Sem expert" };
  return { nome: p.editor_nome, sigla: p.editor_sigla, vazio: "Sem editor" };
}

export function Chip({ nome, cor, cheio }: { nome: string; cor?: string; cheio?: boolean }) {
  if (cheio) {
    return (
      <span className="chip-cheio" style={{ background: corDe(nome) }}>
        {nome}
      </span>
    );
  }
  return (
    <span className="chip-ponto">
      <i className={`pt-${cor ?? "cinza"}`} />
      {nome}
    </span>
  );
}

export function Lado({ lado }: { lado: string }) {
  return (
    <span className={"lado2 " + lado}>
      <i />
      {lado === "white" ? "WHITE" : "BLACK"}
    </span>
  );
}

export function CardEsteira({ p, mostrarMini }: { p: Producao; mostrarMini?: boolean }) {
  const quem = responsavel(p);
  const dias = diasNaEtapa(p);
  const parada = estaParada(p);
  const pri = prioridadeDe(p);
  const tags = tagsDe(p);
  const refs = (p.referencia_url ? 1 : 0) + (p.referencia_img ? 1 : 0);
  const mini = mostrarMini ? miniatura(p.ultima_versao) : null;
  const g = grupoDe(p.status)?.id;
  const borda = p.expert_cor || corDe(p.expert_sigla ?? p.expert_nome);
  const venceu = !!p.prazo && p.prazo < new Date().toISOString().slice(0, 10) && g !== "trafego";

  return (
    <Link href={`/producao/${p.id}`} className="ce" style={{ borderLeftColor: borda }} draggable={false}>
      {mostrarMini && p.versoes > 0 && (
        <div className="ce-mini" style={mini ? { backgroundImage: `url(${mini})` } : undefined}>
          {!mini && <Icone n="play" s={20} />}
        </div>
      )}
      <div className="ce-l1">
        {quem.nome ? (
          <>
            <span className="ce-av">{iniciais3(quem.nome, quem.sigla)}</span>
            <span className="ce-quem">{quem.nome}</span>
          </>
        ) : (
          <span className="ce-quem ce-sem">{quem.vazio}</span>
        )}
        <span className="ce-tipo">{(TIPOS[p.tipo as keyof typeof TIPOS] ?? p.tipo).toUpperCase()}</span>
      </div>
      <div className="ce-l2">
        <span className="ce-cod">{nomeCurto(p).replace(/_/g, " _ ").replace(/\s/g, "")}</span>
        <Lado lado={p.lado} />
      </div>
      {(p.formato || tags.length > 0) && (
        <div className="ce-chips">
          {p.formato && <Chip nome={p.formato} cheio />}
          {tags.map((t) => (
            <Chip key={t.nome} nome={t.nome} cor={t.cor} />
          ))}
        </div>
      )}
      {p.status === "copy_reajuste" && <span className="ce-ajuste">reajuste de copy pedido</span>}
      {p.status === "ajustes" && <span className="ce-ajuste">ajuste no vídeo pedido</span>}
      {refs > 0 && (
        <div className="ce-refs">
          <Icone n="claquete" s={13} /> {refs} {refs === 1 ? "referência" : "referências"}
        </div>
      )}
      <div className="ce-pe">
        <span className={"ce-pri pri-" + pri}>
          <IcPrioridade p={pri} />
          {PRIORIDADES[pri]}
        </span>
        {p.prazo && (
          <span className={"ce-ic" + (venceu ? " vermelho" : "")} title={`prazo ${p.prazo.slice(8, 10)}/${p.prazo.slice(5, 7)}`}>
            <Icone n={venceu ? "alerta" : "relogio"} s={13} />
          </span>
        )}
        {g !== "copy" && p.copy_sigla && (
          <span className="ce-copy">
            copy <b>{p.copy_sigla}</b>
          </span>
        )}
      </div>
      <div className={"ce-tempo" + (parada ? " parada" : "")}>
        <Icone n="relogio" s={12} />
        {parada ? `parada ${tempo(p.horas_etapa)}` : tempo(p.horas_etapa)}
        {dias >= 0 ? "" : ""}
      </div>
    </Link>
  );
}
