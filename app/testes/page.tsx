import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes } from "@/lib/dados";
import { RESULTADOS } from "@/lib/fluxo";
import { CardVideo, Vazio } from "../pecas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Testes do tráfego" };

// O que subiu no trafego, separado pelo resultado: vencedor vira molde pra
// proxima copy.
export default async function Testes({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await quemSou();
  const { r } = await searchParams;
  const filtro = r && r in RESULTADOS ? r : undefined;
  const lista = await producoes({ status: ["no_ar"], resultado: filtro });

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Testes do tráfego</h1>
          <p className="sub">Tudo que subiu. Marque o resultado no card pra equipe saber o que repetir.</p>
        </div>
      </div>
      <div className="abas">
        <Link href="/testes" className={"aba" + (!filtro ? " on" : "")}>
          Todos
        </Link>
        {Object.entries(RESULTADOS).map(([k, v]) => (
          <Link key={k} href={`/testes?r=${k}`} className={"aba" + (filtro === k ? " on" : "")}>
            {v}
          </Link>
        ))}
      </div>
      {lista.length ? (
        <div className="grade">
          {lista.map((p) => (
            <CardVideo key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <Vazio titulo="Nada no ar ainda">Quando o tráfego clicar em “Subiu no tráfego” num aprovado, ele aparece aqui.</Vazio>
      )}
    </div>
  );
}
