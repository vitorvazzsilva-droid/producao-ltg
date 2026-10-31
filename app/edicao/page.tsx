import { eu as quemSou } from "@/lib/sessao";
import { producoes, materiaisDe, ajustesDe, hojeSP } from "@/lib/dados";
import { Abas, Ajuste, Brutos, Editado, ItemCab, Passos, Recado, TextoCopy } from "../areas";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edição" };

// Area 3: o editor pega o bruto gravado, edita e entrega o link do editado.
export default async function Edicao({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const todas = await producoes({ status: ["pronta", "edicao", "ajustes"] });
  const pegar = todas.filter((p) => p.status === "pronta");
  const editando = todas.filter((p) => p.status === "edicao" || (p.status === "ajustes" && p.ajuste_de !== "copy"));
  // Editor ve primeiro o que e dele.
  const meu = (p: { editor_id: number | null }) => (p.editor_id === eu.id ? 0 : 1);
  editando.sort((x, y) => meu(x) - meu(y));
  const aba = a === "editando" ? "editando" : "pegar";
  const lista = aba === "pegar" ? pegar : editando;
  const [mats, ajustes] = await Promise.all([materiaisDe(lista.map((p) => p.id)), ajustesDe(lista.map((p) => p.id))]);
  const edita = eu.papel === "admin" || eu.papel === "editor";
  const hoje = hojeSP();

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <span className="area-num">Área 3</span>
          <h1>Edição</h1>
          <p className="sub">O editor pega o vídeo gravado, edita e entrega o link. O editado vai pra área Editados.</p>
        </div>
      </div>

      <Abas
        base="/edicao"
        atual={aba}
        abas={[
          { id: "pegar", rotulo: "Pra pegar", n: pegar.length },
          { id: "editando", rotulo: "Editando", n: editando.length },
        ]}
      />

      {!lista.length ? (
        <Vazio titulo={aba === "pegar" ? "Nenhum vídeo gravado esperando" : "Nada em edição"}>
          {aba === "pegar" ? "Quando alguém clicar em “Gravei”, o vídeo aparece aqui pra pegar." : undefined}
        </Vazio>
      ) : (
        <div className="itens">
          {lista.map((p) => (
            <article key={p.id} className="item">
              <ItemCab p={p} hoje={hoje} />
              {aba === "editando" && (
                <p className="item-angulo">
                  Editor <b>{p.editor_nome ?? "—"}</b>
                  {p.editor_id === eu.id ? " (você)" : ""}
                </p>
              )}
              <Ajuste a={ajustes.get(p.id)} de={p.ajuste_de} />
              <div className="grav-grade">
                <div>
                  <Brutos p={p} mats={mats.get(p.id) ?? []} />
                  <Recado titulo="Recado pra edição" texto={p.briefing} />
                  <details className="copy-gaveta">
                    <summary>Ver a copy</summary>
                    <TextoCopy p={p} />
                  </details>
                </div>
                <div>
                  {aba === "editando" && <Editado p={p} mats={mats.get(p.id) ?? []} add={edita} />}
                  <Passos p={p} papel={eu.papel} so={["pegar", "revisar", "ajustar_copy"]} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
