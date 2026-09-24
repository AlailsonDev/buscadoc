import { Download, Eye, Folder } from "lucide-react";
import type { DocumentDTO } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { FileTypeIcon } from "./FileTypeIcon";

interface Props {
  doc: DocumentDTO;
  onView: (doc: DocumentDTO) => void;
}

// Alvos de toque de 44px+ no celular; botões dividem a largura do cartão.
const btn =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors sm:flex-none";

export function DocumentCard({ doc, onView }: Props) {
  return (
    <li className="animate-fade-up rounded-2xl border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <FileTypeIcon kind={doc.kind} className="h-10 w-10 sm:h-12 sm:w-12" />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            {doc.name}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {(doc.extension || "arquivo").toUpperCase()} • {formatBytes(doc.size)} • {formatDate(doc.modifiedTime)}
          </p>
          {doc.folder && (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-muted">
              <Folder className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="break-words">{doc.folder}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {doc.previewable && (
          <button
            type="button"
            onClick={() => onView(doc)}
            className={`${btn} bg-brand-700 text-white hover:bg-brand-800`}
            aria-label={`Visualizar ${doc.name}`}
          >
            <Eye className="h-4 w-4" aria-hidden /> Visualizar
          </button>
        )}
        <a
          href={`/api/documentos/${doc.id}/download`}
          className={`${btn} border border-line bg-white text-ink hover:bg-slate-50`}
          aria-label={`Baixar ${doc.name}`}
        >
          <Download className="h-4 w-4" aria-hidden /> Baixar
        </a>
      </div>
    </li>
  );
}
