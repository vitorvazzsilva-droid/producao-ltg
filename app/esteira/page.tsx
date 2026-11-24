import { eu as quemSou } from "@/lib/sessao";
import { producoes, usuarios } from "@/lib/dados";
import { db } from "@/lib/db";
import { ETAPAS, GRUPOS, STATUS } from "@/lib/fluxo";
import { estaParada } from "../card";
import { Icone } from "../icones";
import { Quadro } from "./quadro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esteira" };

const CORES_ETAPA = ["#5b47d6", "#8b7cf0", "#c4b9f7", "#e0a33a", "#f1c87a"];

export default async function Esteira() {
  const eu = await quemSou();
  const [lista, gente, subiram] = await Promise.all([
    producoes({ status: ETAPAS }),
    usuarios(true),
    db.execute("SELECT COUNT(*) AS n FROM producoes WHERE no_ar_em >= datetime('now', 'weekday 1', '-7 days')"),
  ]);
  const paradas = lista.filter(estaParada).length;
  const nSubiram = Number(subiram.rows[0]?.n ?? 0);

  return (
    <div className="pagina larga">
      <div className="cab">
        <div>
          <h1>Esteira</h1>
          <p className="sub">
            {lista.length} {lista.length === 1 ? "produção" : "produções"} · <span className="sublinhado">{paradas} paradas</span>. Arraste um card para
            mudar a etapa — se não der, o motivo aparece.
          </p>
        </div>
      </div>

      <div className="resumo">
        <div className="res-escuro">
          <span className="sublinhado">Na esteira agora</span>
          <b>{lista.length}</b>
          <small>
            <i className="bola vermelha" /> <span className="sublinhado">{paradas} paradas</span>
          </small>
          <small>
            <i className="bola verde" /> <span className="sublinhado">{nSubiram} anúncios subiram nesta semana</span>
          </small>
        </div>
        {GRUPOS.map((g) => {
          const doGrupo = lista.filter((p) => g.etapas.includes(p.status as (typeof g.etapas)[number]));
          const par = doGrupo.filter(estaParada).length;
          return (
            <div key={g.id} className="res-card">
              <div className="res-hd">
                <span className="res-ic" style={{ color: g.cor, background: g.cor + "1a" }}>
                  <Icone n={g.icone} />
                </span>
                <span>{g.rotulo}</span>
                <b>{doGrupo.length}</b>
              </div>
              <div className="res-barra">
                {g.etapas.map((s, i) => {
                  const n = doGrupo.filter((p) => p.status === s).length;
                  return n ? (
                    <i
                      key={s}
                      title={`${STATUS[s].rotulo}: ${n}`}
                      style={{ flex: n, background: g.id === "trafego" ? (i ? "#1d8a4b" : "#7bc59a") : g.id === "fora" ? "#bdb8c9" : i === 0 ? g.cor : CORES_ETAPA[i] }}
                    />
                  ) : null;
                })}
              </div>
              <div className={"res-pe" + (par ? " vermelho" : "")}>
                {par > 0 && <Icone n="relogio" s={13} />}
                {g.etapas.length} {g.etapas.length === 1 ? "etapa" : "etapas"} · {par ? `${par} ${par === 1 ? "parada" : "paradas"}` : "nada parado"}
              </div>
            </div>
          );
        })}
      </div>

      <Quadro
        lista={lista}
        eu={eu}
        pessoas={gente.map((g) => ({ id: g.id, nome: g.nome, papel: g.papel }))}
        filtros={["copywriter", "expert", "editor", "tipo"]}
        chave="esteira"
      />
    </div>
  );
}
