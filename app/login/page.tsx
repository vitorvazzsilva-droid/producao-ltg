"use client";

import { useActionState } from "react";
import { entrar } from "../acoes";
import { Logo } from "../icones";

export default function Login() {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <div className="login">
      <form action={acao} className="login-card">
        <div className="login-marca">
          <Logo />
          <span>
            produção <b>LTG</b>
          </span>
        </div>
        <p className="login-sub">Esteira de criativos do Low Ticket Global</p>
        <label>
          Usuário
          <input name="login" autoComplete="username" autoCapitalize="none" required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="current-password" required />
        </label>
        {estado?.erro && <p className="erro">{estado.erro}</p>}
        <button className="btn grande" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
