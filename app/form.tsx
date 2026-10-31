"use client";

import { useRef, useState, useTransition } from "react";

type Acao = (f: FormData) => Promise<{ erro?: string } | void | unknown>;

// Form de server action que mostra o erro na hora (em vez da tela de erro
// do Next) e trava os campos enquanto salva.
export function Form({
  acao,
  children,
  className,
  limpar,
  feito,
}: {
  acao: Acao;
  children: React.ReactNode;
  className?: string;
  limpar?: boolean;
  feito?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [pendente, iniciar] = useTransition();

  return (
    <form
      ref={ref}
      className={className}
      action={(f) =>
        iniciar(async () => {
          const r = (await acao(f)) as { erro?: string } | undefined;
          if (r?.erro) {
            setErro(r.erro);
            return;
          }
          setErro("");
          if (limpar) ref.current?.reset();
          if (feito) {
            setOk(true);
            setTimeout(() => setOk(false), 2000);
          }
        })
      }
    >
      <fieldset disabled={pendente}>{children}</fieldset>
      {erro && <p className="erro">{erro}</p>}
      {ok && <p className="ok">{feito}</p>}
    </form>
  );
}
