import type { MetadataRoute } from "next";

/** Permite "Adicionar à tela inicial" no Android/Chrome com o ícone e o nome do BuscaCGM. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BuscaCGM — Busca de documentos institucionais",
    short_name: "BuscaCGM",
    description: "Pesquise documentos institucionais pelo número do processo, nome ou palavra-chave.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#1c4076",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
