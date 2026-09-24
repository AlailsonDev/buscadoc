"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialValue?: string;
  onSearch: (query: string) => void;
  size?: "lg" | "md";
  autoFocus?: boolean;
}

/** A busca só dispara com ENTER ou clique em "Buscar" — nunca a cada tecla. */
export function SearchBar({ initialValue = "", onSearch, size = "lg", autoFocus }: Props) {
  const [value, setValue] = useState(initialValue);
  const lg = size === "lg";

  return (
    <form
      role="search"
      className={cn("w-full", lg ? "flex flex-col items-center gap-5" : "flex items-center gap-2")}
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) onSearch(q);
      }}
    >
      <label htmlFor={`busca-${size}`} className="sr-only">
        Número do processo, nome do documento ou palavra-chave
      </label>
      <div className={cn("relative", lg ? "w-full" : "min-w-0 flex-1")}>
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted",
            lg ? "left-5 h-5 w-5" : "left-3.5 h-4 w-4",
          )}
          aria-hidden
        />
        <input
          id={`busca-${size}`}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={120}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Digite o processo ou nome do documento"
          className={cn(
            "w-full rounded-full border border-line bg-white text-ink shadow-sm transition-shadow placeholder:text-slate-400 hover:shadow-md focus:border-brand-600 focus:shadow-md focus:outline-none focus:ring-4 focus:ring-brand-100",
            lg ? "py-4 pl-14 pr-5 text-base sm:text-lg" : "min-h-11 py-2.5 pl-10 pr-3 text-base",
          )}
        />
      </div>
      {lg ? (
        <button
          type="submit"
          className="rounded-full bg-brand-700 min-h-12 w-full px-10 py-3 text-base font-medium sm:w-auto text-white transition-colors hover:bg-brand-800"
        >
          Buscar
        </button>
      ) : (
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-full bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 sm:px-6"
        >
          Buscar
        </button>
      )}
    </form>
  );
}
