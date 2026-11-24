"use client";

import { useActionState, useState, useTransition } from "react";
import { ativarUsuario, criarUsuario, editarUsuario, novaSenha } from "../acoes";
import { Form } from "../form";
import { PAPEIS } from "@/lib/fluxo";

type Res = { erro?: string; ok?: { nome: string; login: string; senha: string } } | null;

const LINK_LOGIN = "https://esteiraltg.pages.dev/login";

// Mensagem pronta pra colar no WhatsApp da pessoa.
function Credencial({ ok }: { ok: NonNullable<Res>["ok"] }) {
  const [copiado, setCopiado] = useState(false);
  if (!ok) return null;
  const texto = `Acesso à Produção LTG\n${LINK_LOGIN}\nUsuário: ${ok.login}\nSenha: ${ok.senha}`;
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
          <input name="login" placeholder="primeiro nome ou e-mail" autoCapitalize="none" />
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
      <button className={"btn" + (pend ? " carregando" : "")} disabled={pend}>
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
      <button className={"lk" + (pend ? " carregando" : "")} disabled={pend}>
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

// Remover acesso pede um segundo clique em vez de confirm() do navegador.
export function Acesso({ id, ativo }: { id: number; ativo: boolean }) {
  const [certeza, setCerteza] = useState(false);
  const [erro, setErro] = useState("");
  const [pend, iniciar] = useTransition();
  const enviar = () =>
    iniciar(async () => {
      const f = new FormData();
      f.set("id", String(id));
      const r = (await ativarUsuario(f)) as { erro?: string } | undefined;
      setErro(r?.erro ?? "");
      setCerteza(false);
    });
  if (!ativo)
    return (
      <button className="lk" disabled={pend} onClick={enviar}>
        devolver acesso
      </button>
    );
  return (
    <span className="inline">
      {certeza ? (
        <>
          <button className="btn perigo mini" disabled={pend} onClick={enviar}>
            Confirmar remoção
          </button>
          <button className="lk lk-x" onClick={() => setCerteza(false)}>
            cancelar
          </button>
        </>
      ) : (
        <button className="lk lk-x" onClick={() => setCerteza(true)}>
          remover acesso
        </button>
      )}
      {erro && <span className="erro">{erro}</span>}
    </span>
  );
}

// Trocar nome e usuario (o login que a pessoa digita). A senha nao muda.
export function EditarMembro({ id, nome, login, sigla, cor }: { id: number; nome: string; login: string; sigla?: string | null; cor?: string | null }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto)
    return (
      <button className="lk" onClick={() => setAberto(true)}>
        editar
      </button>
    );
  return (
    <div className="editar-membro">
      <Form
        acao={async (f) => {
          const r = await editarUsuario(f);
          if (!r?.erro) setAberto(false);
          return r;
        }}
      >
        <input type="hidden" name="id" value={id} />
        <div className="duas">
          <label>
            Nome
            <input name="nome" defaultValue={nome} required />
          </label>
          <label>
            Usuário
            <input name="login" defaultValue={login} required autoCapitalize="none" />
          </label>
        </div>
        <div className="duas" style={{ marginTop: 8 }}>
          <label>
            Sigla <small>entra no nome canônico e nos cards (ex.: JHON, KEV)</small>
            <input name="sigla" defaultValue={sigla ?? ""} maxLength={5} style={{ textTransform: "uppercase" }} />
          </label>
          <label>
            Cor <small>borda dos cards do expert</small>
            <input name="cor" type="color" defaultValue={cor ?? "#6a3fdc"} />
          </label>
        </div>
        <div className="inline" style={{ marginTop: 8 }}>
          <button className="btn mini">Salvar</button>
          <button type="button" className="lk lk-x" onClick={() => setAberto(false)}>
            cancelar
          </button>
        </div>
      </Form>
    </div>
  );
}
