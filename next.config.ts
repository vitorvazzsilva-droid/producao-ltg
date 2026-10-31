import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ferramenta interna: nao indexar, nao otimizar imagem remota.
  images: { unoptimized: true },
};
export default nextConfig;
