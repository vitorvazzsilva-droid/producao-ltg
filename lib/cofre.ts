// Cifra a chave de API de cada pessoa (AES-GCM com uma chave derivada do
// SESSION_SECRET). No banco fica so o texto cifrado.

const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) throw new Error("SESSION_SECRET nao configurado");
  const base = await crypto.subtle.digest("SHA-256", enc.encode("vega-chave:" + segredo));
  return crypto.subtle.importKey("raw", base, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function cifrar(texto: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chave(), enc.encode(texto));
  return `${b64(iv)}.${b64(c)}`;
}

export async function decifrar(guardado: string) {
  const [iv, c] = guardado.split(".");
  const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(iv) }, await chave(), deB64(c));
  return new TextDecoder().decode(p);
}
