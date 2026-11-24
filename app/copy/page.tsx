import { eu as quemSou } from "@/lib/sessao";
import { producoes, usuarios } from "@/lib/dados";
import { db } from "@/lib/db";
import { GRUPOS } from "@/lib/fluxo";
import { Quadro } from "../esteira/quadro";
import { Stat, VazioGrande } from "../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Copy" };

const ETAPAS = GRUPOS[0].etapas;

export default async function Copy() {
  const eu = await quemSou();
  const [lista, gente, aprov] = await Promise.all([
    producoes({ status: [...ETAPAS] }),
    usuarios(true),
    // 1a aprovacao da copy, de segunda ate hoje
    db.execute(
      `SELECT COUNT(DISTINCT producao_id) AS n FROM passagens WHERE de = 'copy_revisao' AND para NOT IN ('copy_reajuste', 'arquivado', 'bloqueado')
       AND criado_em >= datetime('now', 'weekday 1', '-7 days')`
    ),
  ]);
  const n = (s: string) => lista.filter((p) => p.status === s).length;
  const escrevendo = new Set(lista.filter((p) => p.status === "copy" && p.copy_id).map((p) => p.copy_id)).size;
  const total = lista.length || 1;

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Copy</h1>
          <p className="sub">
            Do briefing à copy aprovada · <span className="sublinhado">{lista.length} abertas</span>
          </p>
        </div>
      </div>
      <div className="stats">
        <Stat rotulo="Escrevendo a copy" n={n("copy")} barra={(n("copy") / total) * 100} nota={escrevendo ? `${escrevendo} ${escrevendo === 1 ? "pessoa escrevendo" : "pessoas escrevendo"} agora.` : "Ninguém escrevendo agora."} />
        <Stat rotulo="Copy em revisão" n={n("copy_revisao")} barra={(n("copy_revisao") / total) * 100} nota={n("copy_revisao") ? "Esperando o líder aprovar." : "Nenhuma copy em revisão."} />
        <Stat rotulo="Reajuste de copy" n={n("copy_reajuste")} barra={(n("copy_reajuste") / total) * 100} nota={n("copy_reajuste") ? "Voltaram pra ajustar." : "Nenhuma copy voltou para reajuste."} />
        <Stat rotulo="Aprovadas esta semana" n={Number(aprov.rows[0]?.n ?? 0)} nota="1ª aprovação, de segunda até hoje" />
      </div>
      {lista.length ? (
        <Quadro lista={lista} eu={eu} pessoas={gente} grupos={["copy"]} filtros={["expert", "tipo"]} minhas chave="copy" />
      ) : (
        <VazioGrande
          titulo="Nada na copy agora"
          texto="Quando uma produção nova for criada, ela aparece aqui para alguém escrever a copy."
          acao={eu.papel === "admin" || eu.papel === "copy" ? { href: "/nova", rotulo: "Criar produção" } : undefined}
        />
      )}
    </div>
  );
}
