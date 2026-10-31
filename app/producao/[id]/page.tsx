import Link from "next/link";
import { notFound } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { producao, materiais, comentarios, usuarios, quando, hojeSP } from "@/lib/dados";
import { passosPara, eMinhaVez, LADOS, TIPOS, RESULTADOS, PAPEIS, type Papel } from "@/lib/fluxo";
import { player } from "@/lib/midia";
import { addMaterial, comentar, marcarResultado, mudarEtapa, removerMaterial, salvarCopy, salvarFicha } from "../../acoes";
import { Form } from "../../form";
import { Icone } from "../../icones";
import { Lado, Pill, Resultado } from "../../pecas";
import { Copiar } from "./copiar";

export const dynamic = "force-dynamic";

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
  const [mats, conversa, gente] = await Promise.all([materiais(id), comentarios(id), usuarios(true)]);

  const versoes = mats.filter((m) => m.tipo === "versao");
  const brutos = mats.filter((m) => m.tipo === "bruto");
  const passos = passosPara(p.status, eu.papel);
  const escreve = eu.papel === "admin" || eu.papel === "copy";
  const minhaVez = eMinhaVez(p, eu);
  const ajustesAbertos = p.status === "ajustes" ? conversa.filter((c) => c.tipo === "ajuste").slice(-1) : [];
  const hoje = hojeSP();

  return (
    <div className="pagina larga">
      <div className="det-cab">
        <div className="trilha">
          <Link href="/esteira">Esteira</Link> <span>›</span> <Pill status={p.status} />
          {minhaVez && <span className="sua-vez">sua vez</span>}
        </div>
        <h1 className="mono det-cod">
          {p.codigo} <small>{TIPOS[p.tipo as keyof typeof TIPOS]}</small>
        </h1>
      </div>

      {ajustesAbertos.map((a) => (
        <div key={a.id} className="alerta-ajuste">
          <b>Ajustes pedidos por {a.autor}</b>
          <p>{a.texto}</p>
        </div>
      ))}

      {passos.length > 0 && (
        <div className="acoes">
          {passos.map((s) =>
            s.pedeTexto ? (
              <details key={s.id} className="acao-texto">
                <summary className="btn perigo">{s.rotulo}</summary>
                <Form acao={mudarEtapa}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="passo" value={s.id} />
                  <textarea name="texto" rows={4} placeholder={s.pedeTexto} required />
                  <button className="btn perigo">Enviar pedido de ajuste</button>
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
            {eu.papel !== "trafego" && (
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
              <h2>Material bruto</h2>
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

          <section className="bloco">
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
                  Briefing pra edição
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
                {p.hook && <p className="copy-hook">{p.hook}</p>}
                <pre className="copy-texto">{p.copy ?? "A copy ainda não foi escrita."}</pre>
              </div>
            )}
          </section>

          <section className="bloco">
            <div className="bloco-hd">
              <h2>Conversa</h2>
              <span className="bloco-n">{conversa.filter((c) => c.tipo !== "evento").length}</span>
            </div>
            <ol className="conversa">
              {conversa.map((c) => (
                <li key={c.id} className={"msg msg-" + c.tipo}>
                  {c.tipo === "evento" ? (
                    <span className="evento">
                      <b>{c.autor ?? "sistema"}</b> {c.texto} · {quando(c.criado_em)}
                    </span>
                  ) : (
                    <>
                      <div className="msg-hd">
                        <b>{c.autor}</b>
                        <span className="meta">{c.papel ? PAPEIS[c.papel as Papel] : ""}</span>
                        {c.tipo === "ajuste" && <span className="pill st-ajustes">ajuste</span>}
                        <span className="meta">{quando(c.criado_em)}</span>
                      </div>
                      <p>{c.texto}</p>
                    </>
                  )}
                </li>
              ))}
            </ol>
            <Form acao={comentar} className="form-msg" limpar>
              <input type="hidden" name="id" value={p.id} />
              <textarea name="texto" rows={2} placeholder="Escreva pra equipe (ex.: 0:08 corta a respiração)" required />
              <button className="btn sec-btn">Enviar</button>
            </Form>
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
              <p className="dica">Sem referência.</p>
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
              <dd>{p.oferta}</dd>
              <dt>Ângulo</dt>
              <dd>{p.angulo}</dd>
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
              {p.aprovado_em && (
                <>
                  <dt>Aprovado</dt>
                  <dd>{quando(p.aprovado_em)}</dd>
                </>
              )}
            </dl>
            {p.briefing && !escreve && (
              <div className="briefing">
                <b>Briefing pra edição</b>
                <pre>{p.briefing}</pre>
              </div>
            )}
          </section>

          {escreve && (
            <details className="bloco editar-ficha">
              <summary>Editar ficha</summary>
              <Form acao={salvarFicha} className="form-ficha" feito="Ficha salva">
                <input type="hidden" name="id" value={p.id} />
                <label>
                  Ângulo
                  <input name="angulo" defaultValue={p.angulo} required />
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
              {eu.papel !== "editor" && (
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
