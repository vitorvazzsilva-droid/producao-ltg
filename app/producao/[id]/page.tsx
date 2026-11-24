import Link from "next/link";
import { notFound } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { producao, materiais, comentarios, usuarios, quando, hojeSP, tags, tagsDe } from "@/lib/dados";
import { Chip, prioridadeDe } from "../../card";
import { passosPara, eMinhaVez, podeEditarCopy, podeExcluir, grupoDe, LADOS, TIPOS, RESULTADOS, PAPEIS, PRIORIDADES, FORMATOS_GRAVACAO, type Papel } from "@/lib/fluxo";
import { player, baixar } from "@/lib/midia";
import { addMaterial, marcarResultado, mudarEtapa, removerMaterial, salvarCopy, salvarFicha } from "../../acoes";
import { Form } from "../../form";
import { Icone } from "../../icones";
import { Lado, Pill, Resultado } from "../../pecas";
import { Copiar } from "./copiar";
import { Comentar } from "./comentar";
import { Excluir } from "../../excluir";

// Realca @usuario dentro do comentario.
function ComMencao({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(@[\w.]+)/g).map((t, i) =>
        t.startsWith("@") ? (
          <span key={i} className="mencao">
            {t}
          </span>
        ) : (
          t
        )
      )}
    </>
  );
}

export const dynamic = "force-dynamic";

// A trilha do topo volta pra area onde a producao esta agora.
// A trilha do topo volta pra tela do grupo onde a producao esta agora.
const trilha = (s: string) => {
  const g = grupoDe(s)?.id;
  return g === "copy" ? { href: "/copy", rot: "Copy" } : g === "trafego" ? { href: "/trafego", rot: "Tráfego" } : { href: "/esteira", rot: "Esteira" };
};

