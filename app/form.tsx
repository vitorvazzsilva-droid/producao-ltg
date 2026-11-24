"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type Acao = (f: FormData) => Promise<{ erro?: string } | void | unknown>;

// Form de server action que mostra o erro na hora (em vez da tela de erro
// do Next) e trava os campos enquanto salva. O botao clicado gira na hora
// do clique, e o form ignora um segundo envio enquanto o primeiro corre.
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
  const correndo = useRef(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [pendente, iniciar] = useTransition();
  const botao = useRef<HTMLElement | null>(null);

  // O giro vai ate a tela atualizar de vez (fim da transicao), nao so ate a
  // resposta do servidor chegar.
  useEffect(() => {
    if (!pendente && !correndo.current) {
      botao.current?.classList.remove("carregando");
      botao.current = null;
    }
  }, [pendente]);

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pendente}
      onSubmit={(e) => {
        if (correndo.current) {
          e.preventDefault();
          return;
        }
        correndo.current = true;
        botao.current = (e.nativeEvent as SubmitEvent).submitter;
        botao.current?.classList.add("carregando");
      }}
      action={(f) =>
        iniciar(async () => {
          try {
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
          } catch (e) {
            // redirect()/notFound() do servidor chegam como erro: deixa o Next seguir
            if (String((e as { digest?: string })?.digest ?? "").startsWith("NEXT_")) throw e;
            setErro("Não deu certo. Confira a internet e tente de novo.");
          } finally {
            correndo.current = false;
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
