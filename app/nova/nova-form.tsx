"use client";

import { useMemo, useState } from "react";
import { criarOferta, criarProducao, criarTag } from "../acoes";
import { Form } from "../form";
import { Icone, IcPrioridade } from "../icones";
import { TIPOS, type Papel } from "@/lib/fluxo";

type P = { id: number; nome: string; sigla: string };
type Of = { id: number; nome: string; sigla: string; expert_id: number | null; contador: number };
type Tg = { id: number; nome: string; cor: string };

export function NovaForm({
  eu,
  experts,
  copies,
  editores,
  ofertas: ofs0,
  tags: tags0,
  bases,
}: {
  eu: { id: number; papel: Papel };
  experts: P[];
  copies: P[];
  editores: P[];
  ofertas: Of[];
  tags: Tg[];
  bases: { id: number; oferta_id: number | null; nome: string; noAr: boolean; hook: string | null }[];
}) {
  const [tags, setTags] = useState(tags0);
  const [ofs, setOfs] = useState(ofs0);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [expert, setExpert] = useState(experts[0]?.id ? String(experts[0].id) : "");
  const [oferta, setOferta] = useState("");
  const [lado, setLado] = useState("black");
  const [formatoG, setFormatoG] = useState("depois");
  const [pri, setPri] = useState("media");
  const [qtd, setQtd] = useState(1);
  const [passaCopy, setPassaCopy] = useState(true);
  const [passaGrav, setPassaGrav] = useState(true);
  const [copyId, setCopyId] = useState(eu.papel === "copy" ? String(eu.id) : "auto");
  const [editor, setEditor] = useState("livre");
  const [novaTag, setNovaTag] = useState<string | null>(null);
  const [novaOf, setNovaOf] = useState(false);
  const [erroMini, setErroMini] = useState("");

  const ex = experts.find((x) => String(x.id) === expert);
  const of = ofs.find((x) => String(x.id) === oferta);
  const ofsDoExpert = ofs.filter((o) => !o.expert_id || String(o.expert_id) === expert);
  const cp = copies.find((x) => String(x.id) === copyId);
  const seq = of ? String(of.contador + 1).padStart(3, "0") : "###";
  const basesDaOferta = useMemo(() => bases.filter((b) => b.oferta_id && String(b.oferta_id) === oferta), [bases, oferta]);
  const nomesCopy = copies.filter((c) => c.id !== eu.id || eu.papel === "copy").map((c) => c.nome.split(" ")[0]);

  const marcar = (id: number) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <div className="card canon">
        <small>Nome canônico</small>
        <div className="canon-nome mono">
          <span className={ex ? "" : "vago"}>{ex?.sigla ?? "····"}</span>
          <span className={of ? "" : "vago"}>{of?.sigla ?? "····"}</span>
          <span className={passaCopy && cp ? "" : "vago"}>{passaCopy ? (cp?.sigla ?? "···") : "SEM"}</span>
          <span className={of ? "" : "vago"}>{seq}</span>
        </div>
        <div className="canon-leg">
          <span>EXPERT</span>—<span>OFERTA</span>—<span>COPY</span>—<span>Nº</span>
        </div>
        <p className="meta">Gerado, nunca digitado. O ### é o sequencial, e sai do contador da oferta no momento em que você criar.</p>
      </div>

      <Form acao={criarProducao} className="card nova">
        <div className="campo">
          <label>
            Tags<em>*</em>
          </label>
          <div className="tags-op">
            {tags.map((t) => (
              <label key={t.id} className={"tag-op" + (marcadas.has(t.id) ? " on" : "")}>
                <input type="checkbox" name="tag" value={t.id} checked={marcadas.has(t.id)} onChange={() => marcar(t.id)} />
                <i className={`pt-${t.cor}`} />
                {t.nome}
              </label>
            ))}
            {novaTag === null ? (
              <button type="button" className="tag-op nova-tag" onClick={() => setNovaTag("")}>
                <Icone n="mais" s={14} /> Nova tag
              </button>
            ) : (
              <span className="tag-nova">
                <input
                  autoFocus
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  placeholder="Nome da tag"
                  onKeyDown={async (e) => {
                    if (e.key === "Escape") setNovaTag(null);
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const f = new FormData();
                    f.set("nome", novaTag);
                    const r = (await criarTag(f)) as { ok?: Tg; erro?: string };
                    if (r.ok) {
                      setTags((t) => (t.some((x) => x.id === r.ok!.id) ? t : [...t, r.ok!].sort((a, b) => a.nome.localeCompare(b.nome))));
                      marcar(r.ok.id);
                      setNovaTag(null);
                    }
                  }}
                />
                <small>Enter cria</small>
              </span>
            )}
          </div>
          <p className="ajuda">O rótulo do lote. Marque pelo menos uma — dá para mais de uma. Não entra no nome.</p>
        </div>

        <div className="dupla">
          <div className="campo">
            <label>
              Expert<em>*</em>
            </label>
            <select name="expert_id" value={expert} onChange={(e) => setExpert(e.target.value)} required>
              {!experts.length && <option value="">— cadastre um expert em Equipe —</option>}
              {experts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome.split(" ")[0]} · {x.sigla}
                </option>
              ))}
            </select>
            <p className="ajuda">Quem aparece no vídeo. A produção nasce com ele e chega pra ele gravar.</p>
          </div>
          <div className="campo">
            <label>
              Oferta<em>*</em>
            </label>
            <div className="com-botao">
              <select name="oferta_id" value={oferta} onChange={(e) => setOferta(e.target.value)} required>
                <option value="">— selecione —</option>
                {ofsDoExpert.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome} · {o.sigla}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-quad" onClick={() => setNovaOf(true)} title="Nova oferta">
                <Icone n="mais" />
              </button>
            </div>
            <p className="ajuda">Só as do expert escolhido e as de todos. A sigla entra no nome.</p>
          </div>
        </div>

        <div className="dupla">
          <div className="campo">
            <label>Tipo</label>
            <select name="tipo" defaultValue="anuncio">
              {Object.entries(TIPOS).map(([v, r]) => (
                <option key={v} value={v}>
                  {v === "anuncio" ? "— anúncio (padrão) —" : r}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>
              A copy é Black ou White?<em>*</em>
            </label>
            <input type="hidden" name="lado" value={lado} />
            <div className="bw">
              <button type="button" className={lado === "black" ? "on" : ""} onClick={() => setLado("black")}>
                <i className="bw-b" /> BLACK
              </button>
              <button type="button" className={lado === "white" ? "on" : ""} onClick={() => setLado("white")}>
                <i className="bw-w" /> WHITE
              </button>
            </div>
            <p className="ajuda">Obrigatório. Vai com a produção até o fim — é o que separa as métricas de Black e de White.</p>
          </div>
        </div>

        <div className="dupla">
          <div className="campo">
            <label>Formato da gravação</label>
            <input type="hidden" name="formato_gravacao" value={formatoG} />
            <div className="seg">
              {[
                ["horizontal", "Horizontal (16:9)"],
                ["vertical", "Vertical (9:16)"],
                ["depois", "Depois"],
              ].map(([v, r]) => (
                <button key={v} type="button" className={formatoG === v ? "on" : ""} onClick={() => setFormatoG(v)}>
                  {r}
                </button>
              ))}
            </div>
            <p className="ajuda">Opcional. O expert vê na mesa e na tela de gravação; dá para escolher depois, na Ficha.</p>
          </div>
          <div className="campo">
            <label>Prioridade</label>
            <input type="hidden" name="prioridade" value={pri} />
            <div className="seg">
              {[
                ["baixa", "Baixa"],
                ["media", "Média"],
                ["alta", "Alta"],
                ["urgente", "Urgente"],
              ].map(([v, r]) => (
                <button key={v} type="button" className={pri === v ? "on" : ""} onClick={() => setPri(v)}>
                  <IcPrioridade p={v} /> {r}
                </button>
              ))}
            </div>
            <p className="ajuda">Sobe sozinha com o tempo parado: 3 dias Alta, 7 Urgente.</p>
          </div>
        </div>

        <div className="dupla">
          <div className="campo">
            <label>Quantidade</label>
            <input type="number" name="quantidade" min={1} max={50} value={qtd} onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))} />
            <p className="ajuda">Quantas produções criar de uma vez — numeradas em sequência. Ou nascem todas, ou nenhuma.</p>
          </div>
          <div className="campo">
            <label>Material base</label>
            <select name="base_id" disabled={!oferta} defaultValue="">
              <option value="">{oferta ? (basesDaOferta.length ? "— nenhum —" : "— nada dessa oferta ainda —") : "escolha a oferta primeiro"}</option>
              {basesDaOferta.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                  {b.noAr ? " · no ar" : ""}
                  {b.hook ? ` — ${b.hook.slice(0, 40)}` : ""}
                </option>
              ))}
            </select>
            <p className="ajuda">Opcional: o lead/corpo de onde esta produção nasce. Os no ar vêm primeiro.</p>
          </div>
        </div>

        <div className="caminho">
          <div className="caminho-t">
            Caminho <span>desligue a etapa que esta produção não precisa</span>
          </div>

          <div className="passo">
            <span className="passo-ic">
              <Icone n="copy" />
            </span>
            <div className="passo-c">
              <div className="passo-hd">
                <b>Copy</b>
                <label className="switch">
                  Passa
                  <input type="checkbox" name="passa_copy" checked={passaCopy} onChange={(e) => setPassaCopy(e.target.checked)} />
                  <i />
                </label>
              </div>
              {passaCopy && (
                <>
                  <label className="sub-l">
                    Copywriter<em>*</em>
                  </label>
                  <select name="copy_id" value={copyId} onChange={(e) => setCopyId(e.target.value)}>
                    <option value="auto">Distribuir automaticamente</option>
                    {copies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  <p className="ajuda">
                    {copyId === "auto"
                      ? `Um por produção, para quem tem menos em aberto agora. Admin não entra no sorteio.${nomesCopy.length ? ` Entre ${junta(nomesCopy)}.` : ""}`
                      : "Todas as produções do lote vão para essa pessoa."}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="passo">
            <span className="passo-ic">
              <Icone n="camera" />
            </span>
            <div className="passo-c">
              <div className="passo-hd">
                <b>Gravação</b>
                <label className="switch">
                  Passa
                  <input type="checkbox" name="passa_gravacao" checked={passaGrav} onChange={(e) => setPassaGrav(e.target.checked)} />
                  <i />
                </label>
              </div>
              <p className="ajuda forte">
                {passaGrav ? (
                  <>
                    <b>{ex?.nome ?? "O expert"}</b> grava e sobe o bruto. {passaCopy ? "Com a copy, chega já aprovada." : "Sem copy, chega direto pra gravar."}
                  </>
                ) : (
                  "Sem gravação: a edição trabalha com o material que já existe."
                )}
              </p>
            </div>
          </div>

          <div className="passo">
            <span className="passo-ic">
              <Icone n="video" />
            </span>
            <div className="passo-c">
              <div className="passo-hd">
                <b>Edição</b>
                <span className="meta">
                  <Icone n="cadeado" s={13} /> Anúncio sempre passa: o tráfego sobe o vídeo editado
                </span>
              </div>
              <label className="sub-l">Editor</label>
              <select name="editor_id" value={editor} onChange={(e) => setEditor(e.target.value)}>
                <option value="livre">Quem pegar primeiro (recomendada)</option>
                <option value="auto">Distribuir automaticamente</option>
                {editores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <p className="ajuda">
                {editor === "livre"
                  ? "Nasce sem editor. Quando o bruto chega, entra em “Livre para pegar” e o primeiro editor que pegar fica com ela."
                  : editor === "auto"
                    ? "Vai para o editor com menos edições abertas agora."
                    : "Já nasce com esse editor: quando o bruto chega, cai em “Gravado” pra ele."}
              </p>
            </div>
          </div>

          <div className="passo fim">
            <span className="passo-ic ok">
              <Icone n="check" />
            </span>
            <div className="passo-c">
              <b>Pronta</b> <span className="meta">na aprovação da edição.</span>
            </div>
          </div>
        </div>

        <div className="lote">
          <div className="caminho-t">
            Do lote <span>opcional, e vale para {qtd === 1 ? "esta produção" : `as ${qtd}`}</span>
          </div>
          <div className="tripla">
            <div className="campo">
              <label>Link do documento</label>
              <input name="doc_url" type="url" placeholder="https://…" />
            </div>
            <div className="campo">
              <label>Pasta do material bruto</label>
              <input name="pasta_bruto" type="url" placeholder="https://…" />
            </div>
            <div className="campo">
              <label>Pasta de entrega</label>
              <input name="pasta_entrega" type="url" placeholder="https://…" />
            </div>
          </div>
          <div className="campo">
            <label>Briefing</label>
            <textarea name="briefing" rows={3} placeholder="Ângulo, referência, o que não pode faltar…" />
          </div>
        </div>

        <div className="nova-pe">
          <button className="btn btn-roxo grande">
            <Icone n="mais" /> Criar {qtd === 1 ? "produção" : `${qtd} produções`}
          </button>
        </div>
      </Form>

      {novaOf && (
        <div className="modal-fundo" onClick={() => setNovaOf(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const r = (await criarOferta(new FormData(e.currentTarget))) as { ok?: Of; erro?: string };
              if (r.erro) return setErroMini(r.erro);
              if (r.ok) {
                setOfs((o) => [...o, { ...r.ok!, contador: 0 }]);
                setOferta(String(r.ok.id));
                setNovaOf(false);
                setErroMini("");
              }
            }}
          >
            <b>Nova oferta</b>
            <input name="nome" placeholder="Nome (ex.: Low Ticket Global)" required autoFocus />
            <input name="sigla" placeholder="Sigla que entra no nome (ex.: LTG)" maxLength={5} />
            <select name="expert_id" defaultValue="">
              <option value="">De todos os experts</option>
              {experts.map((x) => (
                <option key={x.id} value={x.id}>
                  Só do {x.nome}
                </option>
              ))}
            </select>
            {erroMini && <p className="erro">{erroMini}</p>}
            <div className="modal-pe">
              <button type="button" className="btn sec-btn" onClick={() => setNovaOf(false)}>
                Cancelar
              </button>
              <button className="btn btn-roxo">Criar oferta</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function junta(n: string[]) {
  if (n.length <= 1) return n.join("");
  return n.slice(0, -1).join(", ") + " e " + n[n.length - 1];
}
