// O video mora fora do app (Drive, YouTube, Loom, Dropbox). Aqui o link vira
// player e miniatura sem precisar baixar nada.

export function driveId(url: string) {
  const m =
    url.match(/drive\.google\.com\/file\/d\/([\w-]{20,})/) ??
    url.match(/drive\.google\.com\/.*[?&]id=([\w-]{20,})/);
  return m?.[1] ?? null;
}

export function youtubeId(url: string) {
  if (!/youtu\.?be/.test(url)) return null;
  return url.match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? null;
}

export type Player = { tipo: "iframe" | "video" | "link"; src: string };

export function player(url: string): Player {
  const d = driveId(url);
  if (d) return { tipo: "iframe", src: `https://drive.google.com/file/d/${d}/preview` };
  const y = youtubeId(url);
  if (y) return { tipo: "iframe", src: `https://www.youtube.com/embed/${y}` };
  const loom = url.match(/loom\.com\/share\/([\w]+)/)?.[1];
  if (loom) return { tipo: "iframe", src: `https://www.loom.com/embed/${loom}` };
  if (/dropbox\.com/.test(url)) {
    const u = new URL(url);
    u.searchParams.delete("dl");
    u.searchParams.set("raw", "1");
    return { tipo: "video", src: u.toString() };
  }
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return { tipo: "video", src: url };
  return { tipo: "link", src: url };
}

// Miniatura do Drive so aparece se o arquivo estiver como "qualquer pessoa
// com o link". Sem isso o card cai no fundo com o codigo.
export function miniatura(url: string | null | undefined) {
  if (!url) return null;
  const d = driveId(url);
  if (d) return `https://drive.google.com/thumbnail?id=${d}&sz=w480`;
  const y = youtubeId(url);
  if (y) return `https://i.ytimg.com/vi/${y}/hqdefault.jpg`;
  return null;
}

export function linkValido(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// Link de download direto quando o servico deixa (Drive e Dropbox); nos
// outros, abre o proprio link.
export function baixar(url: string) {
  const d = driveId(url);
  if (d) return `https://drive.google.com/uc?export=download&id=${d}`;
  if (/dropbox\.com/.test(url)) {
    const u = new URL(url);
    u.searchParams.set("dl", "1");
    return u.toString();
  }
  return url;
}
