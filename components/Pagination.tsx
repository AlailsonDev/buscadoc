import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

const b =
  "inline-flex min-h-11 items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({ page, total, pageSize, onChange }: Props) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginação dos resultados" className="mt-6 flex items-center justify-between gap-3 pb-[env(safe-area-inset-bottom)]">
      <button type="button" className={b} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
      </button>
      <span className="text-sm text-muted" aria-live="polite">
        Página {page} de {pages}
      </span>
      <button type="button" className={b} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Próxima <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