function Player({ url }: { url: string }) {
  const p = player(url);
  if (p.tipo === "iframe") return <iframe className="player" src={p.src} allow="autoplay; fullscreen" allowFullScreen />;
  if (p.tipo === "video") return <video className="player" src={p.src} controls preload="metadata" />;
  return (
    <a className="player player-link" href={p.src} target="_blank" rel="noreferrer">
      <Icone n="externo" s={20} /> Abrir o vídeo
    </a>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await producao(Number((await params).id));
  return { title: p?.codigo ?? "Produção" };
}

export default async function Detalhe({ params }: { params: Promise<{ id: string }> }) {
  const eu = await quemSou();
  const id = Number((await params).id);
  const p = await producao(id);
  if (!p) notFound();
  const [mats, conversa, gente, todasTags] = await Promise.all([materiais(id), comentarios(id), usuarios(true), tags()]);

  const versoes = mats.filter((m) => m.tipo === "versao");
  const brutos = mats.filter((m) => m.tipo === "bruto");
  const passos = passosPara(p, eu.papel);
  const escreve = podeEditarCopy(p, eu.papel);
  const fichaEditavel = eu.papel === "admin" || eu.papel === "copy";
  const sobeVersao = eu.papel === "admin" || eu.papel === "editor";
  const marcaResultado = eu.papel === "admin" || eu.papel === "trafego";
  const conversa_ = conversa.filter((c) => c.tipo !== "evento");
  const historico = conversa.filter((c) => c.tipo === "evento").reverse();
  const minhaVez = eMinhaVez(p, eu);
  const ajustesAbertos = p.status === "ajustes" ? conversa.filter((c) => c.tipo === "ajuste").slice(-1) : [];
  const hoje = hojeSP();

  return (
    <div className="pagina larga">
      <div className="det-cab">
        <div className="trilha">
          <Link href={trilha(p.status).href}>{trilha(p.status).rot}</Link> <span>›</span> <Pill status={p.status} />
          {minhaVez && <span className="sua-vez">sua vez</span>}
        </div>
        <h1 className="mono det-cod">
          {p.codigo} <small>{TIPOS[p.tipo as keyof typeof TIPOS]}</small>
        </h1>
        <div className="det-resumo">
          <Lado lado={p.lado} />
          <span>
            Expert <b>{p.expert_nome ?? "—"}</b>
          </span>
          <span>
            Copy <b>{p.copy_nome ?? "—"}</b>
          </span>
          <span>
            Editor <b>{p.editor_nome ?? "quem pegar"}</b>
          </span>
          {p.prazo && (
            <span className={p.prazo < hoje && !["aprovado", "no_ar"].includes(p.status) ? "vermelho" : p.prazo === hoje ? "amarelo" : ""}>
              Prazo <b>{p.prazo === hoje ? "hoje" : `${p.prazo.slice(8, 10)}/${p.prazo.slice(5, 7)}`}</b>
            </span>
          )}
        </div>
      </div>

      {ajustesAbertos.map((a) => (
        <div key={a.id} className="alerta-ajuste">
          <b>
            O que precisa mudar {p.ajuste_de === "copy" ? "na copy" : "no vídeo"} — pedido por {a.autor}
          </b>
          <p>{a.texto}</p>
        </div>
      ))}

      {(passos.length > 0 || podeExcluir(p, eu)) && (
        <div className="acoes">
          {passos.map((s) =>
            s.pedeTexto ? (
              <details key={s.id} className="acao-texto">
                <summary className="btn perigo">{s.rotulo}</summary>
                <Form acao={mudarEtapa}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="passo" value={s.id} />
                  <textarea name="texto" rows={4} placeholder={s.pedeTexto} required />
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
          {podeExcluir(p, eu) && (
            <span className="excluir-fim">
              <Excluir
                qual="producao"
                id={p.id}
                voltar="/"
                grande
                rotulo="Excluir criativo"
                aviso="Apaga a copy, os vídeos, comentários e histórico. Não tem volta."
              />
            </span>
          )}
        </div>
      )}

      <div className="det">
        <div className="det-esq">
          {/* Versoes editadas: a ultima toca grande, as anteriores ficam abaixo. */}
          <section className="bloco">
            <div className="bloco-hd">
              <Icone n="video" />
              <h2>Versões editadas</h2>
              <span className="bloco-n">{versoes.length}</span>
            </div>
            {versoes.length === 0 ? (
              <p className="dica">Nenhuma versão ainda. O editor cola aqui o link do vídeo editado (Google Drive, YouTube não listado, Loom ou Dropbox).</p>
            ) : (
              <div className="versoes">
                {versoes.map((v, i) => (
                  <div key={v.id} className={"versao" + (i === 0 ? " atual" : "")}>
                    <div className="versao-hd">
                      <b>Versão {v.versao}</b>
                      {i === 0 && <span className="tag-atual">mais recente</span>}
                      <span className="meta">
                        {v.enviado_por_nome} · {quando(v.criado_em)}
                      </span>
                      <span className="sp" />
                      <a href={v.url} target="_blank" rel="noreferrer" className="lk">
                        <Icone n="externo" s={13} /> abrir
                      </a>
                      <a href={baixar(v.url)} target="_blank" rel="noreferrer" className="lk">
                        <Icone n="baixar" s={13} /> baixar
                      </a>
                      <Form acao={removerMaterial} className="inline">
                        <input type="hidden" name="material" value={v.id} />
                        <button className="lk lk-x" title="Tirar esta versão">
                          tirar
                        </button>
                      </Form>
                    </div>
                    {v.rotulo && <p className="versao-nota">{v.rotulo}</p>}
                    {i === 0 && <Player url={v.url} />}
                  </div>
                ))}
              </div>
            )}
            {sobeVersao && (
              <Form acao={addMaterial} className="add-link" limpar>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="tipo" value="versao" />
                <input name="url" type="url" placeholder="Link da versão editada" required />
                <input name="rotulo" placeholder="O que mudou (opcional)" />
                <button className="btn sec-btn">Subir versão</button>
              </Form>
            )}
          </section>

          <section className="bloco">
            <div className="bloco-hd">
              <Icone n="baixar" />
              <h2>Vídeo gravado (bruto)</h2>
              <span className="bloco-n">{brutos.length}</span>
            </div>
            {brutos.length === 0 ? (
              <p className="dica">Gravações, b-rolls, prints, músicas — o que o editor precisa pra montar.</p>
            ) : (
              <ul className="brutos">
                {brutos.map((b, i) => (
                  <li key={b.id}>
                    <span className="mono">Parte {i + 1}</span>
                    <a href={b.url} target="_blank" rel="noreferrer" className="lk">
                      {b.rotulo ?? b.url.replace(/^https?:\/\//, "").slice(0, 48)}
                    </a>
                    <span className="meta">{b.enviado_por_nome}</span>
                    <a href={baixar(b.url)} target="_blank" rel="noreferrer" className="lk">
                      baixar
                    </a>
                    <Form acao={removerMaterial} className="inline">
                      <input type="hidden" name="material" value={b.id} />
                      <button className="lk lk-x">tirar</button>
                    </Form>
                  </li>
                ))}
              </ul>
            )}
            <Form acao={addMaterial} className="add-link" limpar>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="tipo" value="bruto" />
              <input name="url" type="url" placeholder="Link do material (pasta ou arquivo)" required />
              <input name="rotulo" placeholder="Nome (ex.: b-roll praia)" />
              <button className="btn sec-btn">Adicionar</button>
            </Form>
          </section>

          <section className="bloco" id="copy">
            <div className="bloco-hd">
              <Icone n="copy" />
              <h2>Copy</h2>
              <span className="sp" />
              {p.copy && <Copiar texto={[p.hook, p.copy].filter(Boolean).join("\n\n")} />}
            </div>
            {escreve ? (
              <Form acao={salvarCopy} className="form-copy" feito="Copy salva">
                <input type="hidden" name="id" value={p.id} />
                <label>
                  Hook (primeiros 3 segundos)
                  <input name="hook" defaultValue={p.hook ?? ""} placeholder="A frase que segura o dedo" />
                </label>
                <label>
                  Roteiro
                  <textarea name="copy" rows={12} defaultValue={p.copy ?? ""} placeholder="A copy inteira, do hook ao CTA" />
                </label>
                <label>
                  Recado pra gravação
                  <textarea name="briefing_gravacao" rows={3} defaultValue={p.briefing_gravacao ?? ""} placeholder="Tom, cenário, roupa, o que mostrar…" />
                </label>
                <label>
                  Recado pra edição
                  <textarea
                    name="briefing"
                    rows={4}
                    defaultValue={p.briefing ?? ""}
                    placeholder="Ritmo, legenda, inserções, música, o que NÃO fazer…"
                  />
                </label>
                <button className="btn">Salvar copy</button>
              </Form>
            ) : (
              <div className="copy-ler">
                {eu.papel === "copy" && <p className="trava">A copy fica travada fora de “Em copy” e “Ajustes pedidos”.</p>}
                {p.briefing_gravacao && (
                  <div className="briefing briefing-topo">
                    <b>Recado pra gravação</b>
                    <pre>{p.briefing_gravacao}</pre>
                  </div>
                )}
                {p.briefing && (
                  <div className="briefing briefing-topo">
                    <b>Recado pra edição</b>
                    <pre>{p.briefing}</pre>
                  </div>
                )}
                {p.hook && <p className="copy-hook">{p.hook}</p>}
                <pre className="copy-texto">{p.copy ?? "A copy ainda não foi escrita."}</pre>
              </div>
            )}
          </section>

          <section className="bloco">
            <div className="bloco-hd">
              <h2>Comentários</h2>
              <span className="bloco-n">{conversa_.length}</span>
            </div>
            {conversa_.length === 0 && <p className="dica" style={{ marginBottom: 12 }}>Ninguém comentou ainda.</p>}
            <ol className="conversa">
              {conversa_.map((c) => (
                <li key={c.id} className={"msg msg-" + c.tipo}>
                  <div className="msg-hd">
                    <b>{c.autor}</b>
                    <span className="meta">{c.papel ? PAPEIS[c.papel as Papel] : ""}</span>
                    {c.tipo === "ajuste" && <span className="pill st-ajustes">o que precisa mudar</span>}
                    <span className="meta">{quando(c.criado_em)}</span>
                    {(eu.papel === "admin" || c.usuario_id === eu.id) && <Excluir qual="comentario" id={c.id} rotulo="apagar" />}
                  </div>
                  <p>
                    <ComMencao texto={c.texto} />
                  </p>
                </li>
              ))}
            </ol>
            <Comentar id={p.id} gente={gente.filter((u) => u.id !== eu.id).map((u) => ({ login: u.login, nome: u.nome, papel: PAPEIS[u.papel as Papel] }))} />
          </section>

          <section className="bloco">
            <div className="bloco-hd">
              <h2>Histórico</h2>
              <span className="bloco-n">{historico.length}</span>
            </div>
            <ol className="historico">
              {historico.map((c) => (
                <li key={c.id}>
                  <span className="meta">{quando(c.criado_em)}</span>
                  <span>
                    <b>{c.autor ?? "sistema"}</b> {c.texto}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="det-dir">
          <section className="bloco">
            <div className="bloco-hd">
              <h2>Referência</h2>
            </div>
            {p.referencia_url ? (
              <a className="ref" href={p.referencia_url} target="_blank" rel="noreferrer">
                <span className="ref-play">
                  <Icone n="play" />
                </span>
                <span>
                  <b>Criativo de referência</b>
                  <small>{new URL(p.referencia_url).hostname.replace("www.", "")}</small>
                </span>
                <Icone n="externo" s={14} />
              </a>
            ) : (
              !p.referencia_img && <p className="dica">Sem referência.</p>
            )}
            {p.referencia_img && (
              <a className="ref-img" href={p.referencia_img} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.referencia_img} alt="Print de referência" />
              </a>
            )}
          </section>

          <section className="bloco">
            <div className="bloco-hd">
              <h2>Ficha</h2>
            </div>
            <dl className="ficha">
              <dt>Lado</dt>
              <dd>
                <Lado lado={p.lado} />
              </dd>
              <dt>Oferta</dt>
              <dd>{p.oferta_nome ?? p.oferta}</dd>
              <dt>Expert</dt>
              <dd>{p.expert_nome ?? "—"}</dd>
              <dt>Prioridade</dt>
              <dd>
                {PRIORIDADES[prioridadeDe(p)]}
                {prioridadeDe(p) !== (p.prioridade ?? "media") && <span className="meta"> (subiu com o tempo parado)</span>}
              </dd>
              <dt>Tags</dt>
              <dd className="ce-chips">{tagsDe(p).length ? tagsDe(p).map((t) => <Chip key={t.nome} nome={t.nome} cor={t.cor} />) : "—"}</dd>
              <dt>Gravação</dt>
              <dd>{p.formato_gravacao ? FORMATOS_GRAVACAO[p.formato_gravacao as keyof typeof FORMATOS_GRAVACAO] : "—"}</dd>
              <dt>Tipo</dt>
              <dd>{TIPOS[p.tipo as keyof typeof TIPOS]}</dd>
              <dt>Formato</dt>
              <dd>{p.formato ? <span className="formato">{p.formato}</span> : "—"}</dd>
              <dt>Copy</dt>
              <dd>{p.copy_nome ?? "—"}</dd>
              <dt>Editor</dt>
              <dd>{p.editor_nome ?? "—"}</dd>
              <dt>Prazo</dt>
              <dd className={p.prazo && p.prazo < hoje && !["aprovado", "no_ar"].includes(p.status) ? "vermelho" : ""}>
                {p.prazo ? `${p.prazo.slice(8, 10)}/${p.prazo.slice(5, 7)}` : "—"}
              </dd>
              {(p.doc_url || p.pasta_bruto || p.pasta_entrega) && (
                <>
                  <dt>Links</dt>
                  <dd className="links-lote">
                    {p.doc_url && <a href={p.doc_url} target="_blank" rel="noreferrer" className="link-roxo">Documento</a>}
                    {p.pasta_bruto && <a href={p.pasta_bruto} target="_blank" rel="noreferrer" className="link-roxo">Pasta do bruto</a>}
                    {p.pasta_entrega && <a href={p.pasta_entrega} target="_blank" rel="noreferrer" className="link-roxo">Pasta de entrega</a>}
                  </dd>
                </>
              )}
              {p.aprovado_em && (
                <>
                  <dt>Aprovado</dt>
                  <dd>{quando(p.aprovado_em)}</dd>
                </>
              )}
            </dl>

          </section>

          {fichaEditavel && (
            <details className="bloco editar-ficha">
              <summary>Editar ficha</summary>
              <Form acao={salvarFicha} className="form-ficha" feito="Ficha salva">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="tags_enviadas" value="1" />
                <div className="duas">
                  <label>
                    Expert
                    <select name="expert_id" defaultValue={p.expert_id ?? ""}>
                      <option value="">—</option>
                      {gente
                        .filter((u) => u.papel === "gravacao")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Prioridade
                    <select name="prioridade" defaultValue={p.prioridade ?? "media"}>
                      {Object.entries(PRIORIDADES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="campo">
                  <span>Tags</span>
                  <div className="tags-op">
                    {todasTags.map((t) => (
                      <label key={t.id} className="tag-op tag-ck">
                        <input type="checkbox" name="tag" value={t.id} defaultChecked={tagsDe(p).some((x) => x.nome === t.nome)} />
                        <i className={`pt-${t.cor}`} />
                        {t.nome}
                      </label>
                    ))}
                  </div>
                </div>
                <label>
                  Formato da gravação
                  <select name="formato_gravacao" defaultValue={p.formato_gravacao ?? ""}>
                    <option value="">—</option>
                    {Object.entries(FORMATOS_GRAVACAO).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="duas">
                  <label>
                    Lado
                    <select name="lado" defaultValue={p.lado}>
                      {Object.entries(LADOS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tipo
                    <select name="tipo" defaultValue={p.tipo}>
                      {Object.entries(TIPOS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Formato
                  <input name="formato" defaultValue={p.formato ?? ""} placeholder="Caixinha de perguntas, POV, print…" />
                </label>
                <label>
                  Link da referência
                  <input name="referencia_url" type="url" defaultValue={p.referencia_url ?? ""} />
                </label>
                <label>
                  Link de print/imagem de referência
                  <input name="referencia_img" type="url" defaultValue={p.referencia_img ?? ""} placeholder="https://… (.jpg, .png)" />
                </label>
                <div className="duas">
                  <label>
                    Copy
                    <select name="copy_id" defaultValue={p.copy_id ?? ""}>
                      <option value="">—</option>
                      {gente
                        .filter((u) => u.papel === "copy" || u.papel === "admin")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Editor
                    <select name="editor_id" defaultValue={p.editor_id ?? ""}>
                      <option value="">quem pegar</option>
                      {gente
                        .filter((u) => u.papel === "editor")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label>
                  Prazo
                  <input name="prazo" type="date" defaultValue={p.prazo ?? ""} />
                </label>
                <label>
                  Link do documento
                  <input name="doc_url" type="url" defaultValue={p.doc_url ?? ""} placeholder="https://…" />
                </label>
                <div className="duas">
                  <label>
                    Pasta do material bruto
                    <input name="pasta_bruto" type="url" defaultValue={p.pasta_bruto ?? ""} placeholder="https://…" />
                  </label>
                  <label>
                    Pasta de entrega
                    <input name="pasta_entrega" type="url" defaultValue={p.pasta_entrega ?? ""} placeholder="https://…" />
                  </label>
                </div>
                <button className="btn">Salvar ficha</button>
              </Form>
            </details>
          )}

          {(p.status === "no_ar" || p.resultado) && (
            <section className="bloco">
              <div className="bloco-hd">
                <h2>Resultado no tráfego</h2>
                <Resultado r={p.resultado} />
              </div>
              {p.resultado_nota && <p className="dica">{p.resultado_nota}</p>}
              {marcaResultado && (
                <Form acao={marcarResultado} className="form-ficha" feito="Resultado salvo">
                  <input type="hidden" name="id" value={p.id} />
                  <select name="resultado" defaultValue={p.resultado ?? "testando"}>
                    {Object.entries(RESULTADOS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input name="resultado_nota" defaultValue={p.resultado_nota ?? ""} placeholder="CPA, CTR, observação…" />
                  <button className="btn sec-btn">Salvar resultado</button>
                </Form>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
