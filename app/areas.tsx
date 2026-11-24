import Link from "next/link";
import type { Material, Producao } from "@/lib/dados";
import { passosPara, podeExcluir, type Papel } from "@/lib/fluxo";
import { Excluir } from "./excluir";
import { baixar, player } from "@/lib/midia";
import { addMaterial, mudarEtapa, removerMaterial } from "./acoes";
import { Form } from "./form";
import { Icone } from "./icones";
import { Lado, Pill } from "./pecas";
import { Copiar } from "./producao/[id]/copiar";

// Pecas das telas de area (Copys, Gravacao, Edicao, Editados): cada area
// mostra o mesmo card de producao, so que com o pedaco que importa pra ela.

export function Abas({ base, atual, abas }: { base: string; atual: string; abas: { id: string; rotulo: string; n: number }[] }) {
  return (
    <div className="abas">
      {abas.map((a) => (
        <Link key={a.id} href={`${base}?aba=${a.id}`} className={"aba" + (atual === a.id ? " on" : "")}>
          {a.rotulo} <span>{a.n}</span>
        </Link>
      ))}
    </div>
  );
}

export function ItemCab({ p, hoje, eu }: { p: Producao; hoje: string; eu?: { id: number; papel: Papel } }) {
  const venceu = p.prazo && p.prazo < hoje;
  return (
    <div className="item-cab">
      <Lado lado={p.lado} />
      <Link href={`/producao/${p.id}`} className="mono item-cod">
        {p.codigo}
      </Link>
      <Pill status={p.status} />
      <span className="sp" />
      {p.prazo && (
        <span className={"item-prazo" + (venceu ? " vermelho" : p.prazo === hoje ? " amarelo" : "")}>
          {p.prazo === hoje ? "prazo hoje" : `${venceu ? "venceu" : "prazo"} ${p.prazo.slice(8, 10)}/${p.prazo.slice(5, 7)}`}
        </span>
      )}
      <Link href={`/producao/${p.id}`} className="lk">
        abrir card <Icone n="externo" s={13} />
      </Link>
      {eu && podeExcluir(p, eu) && <Excluir qual="producao" id={p.id} aviso="Excluir de vez?" />}
    </div>
  );
}

export function TextoCopy({ p, grande }: { p: Producao; grande?: boolean }) {
  return (
    <div className={"texto-copy" + (grande ? " grande" : "")}>
      <div className="texto-copy-hd">
        <span className="rot">Copy</span>
        <span className="sp" />
        {(p.hook || p.copy) && <Copiar texto={[p.hook, p.copy].filter(Boolean).join("\n\n")} />}
      </div>
      {p.hook && <p className="tc-hook">{p.hook}</p>}
      <pre className="tc-corpo">{p.copy ?? "A copy ainda não foi escrita."}</pre>
    </div>
  );
}

export function Recado({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div className="recado">
      <span className="rot">{titulo}</span>
      <pre>{texto}</pre>
    </div>
  );
}

export function Ajuste({ a, de }: { a?: { texto: string; autor: string | null }; de: string | null }) {
  if (!a) return null;
  return (
    <div className="alerta-ajuste">
      <b>
        O que mudar {de === "copy" ? "na copy" : "no vídeo"} — {a.autor}
      </b>
      <p>{a.texto}</p>
    </div>
  );
}

// Botoes de etapa da pessoa logada, com os pedidos de ajuste em gaveta.
export function Passos({ p, papel, so }: { p: Producao; papel: Papel; so?: string[] }) {
  const lista = passosPara(p, papel).filter((s) => (!so || so.includes(s.id)) && s.id !== "arquivar");
  if (!lista.length) return null;
  return (
    <div className="item-acoes">
      {lista.map((s) =>
        s.pedeTexto ? (
          <details key={s.id} className="acao-texto">
            <summary className="btn perigo">{s.rotulo}</summary>
            <Form acao={mudarEtapa}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="passo" value={s.id} />
              <textarea name="texto" rows={3} placeholder={s.pedeTexto} required />
              <button className="btn perigo">{s.rotulo}</button>
            </Form>
          </details>
        ) : (
          <Form key={s.id} acao={mudarEtapa} className="acao-f">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="passo" value={s.id} />
            <button className={"btn" + (s.principal ? "" : " sec-btn")}>{s.rotulo}</button>
          </Form>
        )
      )}
    </div>
  );
}

export function Brutos({ p, mats, add }: { p: Producao; mats: Material[]; add?: boolean }) {
  const brutos = mats.filter((m) => m.tipo === "bruto");
  return (
    <div className="area-bloco">
      <span className="rot">Vídeo gravado (bruto) · {brutos.length}</span>
      {brutos.length > 0 && (
        <ul className="brutos">
          {brutos.map((b, i) => (
            <li key={b.id}>
              <span className="mono">Parte {i + 1}</span>
              <a href={b.url} target="_blank" rel="noreferrer" className="lk">
                {b.rotulo ?? b.url.replace(/^https?:\/\//, "").slice(0, 44)}
              </a>
              <a href={baixar(b.url)} target="_blank" rel="noreferrer" className="lk">
                <Icone n="baixar" s={13} /> baixar
              </a>
              {add && (
                <Form acao={removerMaterial} className="inline">
                  <input type="hidden" name="material" value={b.id} />
                  <button className="lk lk-x">tirar</button>
                </Form>
              )}
            </li>
          ))}
        </ul>
      )}
      {!brutos.length && !add && <p className="dica">Sem vídeo gravado.</p>}
      {add && (
        <Form acao={addMaterial} className="add-link" limpar>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="tipo" value="bruto" />
          <input name="url" type="url" placeholder="Link do vídeo gravado (Google Drive)" required />
          <input name="rotulo" placeholder="Nome (ex.: take 2, b-roll)" />
          <button className="btn sec-btn">Adicionar vídeo</button>
        </Form>
      )}
    </div>
  );
}

export function Editado({ p, mats, add }: { p: Producao; mats: Material[]; add?: boolean }) {
  const versoes = mats.filter((m) => m.tipo === "versao");
  const atual = versoes[0];
  const pl = atual && player(atual.url);
  return (
    <div className="area-bloco">
      <span className="rot">Vídeo editado · {versoes.length ? `versão ${atual.versao}` : "nenhum ainda"}</span>
      {pl &&
        (pl.tipo === "iframe" ? (
          <iframe className="player" src={pl.src} allow="autoplay; fullscreen" allowFullScreen />
        ) : pl.tipo === "video" ? (
          <video className="player" src={pl.src} controls preload="metadata" />
        ) : (
          <a className="player player-link" href={pl.src} target="_blank" rel="noreferrer">
            <Icone n="externo" s={20} /> Abrir o vídeo
          </a>
        ))}
      {atual && (
        <div className="versao-linha">
          <span className="meta">
            v{atual.versao} · {atual.enviado_por_nome}
            {atual.rotulo ? ` · ${atual.rotulo}` : ""}
          </span>
          <span className="sp" />
          <a href={baixar(atual.url)} target="_blank" rel="noreferrer" className="lk">
            <Icone n="baixar" s={13} /> baixar
          </a>
        </div>
      )}
      {add && (
        <Form acao={addMaterial} className="add-link" limpar>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="tipo" value="versao" />
          <input name="url" type="url" placeholder="Link do vídeo editado" required />
          <input name="rotulo" placeholder="O que mudou (opcional)" />
          <button className="btn sec-btn">Entregar versão</button>
        </Form>
      )}
    </div>
  );
}
