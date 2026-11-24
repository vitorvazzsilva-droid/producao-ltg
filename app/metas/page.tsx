import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { hojeSP } from "@/lib/dados";
import { metas, tarefas, esteiraPorPessoa } from "@/lib/metas";
import { CartaoMeta, LinhaTarefa, NaEsteiraLista } from "../admin/vistas";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minhas metas" };

// Area do membro: so as metas e tarefas DELE (filtro pelo id da sessao,
// no servidor). O admin usa o painel /admin.
export default async function MinhasMetas() {
  const eu = await quemSou();
  if (eu.papel === "admin") redirect("/admin");
  const [ms, ts, est] = await Promise.all([metas(eu.id), tarefas(eu.id), esteiraPorPessoa()]);
  const hoje = hojeSP();
  const abertas = ms.filter((m) => m.status === "aberta");
  const encerradas = ms.filter((m) => m.status !== "aberta");

  return (
    <div className="pagina estreita">
      <div className="cab">
        <div>
          <h1>Minhas metas</h1>
          <p className="sub">Suas metas, tarefas avulsas e o que está com você na esteira.</p>
        </div>
      </div>

      <section className="sec">
        <div className="sec-hd">
          <h2>Metas</h2>
          <span className="sec-n">{abertas.length}</span>
        </div>
        {abertas.length ? (
          <div className="metas-lista">
            {abertas.map((m) => (
              <CartaoMeta key={m.id} m={m} hoje={hoje} />
            ))}
          </div>
        ) : (
          <Vazio titulo="Nenhuma meta no momento" />
        )}
      </section>

      <section className="sec">
        <div className="sec-hd">
          <h2>Tarefas</h2>
          <span className="sec-n">{ts.filter((t) => t.status !== "concluida").length}</span>
        </div>
        {ts.length ? (
          <div className="bloco">
            <ul className="tarefas">
              {ts.map((t) => (
                <LinhaTarefa key={t.id} t={t} admin={false} hoje={hoje} />
              ))}
            </ul>
          </div>
        ) : (
          <Vazio titulo="Nenhuma tarefa avulsa" />
        )}
      </section>

      <section className="sec">
        <div className="sec-hd">
          <h2>Com você na esteira</h2>
        </div>
        <div className="bloco">
          <NaEsteiraLista itens={est.get(eu.id) ?? []} pessoa={eu} />
        </div>
      </section>

      {encerradas.length > 0 && (
        <section className="sec">
          <div className="sec-hd">
            <h2>Metas encerradas</h2>
          </div>
          <div className="metas-lista">
            {encerradas.map((m) => (
              <CartaoMeta key={m.id} m={m} hoje={hoje} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
