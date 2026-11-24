"use client";

import { useState } from "react";
import { enviarRelatorio } from "../acoes";
import { Form } from "../form";
import { Icone } from "../icones";

export function Relatar({ experts, ontem }: { experts: { id: number; nome: string }[]; ontem: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button className="btn btn-roxo" onClick={() => setAberto(true)}>
        <Icone n="mais" /> Enviar relatório
      </button>
      {aberto && (
        <div className="modal-fundo" onClick={() => setAberto(false)}>
          <div className="modal largo" onClick={(e) => e.stopPropagation()}>
            <b>Relatório do dia</b>
            <Form
              acao={async (f) => {
                const r = await enviarRelatorio(f);
                if (!(r as { erro?: string })?.erro) setAberto(false);
                return r;
              }}
              className="pilha"
            >
              <div className="dupla">
                <label className="campo">
                  <span>Expert</span>
                  <select name="expert_id" required>
                    {experts.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="campo">
                  <span>Dia</span>
                  <input type="date" name="dia" defaultValue={ontem} required />
                </label>
              </div>
              <div className="dupla">
                <label className="campo">
                  <span>ROI do dia</span>
                  <input name="roi" inputMode="decimal" placeholder="1,51" />
                </label>
                <label className="campo">
                  <span>Vendas</span>
                  <input name="vendas" inputMode="numeric" placeholder="126" />
                </label>
              </div>
              <label className="campo">
                <span>Criativos que mais performaram (um por linha: código e ROI)</span>
                <textarea name="criativos" rows={4} placeholder={"JHON_ATMOZ_KEV_376_H1 4,54\nJHON_ATMOZ_KEV_378_H2 2,78"} />
              </label>
              <label className="campo">
                <span>Testes que você está fazendo</span>
                <textarea name="testes" rows={3} placeholder="Ex.: testando 3 hooks novos do 404 em CBO, público aberto…" />
              </label>
              <div className="modal-pe">
                <button type="button" className="btn sec-btn" onClick={() => setAberto(false)}>
                  Cancelar
                </button>
                <button className="btn btn-roxo">Enviar</button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </>
  );
}
