import { eu as quemSou } from "@/lib/sessao";
import { producoes, materiaisDe, hojeSP } from "@/lib/dados";
import { Abas, Editado, ItemCab, Passos } from "../areas";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editados" };

// Area 4: onde caem os videos editados. Aqui se assiste, aprova ou pede
// ajuste; o aprovado fica pronto pro trafego.
export default async function Editados({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const [revisar, aprovados] = await Promise.all([producoes({ status: ["revisao"] }), producoes({ status: ["aprovado", "no_ar"] })]);
  const aba = a === "aprovados" ? "aprovados" : "revisar";
  const lista = aba === "revisar" ? revisar : aprovados;
  const mats = await materiaisDe(lista.map((p) => p.id));
  const hoje = hojeSP();

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <span className="area-num">Área 3</span>
          <h1>Editados</h1>
          <p className="sub">Os vídeos que o editor entregou. Assista, aprove ou peça ajuste. O aprovado fica pronto pra subir no tráfego.</p>
        </div>
      </div>

      <Abas
        base="/editados"
        atual={aba}
        abas={[
          { id: "revisar", rotulo: "Pra revisar", n: revisar.length },
          { id: "aprovados", rotulo: "Aprovados", n: aprovados.length },
        ]}
      />

      {!lista.length ? (
        <Vazio titulo={aba === "revisar" ? "Nenhum vídeo editado esperando revisão" : "Nada aprovado ainda"} />
      ) : (
        <div className="editados">
          {lista.map((p) => (
            <article key={p.id} className="item">
              <ItemCab p={p} hoje={hoje} />
              {p.hook && <p className="item-hook">{p.hook}</p>}
              <p className="item-angulo">
                Copy <b>{p.copy_nome ?? "—"}</b> · Edição <b>{p.editor_nome ?? "—"}</b>
              </p>
              <Editado p={p} mats={mats.get(p.id) ?? []} />
              <Passos p={p} papel={eu.papel} so={["aprovar", "ajustar", "subir"]} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
