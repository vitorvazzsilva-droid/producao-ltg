import { eu as quemSou } from "@/lib/sessao";
import { producoes, usuarios } from "@/lib/dados";
import { db } from "@/lib/db";
import { Quadro } from "../esteira/quadro";
import { Stat, VazioGrande } from "../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tráfego" };

export default async function Trafego() {
  const eu = await quemSou();
  const [lista, gente, sem] = await Promise.all([
    producoes({ status: ["aprovado", "no_ar"] }),
    usuarios(true),
    db.execute("SELECT COUNT(*) AS n FROM producoes WHERE no_ar_em >= datetime('now', 'weekday 1', '-7 days')"),
  ]);
  const aprov = lista.filter((p) => p.status === "aprovado").length;
  const noAr = lista.filter((p) => p.status === "no_ar").length;
  const venc = lista.filter((p) => p.resultado === "vencedor").length;
  const total = lista.length || 1;

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Tráfego</h1>
          <p className="sub">
            Do aprovado ao no ar · <span className="sublinhado">{aprov} esperando subir</span>
          </p>
        </div>
      </div>
      <div className="stats">
        <Stat rotulo="Aprovado" n={aprov} barra={(aprov / total) * 100} nota={aprov ? "Prontos pra subir na Meta." : "Nada esperando subir."} />
        <Stat rotulo="No ar" n={noAr} barra={(noAr / total) * 100} nota="Rodando no tráfego agora." />
        <Stat rotulo="Subiram esta semana" n={Number(sem.rows[0]?.n ?? 0)} nota="De segunda até hoje" />
        <Stat rotulo="Vencedores" n={venc} nota="Marcados como vencedor no tráfego" />
      </div>
      {lista.length ? (
        <Quadro lista={lista} eu={eu} pessoas={gente} grupos={["trafego"]} filtros={["expert", "editor", "tipo"]} minhas={eu.papel !== "trafego" && eu.papel !== "admin"} chave="trafego" />
      ) : (
        <VazioGrande icone="megafone" titulo="Nada no tráfego agora" texto="Quando um vídeo for aprovado na edição, ele aparece aqui para subir." />
      )}
    </div>
  );
}
