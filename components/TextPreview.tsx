"use client";

import { useEffect, useState } from "react";
import { Download, FileWarning, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface Props {
  url: string;
  size: number | null;
  /** Zoom em % (100 = tamanho normal). */
  zoom: number;
}

type State = { status: "loading" } | { status: "error" } | { status: "ready"; text: string };

/** UTF-8 (com ou sem BOM); se o arquivo não for UTF-8 válido (comum em .txt do Windows), lê como Windows-1252. */
function decode(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Exibe arquivos de texto (.txt, .csv, .md, .json, .log, .xml) como texto simples, com quebra de linha para caber no celular. */
export function TextPreview({ url, size, zoom }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      ctrl.abort();
      setState({ status: "error" });
    }, 30_000);
    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.status === 401) return void (window.location.href = "/acesso");
        if (!res.ok) throw new Error("download");
        setState({ status: "ready", text: decode(await res.arrayBuffer()) });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" aria-hidden />
        <p>Carregando{size ? ` (${formatBytes(size)})` : ""}…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <FileWarning className="h-10 w-10 text-amber-600" aria-hidden />
        <p className="max-w-sm text-lg">Não foi possível exibir este arquivo online. Você pode baixá-lo para abrir no seu aparelho.</p>
        <a
          href={url}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-700 px-5 font-medium text-white hover:bg-brand-800"
        >
          <Download className="h-4 w-4" aria-hidden /> Baixar documento
        </a>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto overscroll-contain p-2 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-4 shadow-sm sm:p-8">
        {state.text.trim() === "" ? (
          <p className="text-center text-muted">Este arquivo está vazio.</p>
        ) : (
          // Texto puro dentro de <pre>: o React escapa o conteúdo, nada é interpretado como HTML.
          <pre
            className="font-mono leading-relaxed whitespace-pre-wrap text-ink [overflow-wrap:anywhere]"
            style={{ fontSize: `${(14 * zoom) / 100}px` }}
          >
            {state.text}
          </pre>
        )}
      </div>
    </div>
  );
}
