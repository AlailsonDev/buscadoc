import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuscaDoc — Busca de documentos institucionais",
  description: "Pesquise documentos institucionais pelo número do processo, nome ou palavra-chave.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "BuscaDoc", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c4076", // barra do navegador no celular
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
        >
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
