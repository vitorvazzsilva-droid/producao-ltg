import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { avisos as listaAvisos, producoes } from "@/lib/dados";
import { nomeCurto, tempo } from "@/lib/producao-base";
import { db } from "@/lib/db";
import { GRUPOS, PRIORIDADES, STATUS, eMinhaVez, pesoPrioridade, type Papel, type Status } from "@/lib/fluxo";
import { Lado, estaParada, prioridadeDe } from "./card";
import { IcPrioridade, Icone } from "./icones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Início" };

// O painel da direita muda com a funcao: cada um ve as etapas dele.
const PAINEL: Record<Papel, { titulo: string; grupo: string; aprov: string; link: string; linkRot: string }> = {
  copy: { titulo: "Suas copies", grupo: "copy", aprov: "copy_revisao", link: "/copy", linkRot: "Ver as suas copies" },
  gravacao: { titulo: "Suas gravações", grupo: "experts", aprov: "gravar", link: "/esteira", linkRot: "Ver as suas gravações" },
  editor: { titulo: "Suas edições", grupo: "edicao", aprov: "revisao", link: "/esteira", linkRot: "Ver as suas edições" },
  trafego: { titulo: "Seu tráfego", grupo: "trafego", aprov: "aprovado", link: "/trafego", linkRot: "Ver o tráfego" },
  admin: { titulo: "Suas copies", grupo: "copy", aprov: "copy_revisao", link: "/copy", linkRot: "Ver as copies" },
};

