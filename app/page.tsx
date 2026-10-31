import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { producoes, hojeSP, contagens } from "@/lib/dados";
import { eMinhaVez, STATUS, type Status } from "@/lib/fluxo";
import { CardTarefa, CardVideo, Vazio } from "./pecas";

export const dynamic = "force-dynamic";

// O que cada funcao precisa fazer pra destravar a vez dela.
const DICA: Record<string, string> = {
  copy: "Escreva a copy e mande pro editor",
  pronta: "Pegue pra editar",
  edicao: "Suba o link da versão e mande pra revisão",
  ajustes: "Faça o ajuste pedido",
  revisao: "Assista e aprove ou peça ajustes",
  aprovado: "Suba no tráfego",
};

export default async function Inicio() {
  const eu = await quemSou();
  const hoje = hojeSP();
  const [todas, cont] = await Promise.all([producoes(), contagens()]);
  const minhas = todas.filter((p) => eMinhaVez(p, eu));
  const atrasadas = todas.filter((p) => p.prazo && p.prazo <= hoje && ["copy", "pronta", "edicao", "revisao", "ajustes"].includes(p.status));
  const recentes = todas.filter((p) => p.status === "aprovado" || p.status === "no_ar").slice(0, 6);

  // Agrupa a vez por etapa: o editor ve "pra pegar" separado de "em edicao".
  const porEtapa = new Map<string, typeof minhas>();
  for (const p of minhas) porEtapa.set(p.status, [...(porEtapa.get(p.status) ?? []), p]);

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <h1>Olá, {eu.nome.split(" ")[0]}</h1>
          <p className="sub">
            {minhas.length ? `${minhas.length} produç${minhas.length > 1 ? "ões esperando" : "ão esperando"} você.` : "Nada parado com você agora."}
          </p>
        </div>
      </div>

      <div className="kpis">
        {(["copy", "pronta", "edicao", "revisao", "ajustes", "aprovado"] as Status[]).map((s) => (
          <Link key={s} href={`/esteira?etapa=${s}`} className={`kpi st-${s}`}>
            <span className="kpi-n">{cont[s] ?? 0}</span>
            <span className="kpi-t">{STATUS[s].rotulo}</span>
          </Link>
        ))}
      </div>

      <section className="sec">
        <div className="sec-hd">
          <h2>Com você agora</h2>
          <span className="sec-n">{minhas.length}</span>
        </div>
        {minhas.length === 0 ? (
          <Vazio titulo="Tudo em dia">Quando alguém passar uma produção pra você, ela aparece aqui e no sino lá em cima.</Vazio>
        ) : (
          [...porEtapa.entries()].map(([s, lista]) => (
            <div key={s} className="grupo-vez">
              <div className="grupo-vez-t">
                <span className={`pill st-${s}`}>{STATUS[s as Status].rotulo}</span>
                <span>{DICA[s]}</span>
              </div>
              <div className="cts">
                {lista.map((p) => (
                  <CardTarefa key={p.id} p={p} hoje={hoje} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {atrasadas.length > 0 && (
        <section className="sec">
          <div className="sec-hd">
            <h2 className="vermelho">Prazo vencido ou pra hoje</h2>
            <span className="sec-n">{atrasadas.length}</span>
          </div>
          <div className="cts">
            {atrasadas.map((p) => (
              <CardTarefa key={p.id} p={p} hoje={hoje} />
            ))}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-hd">
          <h2>Aprovados recentes</h2>
          <Link href="/anuncios" className="lk">
            ver acervo
          </Link>
        </div>
        {recentes.length ? (
          <div className="grade">
            {recentes.map((p) => (
              <CardVideo key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <Vazio titulo="Nenhum criativo aprovado ainda" />
        )}
      </section>
    </div>
  );
}
