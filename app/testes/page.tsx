import { eu as quemSou } from "@/lib/sessao";
import { relatorios, usuarios } from "@/lib/dados";
import { diaSP, fmtRoi, janela, topCriativos } from "@/lib/relatorio";
import { Relatar } from "./relatar";
import { VazioGrande } from "../stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Testes do tráfego" };

export default async function Testes() {
  const eu = await quemSou();
  const ontem = diaSP(-1);
  const desde = diaSP(-7);
  const [rs, gente] = await Promise.all([relatorios(desde), usuarios(true)]);
  const experts = gente.filter((g) => g.papel === "gravacao");
  const podeRelatar = eu.papel === "admin" || eu.papel === "trafego";

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Testes do tráfego</h1>
          <p className="sub">Por expert: o resultado de ontem e da semana, o que mais performou e os testes que o tráfego está fazendo.</p>
        </div>
        {podeRelatar && experts.length > 0 && <Relatar experts={experts.map((x) => ({ id: x.id, nome: x.nome }))} ontem={ontem} />}
      </div>

      {!experts.length ? (
        <VazioGrande icone="megafone" titulo="Nenhum expert cadastrado" texto="Cadastre os experts em Equipe (função Expert) pra cada um ganhar o seu relatório aqui." />
      ) : (
        <div className="rel-grade">
          {experts.map((x) => {
            const dele = rs.filter((r) => r.expert_id === x.id);
            const o = janela(dele.filter((r) => r.dia === ontem));
            const s = janela(dele.filter((r) => r.dia >= desde && r.dia <= ontem));
            const top = topCriativos(dele);
            const testes = dele.filter((r) => r.testes?.trim());
            return (
              <div key={x.id} className="card rel">
                <div className="rel-hd">
                  <span className="mono rel-sg">{(x.sigla || x.nome.slice(0, 4)).toUpperCase()}</span>
                  <b>{x.nome}</b>
                  {dele[0]?.autor && <span className="meta">tráfego: {dele[0].autor}</span>}
                </div>
                <div className="rel-nums">
                  <div>
                    <small>Ontem</small>
                    <b>ROI {fmtRoi(o.roi)}</b>
                    <span className="meta">{o.vendas} vendas</span>
                  </div>
                  <div>
                    <small>Últimos 7 dias</small>
                    <b>ROI {fmtRoi(s.roi)}</b>
                    <span className="meta">{s.vendas} vendas</span>
                  </div>
                </div>
                <div className="rel-t">Criativos que mais performaram</div>
                {top.length ? (
                  top.map(([c, roi]) => (
                    <div key={c} className="rel-c">
                      <span className="mono">{c}</span>
                      <span>ROI {fmtRoi(roi)}</span>
                    </div>
                  ))
                ) : (
                  <p className="meta">Nenhum criativo no relatório da semana.</p>
                )}
                <div className="rel-t">Testes do tráfego</div>
                {testes.length ? (
                  testes.slice(0, 3).map((r) => (
                    <p key={r.id} className="rel-teste">
                      <span className="meta">{r.dia.slice(8, 10)}/{r.dia.slice(5, 7)}</span> {r.testes}
                    </p>
                  ))
                ) : (
                  <p className="meta">Nenhum relatório enviado na semana.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
