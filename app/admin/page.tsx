import Link from "next/link";
import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { usuarios, hojeSP } from "@/lib/dados";
import { PAPEIS, eMinhaVez, type Papel } from "@/lib/fluxo";
import { metas, tarefas, esteiraPorPessoa, type MetaVista, type Tarefa } from "@/lib/metas";
import { iniciais } from "@/lib/iniciais";
import { concluirMeta, criarTarefa, progressoMeta, salvarTarefa } from "../acoes";
import { Form } from "../form";
import { AbasAdmin } from "./abas";
import { EditarMeta, Excluir, FormMeta } from "./controles";
import { Barra, CartaoMeta, LinhaTarefa, NaEsteiraLista } from "./vistas";
import { Enviar } from "../enviar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

type Aba = "resumo" | "metas" | "tarefas";

export default async function Admin({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  if (eu.papel !== "admin") redirect("/");
  const pedida = (await searchParams).aba;
  const aba: Aba = (["metas", "tarefas"] as const).find((a) => a === pedida) ?? "resumo";

  const [gente, todasMetas, todasTarefas, esteira] = await Promise.all([usuarios(true), metas(), tarefas(), esteiraPorPessoa()]);
  const hoje = hojeSP();
  // Membros = todo mundo ativo menos admin.
  const membros = gente.filter((u) => u.papel !== "admin");
  const pessoas = membros.map((u) => ({ id: u.id, nome: u.nome, papel: u.papel }));
  const metasDe = (id: number) => todasMetas.filter((m) => m.usuario_id === id);
  const tarefasDe = (id: number) => todasTarefas.filter((t) => t.usuario_id === id);

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <h1>Admin</h1>
          <p className="sub">Metas, tarefas avulsas e acessos da equipe. Cada membro vê só o que é dele em “Minhas metas”.</p>
        </div>
      </div>
      <AbasAdmin atual={aba} />

      {aba === "resumo" && (
        <div className="resumo-grade">
          {membros.length === 0 && (
            <div className="bloco">
              <p>
                Nenhum membro ainda. <Link href="/equipe" className="lk">Criar acesso na Equipe</Link>
              </p>
            </div>
          )}
          {membros.map((u) => {
            const ms = metasDe(u.id).filter((m) => m.status === "aberta");
            const ts = tarefasDe(u.id);
            const est = esteira.get(u.id) ?? [];
            const vez = est.filter((p) => eMinhaVez(p, { id: u.id, papel: u.papel as Papel })).length;
            const conta = (s: string) => ts.filter((t) => t.status === s).length;
            return (
              <div key={u.id} className="bloco resumo-membro">
                <div className="resumo-cab">
                  <span className="avatar">{iniciais(u.nome)}</span>
                  <div>
                    <b>{u.nome}</b>
                    <span className="meta">{PAPEIS[u.papel as Papel] ?? u.papel}</span>
                  </div>
                </div>

                <div className="resumo-sec">Metas em andamento</div>
                {ms.length ? (
                  <ul className="resumo-metas">
                    {ms.map((m) => (
                      <li key={m.id}>
                        <div className="resumo-meta-l">
                          <span>{m.titulo}</span>
                          <b className={m.feito >= m.alvo ? "verde-t" : ""}>
                            {m.feito}/{m.alvo}
                          </b>
                        </div>
                        <Barra feito={m.feito} alvo={m.alvo} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="meta">Sem meta. <Link href="/admin?aba=metas" className="lk">Criar</Link></p>
                )}

                <div className="resumo-nums">
                  <div>
                    <b>{conta("a_fazer") + conta("fazendo")}</b>
                    <span>tarefas abertas</span>
                  </div>
                  <div className={conta("aprovacao") ? "destaque" : ""}>
                    <b>{conta("aprovacao")}</b>
                    <span>pra aprovar</span>
                  </div>
                  <div>
                    <b>{est.length}</b>
                    <span>na esteira</span>
                  </div>
                  <div className={vez ? "destaque" : ""}>
                    <b>{vez}</b>
                    <span>na vez dele(a)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aba === "metas" && (
        <div className="duas-col admin-col">
          <div className="bloco">
            <div className="bloco-hd">
              <h2>Nova meta</h2>
            </div>
            {pessoas.length ? <FormMeta pessoas={pessoas} /> : <p className="meta">Crie um membro na Equipe primeiro.</p>}
          </div>
          <div className="lista-por-membro">
            {membros.map((u) => (
              <MetasDoMembro key={u.id} nome={u.nome} lista={metasDe(u.id)} pessoas={pessoas} hoje={hoje} />
            ))}
          </div>
        </div>
      )}

      {aba === "tarefas" && (
        <div className="duas-col admin-col">
          <div className="bloco">
            <div className="bloco-hd">
              <h2>Nova tarefa avulsa</h2>
            </div>
            <p className="meta" style={{ marginBottom: 10 }}>
              Trabalho fora dos criativos. Criativo novo continua sendo criado na esteira (Nova copy).
            </p>
            {pessoas.length ? <FormTarefa pessoas={pessoas} /> : <p className="meta">Crie um membro na Equipe primeiro.</p>}
          </div>
          <div className="lista-por-membro">
            {membros.map((u) => (
              <div key={u.id} className="bloco">
                <div className="bloco-hd">
                  <span className="avatar">{iniciais(u.nome)}</span>
                  <h2>{u.nome}</h2>
                  <span className="bloco-n">{PAPEIS[u.papel as Papel] ?? u.papel}</span>
                </div>
                <div className="tarefas-e-esteira">
                  <div>
                    <div className="resumo-sec">Tarefas avulsas</div>
                    <TarefasDoMembro lista={tarefasDe(u.id)} pessoas={pessoas} hoje={hoje} />
                  </div>
                  <div>
                    <div className="resumo-sec">Na esteira agora</div>
                    <NaEsteiraLista itens={esteira.get(u.id) ?? []} pessoa={u} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Pessoa = { id: number; nome: string; papel: string };

function MetasDoMembro({ nome, lista, pessoas, hoje }: { nome: string; lista: MetaVista[]; pessoas: Pessoa[]; hoje: string }) {
  return (
    <div className="bloco">
      <div className="bloco-hd">
        <span className="avatar">{iniciais(nome)}</span>
        <h2>{nome}</h2>
        <span className="bloco-n">{lista.length}</span>
      </div>
      {lista.length ? (
        <div className="metas-lista">
          {lista.map((m) => (
            <CartaoMeta key={m.id} m={m} hoje={hoje}>
              <div className="meta-acoes">
                {m.tipo === "manual" && m.status === "aberta" && (
                  <Form acao={progressoMeta} className="inline prog-form">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="valor" type="number" min={0} defaultValue={m.feito} aria-label="Feito até agora" />
                    <button className="btn mini sec-btn">atualizar</button>
                  </Form>
                )}
                <form action={concluirMeta} className="inline">
                  <input type="hidden" name="id" value={m.id} />
                  <Enviar className="lk">
                    {m.status === "aberta" ? (m.periodo === "avulsa" ? "marcar concluída" : "encerrar") : "reabrir"}
                  </Enviar>
                </form>
                <EditarMeta pessoas={pessoas} meta={m} />
                <Excluir id={m.id} tipo="meta" />
              </div>
            </CartaoMeta>
          ))}
        </div>
      ) : (
        <p className="meta">Nenhuma meta.</p>
      )}
    </div>
  );
}

function TarefasDoMembro({ lista, pessoas, hoje }: { lista: Tarefa[]; pessoas: Pessoa[]; hoje: string }) {
  if (!lista.length) return <p className="meta">Nenhuma tarefa.</p>;
  return (
    <ul className="tarefas">
      {lista.map((t) => (
        <LinhaTarefa key={t.id} t={t} admin hoje={hoje}>
          <details className="tarefa-editar">
            <summary className="lk">editar</summary>
            <FormTarefa pessoas={pessoas} t={t} />
          </details>
          <Excluir id={t.id} tipo="tarefa" />
        </LinhaTarefa>
      ))}
    </ul>
  );
}

function FormTarefa({ pessoas, t }: { pessoas: Pessoa[]; t?: Tarefa }) {
  return (
    <Form acao={t ? salvarTarefa : criarTarefa} className="form-meta" limpar={!t} feito={t ? "Salvo" : "Tarefa criada"}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="duas">
        <label>
          Pra quem
          <select name="usuario_id" defaultValue={t?.usuario_id ?? ""} required>
            <option value="" disabled>
              Escolha
            </option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prazo <small>opcional</small>
          <input name="prazo" type="date" defaultValue={t?.prazo ?? ""} />
        </label>
      </div>
      <label>
        Título
        <input name="titulo" required defaultValue={t?.titulo ?? ""} placeholder="Ex.: pesquisar 10 ângulos novos" />
      </label>
      <label>
        Detalhes <small>opcional</small>
        <textarea name="descricao" rows={2} defaultValue={t?.descricao ?? ""} />
      </label>
      <button className="btn">{t ? "Salvar" : "Criar tarefa"}</button>
    </Form>
  );
}

