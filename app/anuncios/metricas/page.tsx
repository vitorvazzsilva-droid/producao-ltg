import { eu as quemSou } from "@/lib/sessao";
import { relatorios, usuarios } from "@/lib/dados";
import { diaSP, fmtRoi, janela } from "@/lib/relatorio";
import { VazioGrande } from "../../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Métricas" };

export default async function Metricas() {
  await quemSou();
  const [rs, gente] = await Promise.all([relatorios(diaSP(-30)), usuarios(true)]);
  const experts = gente.filter((g) => g.papel === "gravacao");
  const per = (dias: number, id: number) => janela(rs.filter((r) => r.expert_id === id && r.dia >= diaSP(-dias) && r.dia <= diaSP(-1)));
  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Métricas</h1>
          <p className="sub">ROI e vendas por expert, somando os relatórios do tráfego.</p>
        </div>
      </div>
      {rs.length ? (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Expert</th>
                <th>Ontem</th>
                <th>7 dias</th>
                <th>30 dias</th>
                <th>Vendas 30 dias</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((x) => {
                const a = per(1, x.id), b = per(7, x.id), c = per(30, x.id);
                return (
                  <tr key={x.id}>
                    <td className="b">{x.nome}</td>
                    <td>ROI {fmtRoi(a.roi)}</td>
                    <td>ROI {fmtRoi(b.roi)}</td>
                    <td>ROI {fmtRoi(c.roi)}</td>
                    <td>{c.vendas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <VazioGrande icone="testes" titulo="Sem métricas ainda" texto="As métricas saem dos relatórios que o tráfego envia em Testes do tráfego." />
      )}
    </div>
  );
}
