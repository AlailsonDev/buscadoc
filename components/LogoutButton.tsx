"use client";

import { LogOut } from "lucide-react";

/** Encerra o acesso: apaga o cookie e volta para a tela do token. */
export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/acesso", { method: "DELETE" }).catch(() => {});
        window.location.href = "/acesso";
      }}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-medium hover:bg-slate-50 sm:w-auto sm:px-3"
      aria-label="Sair"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
