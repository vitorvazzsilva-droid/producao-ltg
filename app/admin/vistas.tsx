import Link from "next/link";
import { eMinhaVez, type Papel } from "@/lib/fluxo";
import { METRICAS, PERIODOS, type Metrica } from "@/lib/metas-base";
import type { MetaVista, NaEsteira, Tarefa } from "@/lib/metas";
import { Pill } from "../pecas";
import { StatusTarefaSel } from "./controles";

// Pecas de tela compartilhadas entre o painel /admin e "Minhas metas".

export function Barra({ feito, alvo }: { feito: number; alvo: number }) {
  const pct = alvo > 0 ? Math.min(100, Math.round((feito / alvo) * 100)) : 0;
  return (
    <div className="barra" role="progressbar" aria-valuenow={feito} aria-valuemax={alvo} aria-label={`${feito} de ${alvo}`}>
      <div className={"barra-in" + (feito >= alvo ? " batida" : "")} style={{ width: `${Math.max(pct, feito > 0 ? 3 : 0)}%` }} />
    </div>
  );
}

const fmtData = (d: string | null) => (d ? d.split("-").reverse().slice(0, 2).join("/") : "");

export function CartaoMeta({ m, hoje, children }: { m: MetaVista; hoje: string; children?: React.ReactNode }) {
  const batida = m.feito >= m.alvo;
  const atrasada = m.status === "aberta" && m.prazo && m.prazo < hoje && !batida;
  return (
    <div className={"meta-card" + (m.status === "concluida" ? " encerrada" : "")}>
      <div className="meta-topo">
        <div className="meta-tit">
          <b>{m.titulo}</b>
          <span className="meta-tags">
            <span className="tag">{PERIODOS[m.periodo]}</span>
            <span className="tag">{m.tipo === "automatica" ? "automática" : "manual"}</span>
            {m.status === "concluida" && <span className="tag tag-ok">{m.periodo === "avulsa" ? "concluída" : "encerrada"}</span>}
          </span>
        </div>
        <div className="meta-num">
          <b>{m.feito}</b>
          <span>/ {m.alvo}</span>
        </div>
      </div>
      <Barra feito={m.feito} alvo={m.alvo} />
      <div className="meta-info">
        {m.periodoAtual && <span>{m.periodo === "semana" ? "Semana" : "Mês"}: {m.periodoAtual}</span>}
        {m.tipo === "automatica" && m.metrica && <span>Conta: {METRICAS[m.metrica as Metrica]?.rotulo.toLowerCase()}</span>}
        {m.prazo && <span className={atrasada ? "vermelho" : ""}>Prazo {fmtData(m.prazo)}</span>}
        {batida && m.status === "aberta" && <span className="verde-t">Meta batida</span>}
      </div>
      {m.descricao && <p className="meta-desc">{m.descricao}</p>}
      {children}
      {m.historico.length > 0 && (
        <details className="meta-hist">
          <summary>Histórico ({m.historico.length})</summary>
          <ul>
            {m.historico.map((h) => (
              <li key={h.inicio}>
                <span className="hist-per">{h.rotulo}</span>
                <Barra feito={h.feito} alvo={h.alvo} />
                <span className={"hist-n" + (h.feito >= h.alvo ? " verde-t" : "")}>
                  {h.feito}/{h.alvo}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function LinhaTarefa({ t, admin, hoje, children }: { t: Tarefa; admin: boolean; hoje: string; children?: React.ReactNode }) {
  const atrasada = t.prazo && t.prazo < hoje && t.status !== "concluida";
  return (
    <li className={"tarefa" + (t.status === "concluida" ? " feita" : "")}>
      <div className="tarefa-txt">
        <b>{t.titulo}</b>
        {t.descricao && <p>{t.descricao}</p>}
        {t.prazo && <span className={"tarefa-prazo" + (atrasada ? " vermelho" : "")}>Prazo {fmtData(t.prazo)}</span>}
      </div>
      <div className="tarefa-acoes">
        <StatusTarefaSel id={t.id} status={t.status} admin={admin} />
        {children}
      </div>
    </li>
  );
}

// O que a pessoa tem na esteira agora (so leitura; o trabalho e na esteira).
export function NaEsteiraLista({ itens, pessoa }: { itens: NaEsteira[]; pessoa: { id: number; papel: string } }) {
  if (!itens.length) return <p className="meta">Nada na esteira agora.</p>;
  return (
    <ul className="na-esteira">
      {itens.map((p) => (
        <li key={p.id}>
          <Link href={`/producao/${p.id}`} className="mono item-cod">
            {p.codigo}
          </Link>
          <Pill status={p.status} />
          {eMinhaVez(p, { id: pessoa.id, papel: pessoa.papel as Papel }) && <span className="vez-dele">na vez</span>}
        </li>
      ))}
    </ul>
  );
}
