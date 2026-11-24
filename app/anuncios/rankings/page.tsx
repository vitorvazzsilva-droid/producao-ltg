import { eu as quemSou } from "@/lib/sessao";
import { relatorios } from "@/lib/dados";
import { criativosDe, diaSP, fmtRoi } from "@/lib/relatorio";
import { VazioGrande } from "../../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rankings" };

// Ranking dos criativos pelo ROI que o trafego reportou (ultimos 30 dias).
export default async function Rankings() {
  await quemSou();
  const rs = await relatorios(diaSP(-30));
  const m = new Map<string, { roi: number; dias: number; ultimo: string }>();
  for (const r of rs)
    for (const c of criativosDe(r.criativos)) {
      if (c.roi === null) continue;
      const a = m.get(c.codigo);
      m.set(c.codigo, { roi: Math.max(a?.roi ?? -Infinity, c.roi), dias: (a?.dias ?? 0) + 1, ultimo: a && a.ultimo > r.dia ? a.ultimo : r.dia });
    }
  const lista = [...m.entries()].sort((a, b) => b[1].roi - a[1].roi);
  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Rankings</h1>
          <p className="sub">Os criativos com melhor ROI nos relatórios do tráfego dos últimos 30 dias.</p>
        </div>
      </div>
      {lista.length ? (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Criativo</th>
                <th>Melhor ROI</th>
                <th>Dias no relatório</th>
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(([c, v], i) => (
                <tr key={c}>
                  <td className="meta">{i + 1}</td>
                  <td className="mono b">{c}</td>
                  <td>ROI {fmtRoi(v.roi)}</td>
                  <td>{v.dias}</td>
                  <td className="meta">
                    {v.ultimo.slice(8, 10)}/{v.ultimo.slice(5, 7)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <VazioGrande icone="trofeu" titulo="Sem ranking ainda" texto="Quando o tráfego enviar os relatórios em Testes do tráfego, os criativos aparecem aqui por ROI." />
      )}
    </div>
  );
}
