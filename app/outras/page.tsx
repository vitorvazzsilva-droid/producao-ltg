import { eu as quemSou } from "@/lib/sessao";
import { producoes, usuarios } from "@/lib/dados";
import { ETAPAS, TIPOS } from "@/lib/fluxo";
import { Quadro } from "../esteira/quadro";
import { VazioGrande } from "../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outras produções" };

const TITULO: Record<string, string> = { lateralizacao: "Lateralizações", aula: "Aulas", vsl: "VSLs", organico: "Orgânicos" };

// Tudo que nao e anuncio: a mesma esteira, so que de um tipo.
export default async function Outras({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const eu = await quemSou();
  const { tipo: t } = await searchParams;
  const tipo = t && t in TITULO ? t : "lateralizacao";
  const [lista, gente] = await Promise.all([producoes({ status: ETAPAS, tipo }), usuarios(true)]);
  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>{TITULO[tipo]}</h1>
          <p className="sub">
            {lista.length} {lista.length === 1 ? "produção" : "produções"} do tipo {TIPOS[tipo as keyof typeof TIPOS]}, da copy ao tráfego.
          </p>
        </div>
      </div>
      {lista.length ? (
        <Quadro lista={lista} eu={eu} pessoas={gente} filtros={["copywriter", "expert", "editor"]} chave={"outras-" + tipo} />
      ) : (
        <VazioGrande titulo={`Nenhuma ${TITULO[tipo].toLowerCase().replace(/s$/, "")} agora`} texto="Crie uma produção e escolha esse tipo em Nova produção." acao={{ href: "/nova", rotulo: "Criar produção" }} />
      )}
    </div>
  );
}
