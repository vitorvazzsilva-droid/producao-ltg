"use client";

import { useState } from "react";

export function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn sec-btn mini"
      onClick={() => {
        navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 1800);
      }}
    >
      {ok ? "Copiado" : "Copiar copy"}
    </button>
  );
}
