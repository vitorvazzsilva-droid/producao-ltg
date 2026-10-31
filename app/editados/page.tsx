import { eu as quemSou } from "@/lib/sessao";
import { producoes, materiaisDe, ajustesDe, hojeSP } from "@/lib/dados";
import { Abas, Ajuste, Editado, ItemCab, Passos } from "../areas";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editados" };

// Area 4: onde caem os videos editados. Aqui se assiste, aprova ou pede
// ajuste; o aprovado fica pronto pro trafego.
export default async function Editados({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const [revisar, aprovados, ajustes_] = await Promise.all([
    producoes({ status: ["revisao"] }),
    producoes({ status: ["aprovado"] }),
    producoes({ status: ["ajustes"] }),
  ]);
  const comAjuste = ajustes_.filter((p) => p.ajuste_de !== "copy");
  const aba = a === "aprovados" ? "aprovados" : a === "ajustes" ? "ajustes" : "revisar";
  const lista = aba === "revisar" ? revisar : aba === "aprovados" ? aprovados : comAjuste;
  const [mats, ajustes] = await Promise.all([materiaisDe(lista.map((p) => p.id)), ajustesDe(lista.map((p) => p.id))]);
  const hoje = hojeSP();

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <span className="area-num">Área 4</span>
          <h1>Editados</h1>
          <p className="sub">Os vídeos que o editor entregou. Assista, aprove ou peça ajuste. O aprovado vai pro tráfego.</p>
        </div>
      </div>

      <Abas
        base="/editados"
        atual={aba}
        abas={[
          { id: "revisar", rotulo: "Pra revisar", n: revisar.length },
          { id: "ajustes", rotulo: "Voltaram pra ajuste", n: comAjuste.length },
          { id: "aprovados", rotulo: "Aprovados", n: aprovados.length },
        ]}
      />

      {!lista.length ? (
        <Vazio titulo={aba === "revisar" ? "Nenhum vídeo esperando revisão" : aba === "aprovados" ? "Nada aprovado esperando o tráfego" : "Nenhum ajuste aberto"} />
      ) : (
        <div className="editados">
          {lista.map((p) => (
            <article key={p.id} className="item">
              <ItemCab p={p} hoje={hoje} />
              {p.hook && <p className="item-hook">{p.hook}</p>}
              <p className="item-angulo">
                Copy <b>{p.copy_nome ?? "—"}</b> · Edição <b>{p.editor_nome ?? "—"}</b>
              </p>
              <Ajuste a={aba === "ajustes" ? ajustes.get(p.id) : undefined} de={p.ajuste_de} />
              <Editado p={p} mats={mats.get(p.id) ?? []} />
              <Passos p={p} papel={eu.papel} so={["aprovar", "ajustar", "subir"]} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
