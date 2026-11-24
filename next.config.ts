import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ferramenta interna: nao indexar, nao otimizar imagem remota.
  images: { unoptimized: true },
  // O Worker usa a versao "web" do isomorphic-ws (o rastreio do Next so
  // copiava a versao node e o build da Cloudflare quebrava).
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@libsql/isomorphic-ws/*"],
  },
};
export default nextConfig;
