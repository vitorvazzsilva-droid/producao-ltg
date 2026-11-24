import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes, hojeSP } from "@/lib/dados";
import { nomeCurto } from "@/lib/producao-base";
import { STATUS, type Status } from "@/lib/fluxo";
import { VazioGrande } from "../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agenda" };

// Os prazos (gravacoes e entregas) de cada dia, do seu jeito: o admin ve todos.
export default async function Agenda() {
  const eu = await quemSou();
  const hoje = hojeSP();
  const todas = await producoes({ status: ["copy", "copy_revisao", "copy_reajuste", "gravar", "gravado", "pronta", "edicao", "revisao", "ajustes", "aprovado"] });
  const minhas = (eu.papel === "admin" ? todas : todas.filter((p) => [p.copy_id, p.editor_id, p.expert_id].includes(eu.id))).filter((p) => p.prazo);
  const dias = [...new Set(minhas.map((p) => p.prazo!))].sort();
  const fmt = (d: string) =>
    new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <h1>Agenda</h1>
          <p className="sub">Suas gravações e entregas com data marcada.</p>
        </div>
      </div>
      {!dias.length ? (
        <VazioGrande icone="calendario" titulo="Nada com data" texto="Quando uma produção ganhar prazo na Ficha, ela aparece aqui no dia." />
      ) : (
        dias.map((d) => (
          <div key={d} className="agenda-dia">
            <h2 className={"h2n" + (d < hoje ? " vermelho" : "")}>
              {d === hoje ? "Hoje" : fmt(d)}
              {d < hoje && " · venceu"}
            </h2>
            <div className="fila">
              {minhas
                .filter((p) => p.prazo === d)
                .map((p) => (
                  <Link key={p.id} href={`/producao/${p.id}`} className="fila-i">
                    <span className="mono b">{nomeCurto(p)}</span>
                    <span className={`pill st-${p.status}`}>{STATUS[p.status as Status]?.rotulo}</span>
                    <span className="fila-hook">{p.status === "gravar" ? `gravação — ${p.expert_nome ?? "sem expert"}` : (p.hook ?? "")}</span>
                  </Link>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
