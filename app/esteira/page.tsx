import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes, hojeSP, usuarios } from "@/lib/dados";
import { ETAPAS, STATUS } from "@/lib/fluxo";
import { CardTarefa } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esteira" };

export default async function Esteira({ searchParams }: { searchParams: Promise<{ pessoa?: string }> }) {
  await quemSou();
  const q = await searchParams;
  const pessoa = Number(q.pessoa) || undefined;
  const [lista, gente] = await Promise.all([producoes({ status: ETAPAS, pessoa }), usuarios(true)]);
  const hoje = hojeSP();

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Esteira</h1>
          <p className="sub">Cada coluna é uma etapa. Abra o card pra mover.</p>
        </div>
        <div className="filtros">
          <Link href="/esteira" className={"chip-f" + (!pessoa ? " on" : "")}>
            Todo mundo
          </Link>
          {gente
            .filter((u) => u.papel === "copy" || u.papel === "editor")
            .map((u) => (
              <Link key={u.id} href={`/esteira?pessoa=${u.id}`} className={"chip-f" + (pessoa === u.id ? " on" : "")}>
                {u.nome}
              </Link>
            ))}
        </div>
      </div>

      <div className="kanban">
        {ETAPAS.map((s) => {
          const col = lista.filter((p) => p.status === s);
          return (
            <div key={s} id={`col-${s}`} className={`col st-${s}`}>
              <div className="col-hd">
                <span className="col-ponto" />
                <span>{STATUS[s].rotulo}</span>
                <span className="col-n">{col.length}</span>
              </div>
              <div className="col-lista">
                {col.map((p) => (
                  <CardTarefa key={p.id} p={p} hoje={hoje} />
                ))}
                {!col.length && <div className="col-vazia">vazio</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
