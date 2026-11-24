"use client";

import { useActionState } from "react";
import { trocarMinhaSenha } from "../acoes";

export function TrocarSenha() {
  const [r, acao, pend] = useActionState(trocarMinhaSenha, null);
  return (
    <form action={acao} className="bloco form-ficha">
      <div className="bloco-hd">
        <h2>Trocar minha senha</h2>
      </div>
      <label>
        Senha atual
        <input name="atual" type="password" autoComplete="current-password" required />
      </label>
      <label>
        Senha nova
        <input name="nova" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <button className={"btn" + (pend ? " carregando" : "")} disabled={pend}>
        Trocar senha
      </button>
      {r?.erro && <p className="erro">{r.erro}</p>}
      {r?.ok && <p className="ok">Senha trocada.</p>}
    </form>
  );
}
