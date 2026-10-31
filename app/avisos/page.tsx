import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { avisos, quando } from "@/lib/dados";
import { lerAvisos } from "../acoes";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avisos" };

export default async function Avisos() {
  const eu = await quemSou();
  const lista = await avisos(eu.id);
  const novos = lista.filter((a) => !a.lido).length;

  return (
    <div className="pagina estreita">
      <div className="cab">
        <div>
          <h1>Avisos</h1>
          <p className="sub">{novos ? `${novos} novo${novos > 1 ? "s" : ""}` : "Nada novo"}</p>
        </div>
        {novos > 0 && (
          <form action={lerAvisos}>
            <button className="btn sec-btn">Marcar tudo como lido</button>
          </form>
        )}
      </div>
      {lista.length ? (
        <ul className="avisos">
          {lista.map((a) => (
            <li key={a.id} className={a.lido ? "" : "novo"}>
              <Link href={`/avisos/${a.id}`} prefetch={false}>
                <span>{a.texto}</span>
                <span className="meta">{quando(a.criado_em)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio titulo="Sem avisos ainda" />
      )}
    </div>
  );
}
