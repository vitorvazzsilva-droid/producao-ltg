// Funcoes puras de cripto (WebCrypto): rodam no proxy, nas actions e no
// Worker sem depender de modulo do Node.

export const COOKIE = "ltg_sessao";
const DIAS = 30;

const enc = (s: string) => new TextEncoder().encode(s);
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export function novoSal() {
  return hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

// PBKDF2 com 100 mil voltas: e o teto que o Worker da Cloudflare aceita.
export async function hashSenha(senha: string, sal: string) {
  const chave = await crypto.subtle.importKey("raw", enc(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc(sal), iterations: 100_000, hash: "SHA-256" },
    chave,
    256
  );
  return hex(bits);
}

async function assinar(dado: string) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) throw new Error("SESSION_SECRET nao configurado");
  const chave = await crypto.subtle.importKey("raw", enc(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", chave, enc(dado)));
}

// Cookie = "id.validade.assinatura". O proxy confere so a assinatura; quem
// foi desativado cai na hora em que a pagina busca o usuario no banco.
export async function criarSessao(id: number) {
  const ate = Date.now() + DIAS * 86400000;
  return { valor: `${id}.${ate}.${await assinar(`${id}.${ate}`)}`, maxAge: DIAS * 86400 };
}

export async function lerSessao(valor: string | undefined) {
  if (!valor) return null;
  const [id, ate, sig] = valor.split(".");
  if (!id || !ate || !sig || Number(ate) < Date.now()) return null;
  try {
    return (await assinar(`${id}.${ate}`)) === sig ? Number(id) : null;
  } catch {
    return null;
  }
}

// Senha que da pra ditar no WhatsApp: sem 0/O nem 1/l.
export function senhaAleatoria() {
  const letras = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(10));
  return [...r].map((x) => letras[x % letras.length]).join("");
}
