import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes, ajustesDe, materiaisDe, hojeSP } from "@/lib/dados";
import { Abas, Ajuste, Brutos, ItemCab, Passos, Recado, TextoCopy } from "../areas";
import { Icone } from "../icones";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Copys" };

// Area 1: o copy escreve aqui; quando fica pronta, a copy espera a gravacao
// nesta mesma area. Quem grava cola o link do video e manda pra Gravados.
export default async function Copys({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const todas = await producoes({ status: ["copy", "ajustes", "gravar"] });
  const escrevendo = todas.filter((p) => p.status === "copy" || (p.status === "ajustes" && p.ajuste_de === "copy"));
  const entregues = todas.filter((p) => p.status === "gravar");
  const aba = a === "gravar" ? "gravar" : "escrevendo";
  const lista = aba === "gravar" ? entregues : escrevendo;
  const [ajustes, mats] = await Promise.all([
    ajustesDe(lista.filter((p) => p.status === "ajustes").map((p) => p.id)),
    materiaisDe(aba === "gravar" ? lista.map((p) => p.id) : []),
  ]);
  const grava = eu.papel === "admin" || eu.papel === "gravacao";
  const hoje = hojeSP();

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <span className="area-num">Área 1</span>
          <h1>Copys</h1>
          <p className="sub">O copy escreve aqui. Copy pronta espera em “Prontas pra gravar”: grave, cole o link do vídeo e ele vai pra Gravados.</p>
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
          { id: "gravar", rotulo: "Prontas pra gravar", n: entregues.length },
        ]}
      />

      {!lista.length ? (
        <Vazio titulo={aba === "escrevendo" ? "Nenhuma copy sendo escrita" : "Nenhuma copy esperando gravação"}>
          {aba === "escrevendo" ? "Clique em “Nova copy” pra começar." : "Quando o copy terminar uma copy, ela aparece aqui pra gravar."}
        </Vazio>
      ) : (
        <div className="itens">
          {lista.map((p) =>
            aba === "gravar" ? (
              <article key={p.id} className="item">
                <ItemCab p={p} hoje={hoje} />
                <div className="grav-grade">
                  <div>
                    <Recado titulo="Recado pra gravação" texto={p.briefing_gravacao} />
                    <TextoCopy p={p} grande />
                  </div>
                  <div>
                    <Brutos p={p} mats={mats.get(p.id) ?? []} add={grava} />
                    <Passos p={p} papel={eu.papel} so={["gravei", "ajustar_copy"]} />
                  </div>
                </div>
              </article>
            ) : (
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
            )
          )}
        </div>
      )}
    </div>
  );
}
