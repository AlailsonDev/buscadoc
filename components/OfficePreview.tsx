"use client";

import { useEffect, useState } from "react";
import { Download, FileWarning, Loader2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { sanitizeDocHtml } from "@/lib/sanitize-html";

interface Props {
  url: string;
  kind: "word" | "excel";
  size: number | null;
  /** Zoom em % (100 = tamanho normal). */
  zoom: number;
}

type Sheet = { name: string; rows: string[][]; truncated: boolean };
type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "word"; html: string }
  | { status: "excel"; sheets: Sheet[] };

// Limites para manter a planilha fluida no celular.
const MAX_ROWS = 1000;
const MAX_COLS = 60;

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  // Sem separador de milhar: anos, códigos e números de processo devem aparecer como no Excel (2026, não 2.026).
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 6, useGrouping: false });
  }
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}

/** Remove linhas e colunas totalmente vazias, para o cabeçalho fixo ser a primeira linha com conteúdo. */
function compactRows(rows: string[][]): string[][] {
  const kept = rows.filter((r) => r.some((c) => c !== ""));
  const width = Math.max(0, ...kept.map((r) => r.length));
  const usedCols: number[] = [];
  for (let c = 0; c < width; c++) if (kept.some((r) => (r[c] ?? "") !== "")) usedCols.push(c);
  return kept.map((r) => usedCols.map((c) => r[c] ?? ""));
}

/**
 * Converte .docx (mammoth) e .xlsx (read-excel-file) no próprio navegador. As bibliotecas são
 * carregadas só quando o usuário abre o documento. O texto do Word é reflowable (quebra para a
 * largura da tela), então lê bem no celular; planilhas rolam na horizontal.
 */
export function OfficePreview({ url, kind, size, zoom }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    // Nunca deixar o usuário preso em "carregando": após 90 s mostra a opção de baixar.
    const timer = setTimeout(() => {
      ctrl.abort();
      setState({ status: "error" });
    }, 90_000);
    (async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("download");
        const buffer = await res.arrayBuffer();

        if (kind === "word") {
          const mammoth = (await import("mammoth")).default ?? (await import("mammoth"));
          const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
          setState({ status: "word", html: sanitizeDocHtml(value) });
        } else {
          const { default: readXlsxFile } = await import("read-excel-file/browser");
          const parsed = await readXlsxFile(new Blob([buffer]));
          const sheets: Sheet[] = parsed.map((s) => ({
            name: s.sheet,
            truncated: s.data.length > MAX_ROWS,
            rows: compactRows(s.data.slice(0, MAX_ROWS).map((r) => r.slice(0, MAX_COLS).map(formatCell))),
          }));
          setState({ status: "excel", sheets });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      }
    })();
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [url, kind]);

  if (state.status === "loading") {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" aria-hidden />
        <p>Preparando a visualização{size ? ` (${formatBytes(size)})` : ""}…</p>
        <p className="text-sm">Arquivos grandes podem levar alguns instantes.</p>
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

  // O zoom altera o tamanho base da fonte; o conteúdo usa unidades relativas (em).
  const fontSize = `${(16 * zoom) / 100}px`;

  if (state.status === "word") {
    return (
      <div className="h-full overflow-auto overscroll-contain p-2 sm:p-6">
        <article
          className="doc-content mx-auto max-w-3xl rounded-lg bg-white p-4 shadow-sm sm:p-10"
          style={{ fontSize }}
          dangerouslySetInnerHTML={{ __html: state.html || "<p><em>Documento sem texto para exibir.</em></p>" }}
        />
      </div>
    );
  }

  const sheet = state.sheets[Math.min(sheetIndex, state.sheets.length - 1)];
  return (
    <div className="flex h-full min-h-0 flex-col">
      {state.sheets.length > 1 && (
        <div role="tablist" aria-label="Planilhas" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-white px-2 pt-2">
          {state.sheets.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              role="tab"
              type="button"
              aria-selected={i === sheetIndex}
              onClick={() => setSheetIndex(i)}
              className={cn(
                "min-h-11 shrink-0 rounded-t-lg border border-b-0 px-4 text-sm font-medium sm:min-h-9",
                i === sheetIndex ? "border-line bg-slate-100 text-brand-800" : "border-transparent text-muted hover:bg-slate-50",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white" style={{ fontSize }}>
        {sheet.rows.length === 0 ? (
          <p className="p-6 text-center text-muted">Esta planilha está vazia.</p>
        ) : (
          <table className="w-max min-w-full border-collapse text-[0.875em]">
            <tbody>
              {sheet.rows.map((row, r) => (
                <tr key={r} className={r === 0 ? "sticky top-0 z-10 bg-slate-100 font-semibold" : "odd:bg-white even:bg-slate-50/60"}>
                  {row.map((cell, c) => (
                    <td key={c} className="min-w-20 max-w-72 border border-line px-2.5 py-1.5 align-top break-words">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {sheet.truncated && (
        <p className="shrink-0 border-t border-line bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Mostrando as primeiras {MAX_ROWS.toLocaleString("pt-BR")} linhas. Baixe o arquivo para ver tudo.
        </p>
      )}
    </div>
  );
}