function saudacao() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function hoje() {
  const s = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "short" })
    .format(new Date())
    .replace(".", "")
    .replace("-feira", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Inicio() {
  const eu = await quemSou();
  const painel = PAINEL[eu.papel];
  const grupo = GRUPOS.find((g) => g.id === painel.grupo)!;
  const [todas, avs, aprov] = await Promise.all([
    producoes({ status: GRUPOS.slice(0, 4).flatMap((g) => g.etapas) }),
    listaAvisos(eu.id, 8),
    db.execute({
      sql: `SELECT COUNT(DISTINCT producao_id) AS n FROM passagens WHERE de = ? AND criado_em >= datetime('now', 'weekday 1', '-7 days')
            ${eu.papel === "admin" ? "" : "AND (copy_id = ? OR editor_id = ? OR usuario_id = ?)"}`,
      args: eu.papel === "admin" ? [painel.aprov] : [painel.aprov, eu.id, eu.id, eu.id],
    }),
  ]);
  const novas = avs.filter((a) => !a.lido).length;

  const fila = todas
    .filter((p) => eMinhaVez(p, eu))
    .sort((a, b) => pesoPrioridade(prioridadeDe(b)) - pesoPrioridade(prioridadeDe(a)) || b.horas_etapa - a.horas_etapa);
  const primeiro = fila.filter((p) => ["alta", "urgente"].includes(prioridadeDe(p)));
  const resto = fila.filter((p) => !primeiro.includes(p));
  const minhas = eu.papel === "admin" ? todas : todas.filter((p) => [p.copy_id, p.editor_id, p.expert_id].includes(eu.id));

  const linha = (p: (typeof todas)[number]) => {
    const pri = prioridadeDe(p);
    return (
      <Link key={p.id} href={`/producao/${p.id}`} className="fila-i">
        <span className={"ce-pri pri-" + pri}>
          <IcPrioridade p={pri} />
        </span>
        <span className="mono b">{nomeCurto(p)}</span>
        <Lado lado={p.lado} />
        <span className={`pill st-${p.status}`}>{STATUS[p.status as Status]?.rotulo}</span>
        <span className="fila-hook">{p.hook ?? p.expert_nome ?? ""}</span>
        <span className={"fila-t" + (estaParada(p) ? " vermelho" : "")}>
          {estaParada(p) ? "parada " : ""}
          {tempo(p.horas_etapa)}
        </span>
        <span className="meta">{PRIORIDADES[pri]}</span>
        <Icone n="dir" s={15} />
      </Link>
    );
  };

  return (
    <div className="pagina inicio">
      <div className="inicio-g">
        <div className="inicio-esq">
          <div className="cab">
            <div>
              <h1>
                {saudacao()}, {eu.nome.split(" ")[0]}
              </h1>
              <p className="sub">
                {hoje()} · {fila.length ? `${fila.length} na sua fila` : "nada na sua fila"}
              </p>
            </div>
            <Link href="/esteira" className="btn sec-btn">
              <Icone n="esteira" /> Abrir a esteira
            </Link>
          </div>

          <h2 className="h2n">
            Primeiro <span className="meta">{primeiro.length}</span>
          </h2>
          {primeiro.length ? (
            <div className="fila">{primeiro.map(linha)}</div>
          ) : (
            <div className="caixa-trac">
              <Icone n="testes" /> Nada em Alta ou Urgente. Puxe da fila abaixo, de cima para baixo.
            </div>
          )}

          <div className="h2-linha">
            <h2 className="h2n">
              Na fila <span className="meta">{resto.length}</span>
            </h2>
            <Link href="/esteira" className="link-roxo">
              Ver a esteira <Icone n="dir" s={14} />
            </Link>
          </div>
          {resto.length ? <div className="fila">{resto.map(linha)}</div> : <div className="fila-vazia">Fila vazia.</div>}

          <div className="card atualiz">
            <div className="atualiz-hd">
              <b>Atualizações</b>
              <span className="meta">{novas ? `${novas} ${novas === 1 ? "nova" : "novas"}` : "nada novo"}</span>
              <span className="sp" />
              <Link href="/avisos" className="link-roxo">
                Ver todas <Icone n="dir" s={14} />
              </Link>
            </div>
            {avs.length ? (
              avs.map((a) => (
                <Link key={a.id} href={a.producao_id ? `/avisos/${a.id}` : "/avisos"} className={"atualiz-i" + (a.lido ? "" : " nova")}>
                  <i className="bola" />
                  <span className="atualiz-txt">
                    <b>{a.texto}</b>
                    {a.codigo && <span className="mono">{a.codigo}</span>}
                  </span>
                  <span className="meta">{tempo(Math.floor((Date.now() - new Date(a.criado_em.replace(" ", "T") + "Z").getTime()) / 3600000))}</span>
                  <Icone n="dir" s={15} />
                </Link>
              ))
            ) : (
              <div className="fila-vazia">Nenhuma atualização ainda.</div>
            )}
          </div>
        </div>

        <aside className="inicio-dir">
          <div className="card painel">
            <div className="painel-hd">
              <b className="sublinhado">{painel.titulo}</b>
              <span className="meta">agora</span>
            </div>
            {eu.papel === "copy" || eu.papel === "admin" ? (
              <div className="painel-l">
                <span>Briefing</span>
                <b>{minhas.filter((p) => p.status === "copy" && !p.copy?.trim()).length}</b>
                <i className="painel-b">
                  <i style={{ width: pct(minhas.filter((p) => p.status === "copy" && !p.copy?.trim()).length, minhas.length) }} />
                </i>
              </div>
            ) : null}
            {grupo.etapas.map((s) => {
              const n = minhas.filter((p) => p.status === s).length;
              return (
                <div key={s} className="painel-l">
                  <span>{STATUS[s].rotulo}</span>
                  <b>{n}</b>
                  <i className="painel-b">
                    <i style={{ width: pct(n, minhas.length) }} />
                  </i>
                </div>
              );
            })}
            <div className="painel-l painel-tot">
              <span className="sublinhado">Aprovadas nesta semana</span>
              <b>{Number(aprov.rows[0]?.n ?? 0)}</b>
            </div>
            <Link href={painel.link} className="link-roxo">
              {painel.linkRot} <Icone n="dir" s={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

const pct = (n: number, t: number) => `${t ? Math.round((n / t) * 100) : 0}%`;
