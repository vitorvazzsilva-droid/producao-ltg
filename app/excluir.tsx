"use client";

import { useState, useTransition } from "react";
import { excluirComentario, excluirProducao } from "./acoes";

// Excluir pede um segundo clique (sem confirm() do navegador, que trava).
export function Excluir({
  qual,
  id,
  voltar,
  rotulo = "excluir",
  aviso,
  grande,
}: {
  qual: "producao" | "comentario";
  id: number;
  voltar?: string;
  rotulo?: string;
  aviso?: string;
  grande?: boolean;
}) {
  const [certeza, setCerteza] = useState(false);
  const [erro, setErro] = useState("");
  const [pend, iniciar] = useTransition();
  if (!certeza)
    return (
      <button type="button" className={grande ? "btn perigo" : "lk lk-x"} onClick={() => setCerteza(true)}>
        {rotulo}
      </button>
    );
  return (
    <span className="confirma-excluir">
      {aviso && <span className="confirma-aviso">{aviso}</span>}
      <button
        type="button"
        className={"btn perigo mini" + (pend ? " carregando" : "")}
        disabled={pend}
        onClick={() =>
          iniciar(async () => {
            const f = new FormData();
            f.set("id", String(id));
            if (voltar) f.set("voltar", voltar);
            const r = (await (qual === "producao" ? excluirProducao(f) : excluirComentario(f))) as { erro?: string } | undefined;
            if (r?.erro) setErro(r.erro);
            else setCerteza(false);
          })
        }
      >
        Sim, excluir
      </button>
      <button type="button" className="lk lk-x" disabled={pend} onClick={() => setCerteza(false)}>
        cancelar
      </button>
      {erro && <span className="erro">{erro}</span>}
    </span>
  );
}
