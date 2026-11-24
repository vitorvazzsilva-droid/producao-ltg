// Icones de traco, sem emoji (emoji deixa o app com cara de amador).
const P: Record<string, string> = {
  inicio: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  esteira: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z",
  anuncios: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  testes: "M4 19V5M4 19h16M8 15l4-4 3 3 5-6",
  equipe: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3 3 0 0 1 0 5.8",
  mais: "M12 5v14M5 12h14",
  busca: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4",
  sino: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  play: "M8 5.5v13l11-6.5z",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  sair: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4",
  copy: "M5 4h10l4 4v12H5zM9 12h6M9 16h6M9 8h3",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  externo: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  baixar: "M12 4v11M7 10l5 5 5-5M5 20h14",
  camera: "M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  chave: "M14.5 9.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM13.2 12.7 20 19.5M17 16.5l2-2",
  lapis: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  megafone: "M3 10v4h3l7 4V6L6 10zM16 9a3 3 0 0 1 0 6M6 14l1 5h3l-1-4",
  cadeado: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  fila: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  relogio: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2",
  voltar: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  filtro: "M4 5h16l-6 8v6l-4-2v-4z",
  marcador: "M7 4h10v16l-5-4-5 4z",
  ordenar: "M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4",
  feedback: "M4 5h16v11H9l-5 4z",
  vega: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 9.5l5 1.5M15.5 13l5 1.5",
  sistema: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  pasta: "M3 6h6l2 2h10v11H3z",
  pastaSeta: "M3 6h6l2 2h10v11H3zM12 11v5M9.5 13.5 12 16l2.5-2.5",
  doc: "M6 3h8l4 4v14H6zM14 3v4h4",
  dir: "M9 6l6 6-6 6",
  esq: "M15 6l-6 6 6 6",
  baixo: "M6 9l6 6 6-6",
  cima: "M6 15l6-6 6 6",
  updown: "M8 9l4-4 4 4M8 15l4 4 4-4",
  quadro: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  lista: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  trofeu: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z",
  alerta: "M12 4 2.5 20h19zM12 10v4M12 17h.01",
  claquete: "M4 9h16v11H4zM4 9l2.5-5 3 1L7 9M9.5 5l3 1L10 9M14.5 6l3 1L15 9",
  selecionar: "M4 6l2 2 3-3M4 13l2 2 3-3M12 7h8M12 14h8M4 20h16",
  bolsa: "M4 4h16v16H4zM4 9h16M9 4v5",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  ramo: "M6 4v10a4 4 0 0 0 4 4h4M18 4v6M6 8h0M18 10a4 4 0 0 1-4 4",
  tarefas: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  painel: "M4 4h16v16H4zM9 4v16",
  ajustes: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  etiqueta: "M3 12V4h8l9 9-8 8zM7.5 7.5h.01",
  olho: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  enviar: "M5 12h14M13 6l6 6-6 6",
  copiar: "M8 8h12v12H8zM16 8V4H4v12h4",
};

export function Icone({ n, s = 16 }: { n: keyof typeof P | string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[n] ?? ""} />
    </svg>
  );
}

// Barrinhas da prioridade (Baixa 1, Média 2, Alta 3); Urgente vira alerta.
export function IcPrioridade({ p, s = 14 }: { p: string; s?: number }) {
  if (p === "urgente") return <Icone n="alerta" s={s} />;
  const n = p === "alta" ? 3 : p === "media" ? 2 : 1;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2 + i * 4.5} y={11 - i * 3.5} width="3" height={3 + i * 3.5} rx="0.8" fill="currentColor" opacity={i < n ? 1 : 0.25} />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <clipPath id="ltgc"><rect x="1" y="1" width="30" height="30" rx="8" /></clipPath>
      <g clipPath="url(#ltgc)">
        <rect width="32" height="32" fill="#0b1430" />
        <rect y="23" width="32" height="9" fill="#e3263c" />
        <rect y="23" width="32" height="2" fill="#f7c21b" />
      </g>
      <text x="16" y="19" textAnchor="middle" fontFamily="Sora, Inter, sans-serif" fontWeight="800" fontSize="11.5" fill="#fff" letterSpacing="-0.4">LTG</text>
    </svg>
  );
}
