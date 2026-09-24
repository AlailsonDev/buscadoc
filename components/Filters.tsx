"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { KindFilter, PeriodFilter } from "@/lib/types";

const KIND_OPTIONS: Array<[KindFilter, string]> = [
  ["todos", "Todos"],
  ["pdf", "PDF"],
  ["word", "Word"],
  ["excel", "Excel"],
  ["powerpoint", "PowerPoint"],
  ["imagem", "Imagem"],
  ["outros", "Outros"],
];
const PERIOD_OPTIONS: Array<[PeriodFilter, string]> = [
  ["qualquer", "Qualquer período"],
  ["hoje", "Hoje"],
  ["7dias", "Últimos 7 dias"],
  ["30dias", "Últimos 30 dias"],
  ["ano", "Este ano"],
];

interface Props {
  kind: KindFilter;
  period: PeriodFilter;
  onChange: (next: { kind: KindFilter; period: PeriodFilter }) => void;
}

// Futuro: filtro por pasta (a API já aceita ?pasta=<id>); incluir aqui um seletor de pastas.

function Group<T extends string>({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string;
  options: Array<[T, string]>;
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label key={v} className="cursor-pointer">
            <input
              type="radio"
              name={legend}
              className="peer sr-only"
              checked={value === v}
              onChange={() => onPick(v)}
            />
            <span className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm hover:bg-slate-50 peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 sm:min-h-9 sm:px-3">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** No celular o painel abre como folha inferior (bottom sheet); no desktop, como menu suspenso. */
export function Filters({ kind, period, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = (kind !== "todos" ? 1 : 0) + (period !== "qualquer" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="painel-filtros"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium hover:bg-slate-50 sm:min-h-10"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filtros
        {active > 0 && (
          <span className="rounded-full bg-brand-700 px-1.5 text-xs text-white" aria-label={`${active} filtros ativos`}>
            {active}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div
            id="painel-filtros"
            role="dialog"
            aria-label="Filtros"
            className="fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] space-y-5 overflow-y-auto rounded-t-2xl border border-line bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:mt-2 sm:w-88 sm:rounded-2xl sm:p-4 sm:shadow-lg"
          >
            <div className="flex items-center justify-between sm:hidden">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"
                aria-label="Fechar filtros"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <Group legend="Tipo" options={KIND_OPTIONS} value={kind} onPick={(v) => onChange({ kind: v, period })} />
            <Group
              legend="Período"
              options={PERIOD_OPTIONS}
              value={period}
              onPick={(v) => onChange({ kind, period: v })}
            />

            <div className="flex items-center justify-between gap-3">
              {active > 0 ? (
                <button
                  type="button"
                  className="min-h-11 text-sm font-medium text-brand-700 underline sm:min-h-0"
                  onClick={() => onChange({ kind: "todos", period: "qualquer" })}
                >
                  Limpar filtros
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-xl bg-brand-700 px-6 text-sm font-medium text-white hover:bg-brand-800 sm:hidden"
              >
                Concluir
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
