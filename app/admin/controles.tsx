"use client";

import { useState, useTransition } from "react";
import { Form } from "../form";
import { criarMeta, excluirMeta, excluirTarefa, salvarMeta, statusTarefa } from "../acoes";
import { METRICAS, PERIODOS, STATUS_DO_MEMBRO, STATUS_TAREFA, type StatusTarefa } from "@/lib/metas-base";

type Pessoa = { id: number; nome: string; papel: string };
type MetaForm = {
  id?: number;
  usuario_id?: number;
  titulo?: string;
  descricao?: string | null;
  tipo?: string;
  metrica?: string | null;
  alvo?: number;
  periodo?: string;
  prazo?: string | null;
};

// Criar ou editar meta. "Automática" mostra o que contar na esteira;
// "manual" esconde (o numero e atualizado a mao).
export function FormMeta({ pessoas, meta, aoSalvar }: { pessoas: Pessoa[]; meta?: MetaForm; aoSalvar?: () => void }) {
  const [tipo, setTipo] = useState(meta?.tipo ?? "automatica");
  const [periodo, setPeriodo] = useState(meta?.periodo ?? "semana");
  const editando = !!meta?.id;
  return (
    <Form
      acao={async (f) => {
        const r = await (editando ? salvarMeta(f) : criarMeta(f));
        if (!r?.erro) aoSalvar?.();
        return r;
      }}
      className="form-meta"
      limpar={!editando}
      feito={editando ? undefined : "Meta criada"}
    >
      {editando && <input type="hidden" name="id" value={meta.id} />}
      <div className="duas">
        <label>
          Pra quem
          <select name="usuario_id" defaultValue={meta?.usuario_id ?? ""} required>
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
          Como conta
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="automatica">Automática (pela esteira)</option>
            <option value="manual">Manual (eu atualizo)</option>
          </select>
        </label>
      </div>
      {tipo === "automatica" && (
        <label>
          O que conta
          <select name="metrica" defaultValue={meta?.metrica ?? "copys_enviadas"}>
            {Object.entries(METRICAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.rotulo}
              </option>
            ))}
          </select>
          <small>Conta a primeira vez que cada criativo passou pela etapa, com essa pessoa como responsável.</small>
        </label>
      )}
      <label>
        Título <small>{tipo === "automatica" ? "opcional — se vazio, usa o que conta" : ""}</small>
        <input name="titulo" defaultValue={meta?.titulo ?? ""} placeholder="Ex.: 20 copys por semana" required={tipo === "manual"} />
      </label>
      <div className="tres">
        <label>
          Alvo
          <input name="alvo" type="number" min={1} defaultValue={meta?.alvo ?? 10} required />
        </label>
        <label>
          Período
          <select name="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {Object.entries(PERIODOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prazo <small>{periodo === "avulsa" ? "" : "opcional"}</small>
          <input name="prazo" type="date" defaultValue={meta?.prazo ?? ""} />
        </label>
      </div>
      <label>
        Detalhes <small>opcional</small>
        <textarea name="descricao" rows={2} defaultValue={meta?.descricao ?? ""} />
      </label>
      <button className="btn">{editando ? "Salvar meta" : "Criar meta"}</button>
    </Form>
  );
}

export function EditarMeta({ pessoas, meta }: { pessoas: Pessoa[]; meta: MetaForm }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button className="lk" onClick={() => setAberto((v) => !v)}>
        {aberto ? "fechar" : "editar"}
      </button>
      {aberto && (
        <div className="editar-meta">
          <FormMeta pessoas={pessoas} meta={meta} aoSalvar={() => setAberto(false)} />
        </div>
      )}
    </>
  );
}

// Excluir pede segundo clique (sem confirm() do navegador).
export function Excluir({ id, tipo }: { id: number; tipo: "meta" | "tarefa" }) {
  const [certeza, setCerteza] = useState(false);
  const [pend, iniciar] = useTransition();
  if (!certeza)
    return (
      <button className="lk lk-x" onClick={() => setCerteza(true)}>
        excluir
      </button>
    );
  return (
    <span className="inline">
      <button
        className="btn perigo mini"
        disabled={pend}
        onClick={() =>
          iniciar(async () => {
            const f = new FormData();
            f.set("id", String(id));
            await (tipo === "meta" ? excluirMeta(f) : excluirTarefa(f));
          })
        }
      >
        Confirmar exclusão
      </button>
      <button className="lk lk-x" onClick={() => setCerteza(false)}>
        cancelar
      </button>
    </span>
  );
}

// Seletor de status da tarefa. O membro ve so as opcoes que pode usar.
export function StatusTarefaSel({ id, status, admin }: { id: number; status: StatusTarefa; admin: boolean }) {
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const opcoes = admin ? (Object.keys(STATUS_TAREFA) as StatusTarefa[]) : STATUS_DO_MEMBRO;
  if (!admin && status === "concluida") return <span className="pill st-aprovado">Concluída</span>;
  return (
    <span className="inline">
      <select
        className={"sel-status ts-" + status}
        value={status}
        disabled={pend}
        aria-label="Status da tarefa"
        onChange={(e) => {
          const f = new FormData();
          f.set("id", String(id));
          f.set("status", e.target.value);
          iniciar(async () => {
            const r = await statusTarefa(f);
            setErro(r?.erro ?? "");
          });
        }}
      >
        {opcoes.map((s) => (
          <option key={s} value={s}>
            {STATUS_TAREFA[s]}
          </option>
        ))}
      </select>
      {erro && <span className="erro">{erro}</span>}
    </span>
  );
}
