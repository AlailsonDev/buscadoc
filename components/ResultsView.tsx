"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DocumentDTO, KindFilter, PeriodFilter, SearchResult } from "@/lib/types";
import { DocumentList } from "./DocumentList";
import { DocumentViewer } from "./DocumentViewer";
import { Filters } from "./Filters";
import { Header } from "./Header";
import { Pagination } from "./Pagination";
import { SearchBar } from "./SearchBar";
import { EmptyState, ErrorState, LoadingState } from "./states";

const PAGE_SIZE = 20;

type State =
  | { status: "loading" }
  | { status: "error"; message?: string }
  | { status: "done"; data: SearchResult };

export function ResultsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const kind = (params.get("tipo") ?? "todos") as KindFilter;
  const period = (params.get("periodo") ?? "qualquer") as PeriodFilter;
  const page = Math.max(1, Number.parseInt(params.get("pagina") ?? "1", 10) || 1);

  const [state, setState] = useState<State>({ status: "loading" });
  const [viewing, setViewing] = useState<DocumentDTO | null>(null);
  const [attempt, setAttempt] = useState(0);

  // O estado da busca vive na URL (compartilhável e com botão Voltar funcionando).
  const navigate = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) (v ? sp.set(k, v) : sp.delete(k));
      router.push(`${pathname}?${sp.toString()}`);
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (!q.trim()) {
      router.replace("/");
      return;
    }
    const ctrl = new AbortController();
    setState({ status: "loading" });
    const sp = new URLSearchParams({ q, tipo: kind, periodo: period, pagina: String(page), porPagina: String(PAGE_SIZE) });

    fetch(`/api/documentos?${sp}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.ok) return setState({ status: "done", data: (await res.json()) as SearchResult });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ status: "error", message: res.status === 400 || res.status === 429 ? body.error : undefined });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      });
    return () => ctrl.abort(); // evita respostas antigas e chamadas duplicadas
  }, [q, kind, period, page, attempt, router]);

  return (
    <>
      <Header>
        <SearchBar key={q} size="md" initialValue={q} onSearch={(v) => navigate({ q: v, pagina: null })} />
      </Header>

      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {state.status === "done" &&
              `${state.data.total.toLocaleString("pt-BR")} ${state.data.total === 1 ? "documento encontrado" : "documentos encontrados"}`}
          </p>
          <Filters
            kind={kind}
            period={period}
            onChange={(f) =>
              navigate({ tipo: f.kind === "todos" ? null : f.kind, periodo: f.period === "qualquer" ? null : f.period, pagina: null })
            }
          />
        </div>

        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => setAttempt((a) => a + 1)} />}
        {state.status === "done" &&
          (state.data.total === 0 ? (
            <EmptyState />
          ) : (
            <>
              <DocumentList docs={state.data.items} onView={setViewing} />
              <Pagination
                page={state.data.page}
                total={state.data.total}
                pageSize={state.data.pageSize}
                onChange={(p) => {
                  navigate({ pagina: p > 1 ? String(p) : null });
                  window.scrollTo({ top: 0 });
                }}
              />
            </>
          ))}
      </main>

      {viewing && <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
