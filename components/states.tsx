import { AlertTriangle, SearchX } from "lucide-react";

export function EmptyState() {
  return (
    <div role="status" className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <SearchX className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold">Nenhum documento encontrado</h2>
      <p className="mt-1 text-muted">Tente pesquisar usando outro termo ou número de processo.</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-red-600" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-red-900">Não foi possível realizar a busca.</h2>
      <p className="mt-1 text-red-800">{message ?? "Tente novamente em alguns instantes."}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 min-h-11 rounded-xl bg-red-700 px-6 text-sm font-medium text-white hover:bg-red-800"
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Carregando resultados…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse gap-4 rounded-2xl border border-line bg-white p-5">
          <div className="h-12 w-12 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="h-8 w-40 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
