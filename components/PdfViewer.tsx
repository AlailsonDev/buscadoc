"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileWarning, Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { formatBytes } from "@/lib/utils";

/**
 * Leitor de PDF dentro da aplicação (pdf.js), usado em celulares e tablets: o Chrome do Android
 * não exibe PDF embutido e, se o PDF abrisse em outra aba, o usuário perderia o botão Voltar.
 * Aqui o cabeçalho do visualizador (Voltar / Baixar / zoom) continua na tela.
 *
 * As páginas são desenhadas só quando chegam perto da área visível e liberadas ao sair,
 * para PDFs grandes não esgotarem a memória do aparelho.
 */

interface Props {
  url: string;
  size: number | null;
  /** Zoom em % (100 = largura da tela). */
  zoom: number;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; pdf: PDFDocumentProxy };

const GAP = 12; // espaço entre páginas (px)
const PAD = 8; // margem lateral (px)

function PdfPage({ pdf, pageNumber, width, defaultRatio }: { pdf: PDFDocumentProxy; pageNumber: number; width: number; defaultRatio: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(defaultRatio);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!visible) {
      canvas.width = 0; // libera a memória da página que saiu da tela
      canvas.height = 0;
      return;
    }
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.height / base.width);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width / base.width) * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${Math.floor((viewport.height / viewport.width) * width)}px`;
        task = page.render({ canvas, viewport });
        await task.promise;
      } catch {
        // renderização cancelada (rolagem rápida ou zoom): ignora
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, width, pdf, pageNumber]);

  return (
    <div
      ref={wrapRef}
      data-page={pageNumber}
      className="shrink-0 bg-white shadow"
      style={{ width, height: Math.floor(width * ratio) }}
    >
      <canvas ref={canvasRef} className="block" aria-label={`Página ${pageNumber}`} role="img" />
    </div>
  );
}

export function PdfViewer({ url, size, zoom }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [containerWidth, setContainerWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    // Nunca deixar o usuário preso em "carregando".
    const timer = setTimeout(() => {
      ctrl.abort();
      setState({ status: "error" });
    }, 90_000);
    (async () => {
      try {
        const res = await fetch(`${url}?inline=1`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("download");
        const data = new Uint8Array(await res.arrayBuffer());
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ data });
        loadingTask = task;
        const doc = await task.promise;
        clearTimeout(timer);
        setState({ status: "ready", pdf: doc });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      }
    })();
    return () => {
      clearTimeout(timer);
      ctrl.abort();
      loadingTask?.destroy().catch(() => {});
    };
  }, [url]);

  // Largura útil da tela, para as páginas ocuparem 100% (e crescerem com o zoom).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [state.status]);

  if (state.status === "loading") {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" aria-hidden />
        <p>Abrindo o PDF{size ? ` (${formatBytes(size)})` : ""}…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <FileWarning className="h-10 w-10 text-amber-600" aria-hidden />
        <p className="max-w-sm text-lg">Não foi possível exibir este PDF aqui. Você pode baixá-lo para abrir no seu aparelho.</p>
        <a
          href={url}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-700 px-5 font-medium text-white hover:bg-brand-800"
        >
          <Download className="h-4 w-4" aria-hidden /> Baixar documento
        </a>
      </div>
    );
  }

  const { pdf } = state;
  const pageWidth = Math.max(120, Math.floor(((containerWidth - PAD * 2) * zoom) / 100));

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-auto overscroll-contain"
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
        onScroll={(e) => {
          // Página atual = a que cruza o terço superior da área visível.
          const box = e.currentTarget;
          const mark = box.scrollTop + box.clientHeight / 3;
          let found = 1;
          for (const child of Array.from(box.querySelectorAll<HTMLElement>("[data-page]"))) {
            if (child.offsetTop <= mark) found = Number(child.dataset.page);
            else break;
          }
          setCurrent(found);
        }}
      >
        <div
          className="flex flex-col items-center"
          style={{ gap: GAP, padding: PAD, width: Math.max(containerWidth, pageWidth + PAD * 2) }}
        >
          {Array.from({ length: pdf.numPages }, (_, i) => (
            <PdfPage key={i + 1} pdf={pdf} pageNumber={i + 1} width={pageWidth} defaultRatio={1.414} />
          ))}
        </div>
      </div>
      <p
        className="pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white"
        aria-live="polite"
      >
        Página {current} de {pdf.numPages}
      </p>
    </div>
  );
}
