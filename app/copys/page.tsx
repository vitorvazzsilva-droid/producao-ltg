import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes, ajustesDe, hojeSP } from "@/lib/dados";
import { Abas, Ajuste, ItemCab, Passos, Recado, TextoCopy } from "../areas";
import { Icone } from "../icones";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Copys" };

// Area 1: onde o copy escreve e entrega. "Escrevendo" inclui a copy que
// voltou com pedido de ajuste.
export default async function Copys({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const todas = await producoes({ status: ["copy", "ajustes", "gravar"] });
  const escrevendo = todas.filter((p) => p.status === "copy" || (p.status === "ajustes" && p.ajuste_de === "copy"));
  const entregues = todas.filter((p) => p.status === "gravar");
  const aba = a === "entregues" ? "entregues" : "escrevendo";
  const lista = aba === "entregues" ? entregues : escrevendo;
  const ajustes = await ajustesDe(lista.filter((p) => p.status === "ajustes").map((p) => p.id));
  const hoje = hojeSP();

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <span className="area-num">Área 1</span>
          <h1>Copys</h1>
          <p className="sub">O copy escreve aqui. Quando a copy fica pronta, ela vai pra Gravação.</p>
        </div>
        {(eu.papel === "admin" || eu.papel === "copy") && (
          <Link href="/nova" className="btn">
            <Icone n="mais" /> Nova copy
          </Link>
        )}
      </div>

      <Abas
        base="/copys"
        atual={aba}
        abas={[
          { id: "escrevendo", rotulo: "Escrevendo", n: escrevendo.length },
          { id: "entregues", rotulo: "Entregues pra gravar", n: entregues.length },
        ]}
      />

      {!lista.length ? (
        <Vazio titulo={aba === "escrevendo" ? "Nenhuma copy sendo escrita" : "Nenhuma copy esperando gravação"}>
          {aba === "escrevendo" ? "Clique em “Nova copy” pra começar." : "Quando o copy mandar uma copy pra gravação, ela aparece aqui."}
        </Vazio>
      ) : (
        <div className="itens">
          {lista.map((p) => (
            <article key={p.id} className="item">
              <ItemCab p={p} hoje={hoje} />
              <p className="item-angulo">
                Ângulo <b>{p.angulo}</b>
                {p.formato ? ` · ${p.formato}` : ""}
              </p>
              <Ajuste a={ajustes.get(p.id)} de={p.ajuste_de} />
              <TextoCopy p={p} />
              <div className="duas-col">
                <Recado titulo="Pra gravação" texto={p.briefing_gravacao} />
                <Recado titulo="Pra edição" texto={p.briefing} />
              </div>
              <div className="item-pe">
                <Link href={`/producao/${p.id}#copy`} className="btn sec-btn">
                  Editar copy
                </Link>
                <Passos p={p} papel={eu.papel} so={["mandar", "copy_ajustada"]} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
