import { eu as quemSou } from "@/lib/sessao";
import { producoes, materiaisDe, hojeSP } from "@/lib/dados";
import { Abas, Brutos, ItemCab, Passos, Recado, TextoCopy } from "../areas";
import { Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gravação" };

// Area 2: quem grava pega a copy aqui, grava, cola o link do bruto e manda
// pro editor.
export default async function Gravacao({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const aba = a === "gravadas" ? "gravadas" : "gravar";
  const [pra, gravadas] = await Promise.all([
    producoes({ status: ["gravar"] }),
    producoes({ status: ["pronta", "edicao", "revisao", "ajustes", "aprovado", "no_ar"], comBruto: true }),
  ]);
  const lista = aba === "gravar" ? pra : gravadas.slice(0, 40);
  const mats = await materiaisDe(lista.map((p) => p.id));
  const grava = eu.papel === "admin" || eu.papel === "gravacao";
  const hoje = hojeSP();

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <span className="area-num">Área 2</span>
          <h1>Gravação</h1>
          <p className="sub">Pegue a copy, grave e cole o link do vídeo. Depois clique em “Gravei” e ele vai pro editor.</p>
        </div>
      </div>

      <Abas
        base="/gravacao"
        atual={aba}
        abas={[
          { id: "gravar", rotulo: "Pra gravar", n: pra.length },
          { id: "gravadas", rotulo: "Já gravadas", n: gravadas.length },
        ]}
      />

      {!lista.length ? (
        <Vazio titulo={aba === "gravar" ? "Nada pra gravar agora" : "Nada gravado ainda"}>
          {aba === "gravar" ? "Quando o copy mandar uma copy pra gravação, ela aparece aqui." : undefined}
        </Vazio>
      ) : (
        <div className="itens">
          {lista.map((p) => (
            <article key={p.id} className="item">
              <ItemCab p={p} hoje={hoje} />
              <div className={aba === "gravar" ? "grav-grade" : ""}>
                <div>
                  <Recado titulo="Recado pra gravação" texto={p.briefing_gravacao} />
                  <TextoCopy p={p} grande={aba === "gravar"} />
                </div>
                <div>
                  <Brutos p={p} mats={mats.get(p.id) ?? []} add={grava && aba === "gravar"} />
                  {aba === "gravar" && <Passos p={p} papel={eu.papel} so={["gravei", "ajustar_copy"]} />}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
