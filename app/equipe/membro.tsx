"use client";

import { useActionState, useState } from "react";
import { criarUsuario, novaSenha } from "../acoes";
import { PAPEIS } from "@/lib/fluxo";

type Res = { erro?: string; ok?: { nome: string; login: string; senha: string } } | null;

// Mensagem pronta pra colar no WhatsApp da pessoa.
function Credencial({ ok }: { ok: NonNullable<Res>["ok"] }) {
  const [copiado, setCopiado] = useState(false);
  if (!ok) return null;
  const texto = `Acesso à Produção LTG\n${location.origin}\nUsuário: ${ok.login}\nSenha: ${ok.senha}`;
  return (
    <div className="credencial">
      <b>Acesso de {ok.nome} — só aparece agora</b>
      <pre>{texto}</pre>
      <button
        type="button"
        className="btn mini"
        onClick={() => {
          navigator.clipboard.writeText(texto);
          setCopiado(true);
        }}
      >
        {copiado ? "Copiado" : "Copiar mensagem"}
      </button>
    </div>
  );
}

export function NovoMembro() {
  const [r, acao, pend] = useActionState<Res, FormData>(criarUsuario, null);
  return (
    <form action={acao} className="bloco form-membro">
      <div className="bloco-hd">
        <h2>Adicionar pessoa</h2>
      </div>
      <div className="tres">
        <label>
          Nome
          <input name="nome" required placeholder="Ex.: Kevin Lucas" />
        </label>
        <label>
          Usuário <small>opcional</small>
          <input name="login" placeholder="primeiro nome" autoCapitalize="none" />
        </label>
        <label>
          Função
          <select name="papel" defaultValue="editor">
            {Object.entries(PAPEIS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="btn" disabled={pend}>
        Criar acesso
      </button>
      {r?.erro && <p className="erro">{r.erro}</p>}
      <Credencial ok={r?.ok} />
    </form>
  );
}

export function NovaSenha({ id }: { id: number }) {
  const [r, acao, pend] = useActionState<Res, FormData>(novaSenha, null);
  return (
    <form action={acao} className="inline">
      <input type="hidden" name="id" value={id} />
      <button className="lk" disabled={pend}>
        nova senha
      </button>
      {r?.ok && (
        <div className="pop">
          <Credencial ok={r.ok} />
        </div>
      )}
    </form>
  );
}
