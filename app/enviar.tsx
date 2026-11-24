"use client";

import { useFormStatus } from "react-dom";

// Botao de envio que gira e trava enquanto o form salva (evita o 2º clique).
export function Enviar({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className={(className ?? "btn") + (pending ? " carregando" : "")} disabled={pending} aria-busy={pending}>
      {children}
    </button>
  );
}
