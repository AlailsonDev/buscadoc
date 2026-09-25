"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export function AccessForm() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        window.location.href = "/"; // recarrega para o servidor enxergar o cookie novo
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Não foi possível entrar. Tente novamente.");
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 text-left">
      <div>
        <label htmlFor="token-acesso" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Token de acesso
        </label>
        <input
          id="token-acesso"
          type="password"
          autoComplete="off"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          maxLength={200}
          className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !token.trim()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Entrar
      </button>
    </form>
  );
}
