import { eu as quemSou } from "@/lib/sessao";
import { contaVideos, usuarios, videos } from "@/lib/dados";
import { Acervo } from "./acervo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anúncios" };

type Q = { ver?: string; aba?: string };

// Acervo: o bruto e cada versao pronta de cada producao, num lugar so.
export default async function Anuncios({ searchParams }: { searchParams: Promise<Q> }) {
  await quemSou();
  const q = await searchParams;
  const ver = q.ver === "bruto" ? "bruto" : "versao";
  const [lista, conta, gente] = await Promise.all([videos(ver), contaVideos(), usuarios(true)]);
  return (
    <div className="pagina larga">
      <Acervo
        lista={lista}
        ver={ver}
        conta={conta}
        aba={q.aba === "criativos" || q.aba === "lateralizacoes" ? q.aba : "tudo"}
        experts={gente.filter((g) => g.papel === "gravacao").map((g) => ({ id: g.id, nome: g.nome }))}
      />
    </div>
  );
}
