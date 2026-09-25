"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Minus, Plus, X } from "lucide-react";
import type { DocumentDTO } from "@/lib/types";
import { FileTypeIcon } from "./FileTypeIcon";
import { OfficePreview } from "./OfficePreview";
import { PdfViewer } from "./PdfViewer";

const ZOOMS = [50, 75, 100, 125, 150, 200];

/**
 * Celulares e tablets: o Chrome do Android não exibe PDF dentro de iframe e o Safari do iOS mostra
 * só a primeira página. Nesses aparelhos (toque) o PDF é desenhado pela própria aplicação (pdf.js).
 */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || navigator.pdfViewerEnabled === false;
}

/**
 * Visualizador interno. Desktop: PDF no leitor nativo do navegador (iframe). Toque: leitor pdf.js.
 * Word/Excel: convertidos no navegador. Imagens: <img>. Demais tipos: apenas download.
 *
 * Voltar: o documento aberto faz parte da URL (?doc=...), então o gesto/botão "voltar" do celular
 * fecha o visualizador e mantém o usuário nos resultados (ver ResultsView).
 */
export function DocumentViewer({ doc, onClose }: { doc: DocumentDTO; onClose: () => void }) {
  const [zoom, setZoom] = useState(100);
  const [touch] = useState(isTouchDevice);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const base = `/api/documentos/${doc.id}/download`;
  const isPdf = doc.extension === "pdf";
  const isImage = doc.kind === "image" && doc.previewable;
  const isOffice = doc.previewable && (doc.extension === "docx" || doc.extension === "xlsx");
  const showZoom = isPdf || isImage || isOffice;
  const zoomOnMobile = isOffice || (isPdf && touch);

  // Fechar pela interface: quem abriu o visualizador (ResultsView) decide como fechar, voltando no histórico.
  const close = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Mantém o foco dentro do diálogo.
      const items = dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = (dir: 1 | -1) => {
    const i = ZOOMS.indexOf(zoom);
    setZoom(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + dir))]);
  };

  const iconBtn =
    "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white hover:bg-slate-50 disabled:opacity-40 sm:h-9 sm:w-9";
  const bigBtn = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-medium sm:w-auto";

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/60 sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Visualizando ${doc.name}`}
        className="animate-fade-up flex h-dvh w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[90dvh] sm:self-center sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:flex-wrap sm:gap-x-4 sm:px-4 sm:py-3">
          <button type="button" className={`${iconBtn} sm:hidden`} onClick={close} aria-label="Voltar para os resultados">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <FileTypeIcon kind={doc.kind} className="h-9 w-9 max-sm:hidden" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:basis-40 sm:text-base" title={doc.name}>
            {doc.name}
          </h2>

          {showZoom && (
            <div className={`items-center gap-1 ${zoomOnMobile ? "flex" : "hidden sm:flex"}`} role="group" aria-label="Zoom">
              <button type="button" className={iconBtn} onClick={() => step(-1)} disabled={zoom === ZOOMS[0]} aria-label="Diminuir zoom">
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span className="hidden w-14 text-center text-sm tabular-nums min-[420px]:inline" aria-live="polite">
                {zoom}%
              </span>
              <button
                type="button"
                className={iconBtn}
                onClick={() => step(1)}
                disabled={zoom === ZOOMS[ZOOMS.length - 1]}
                aria-label="Aumentar zoom"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          <a
            href={base}
            className={`${iconBtn} sm:w-auto sm:gap-2 sm:px-3 sm:text-sm sm:font-medium`}
            aria-label="Baixar documento"
          >
            <Download className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
            <span className="hidden sm:inline">Baixar</span>
          </a>
          <button ref={closeRef} type="button" className={`${iconBtn} max-sm:hidden`} onClick={close} aria-label="Fechar visualizador">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100">
          {isPdf && !touch ? (
            // key força o leitor a recarregar com o novo zoom (#zoom= só vale na abertura).
            <iframe
              key={zoom}
              title={`Documento ${doc.name}`}
              src={`${base}?inline=1#zoom=${zoom}`}
              className="h-full w-full border-0"
            />
          ) : isPdf ? (
            <PdfViewer url={base} size={doc.size} zoom={zoom} />
          ) : isOffice ? (
            <OfficePreview
              url={base}
              kind={doc.extension === "xlsx" ? "excel" : "word"}
              size={doc.size}
              zoom={zoom}
            />
          ) : isImage ? (
            <div className="h-full overflow-auto p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${base}?inline=1`}
                alt={doc.name}
                style={{ width: `${zoom}%`, maxWidth: "none" }}
                className="mx-auto h-auto bg-white shadow"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <FileTypeIcon kind={doc.kind} className="h-16 w-16" />
              <p className="max-w-sm text-lg text-ink">Este tipo de arquivo não possui visualização online.</p>
              <a href={base} className={`${bigBtn} max-w-xs bg-brand-700 text-white hover:bg-brand-800 sm:max-w-none`}>
                <Download className="h-4 w-4" aria-hidden /> Baixar documento
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
