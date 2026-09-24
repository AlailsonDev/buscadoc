"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, FolderOpen, Lock, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Status {
  mode: "drive" | "demo";
  documentCount: number;
  lastSync: string | null;
  rootName: string | null;
  connected: boolean;
  syncing: boolean;
  error: string | null;
}

const TOKEN_KEY = "buscadoc-admin-token";

function Stat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon} {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{children}</div>
    </div>
  );
}

/** Painel básico. O token fica só na sessão do navegador; será substituído pelo login institucional. */
export function AdminDashboard() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (method: "GET" | "POST", t: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(method === "GET" ? "/api/admin/status" : "/api/admin/sync", {
        method,
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (res.status === 401) {
        setStatus(null);
        setError("Acesso negado. Informe o token de administração.");
      } else if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus(null);
        setError(body.error ?? "Não foi possível obter as informações.");
      } else {
        setStatus((await res.json()) as Status);
        try {
          sessionStorage.setItem(TOKEN_KEY, t);
        } catch {}
      }
    } catch {
      setError("Não foi possível obter as informações.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let saved = "";
    try {
      saved = sessionStorage.getItem(TOKEN_KEY) ?? "";
    } catch {}
    setToken(saved);
    // Sem token salvo, não consulta: evita um 401 desnecessário ao abrir a página.
    if (saved) call("GET", saved);
  }, [call]);

  return (
    <div className="mt-6 space-y-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          call("GET", token);
        }}
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="admin-token" className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Token de administração
          </label>
          <input
            id="admin-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-line px-3 py-2 text-base focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <button type="submit" className="min-h-11 rounded-lg border border-line bg-white px-5 text-sm font-medium hover:bg-slate-50">
          Entrar
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {status && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat icon={<Database className="h-4 w-4" aria-hidden />} label="Documentos indexados">
              {status.documentCount.toLocaleString("pt-BR")}
            </Stat>
            <Stat icon={<RefreshCw className="h-4 w-4" aria-hidden />} label="Última sincronização">
              {formatDateTime(status.lastSync)}
            </Stat>
            <Stat icon={<FolderOpen className="h-4 w-4" aria-hidden />} label="Pasta principal">
              {status.rootName ?? "—"}
            </Stat>
            <Stat icon={<span aria-hidden>●</span>} label="Status">
              <span className={status.connected ? "text-emerald-700" : "text-red-700"}>
                {status.mode === "demo"
                  ? "Modo demonstração"
                  : status.connected
                    ? "Conectado ao Google Drive"
                    : "Sem conexão com o Google Drive"}
              </span>
            </Stat>
          </div>
          {status.error && (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {status.error}
            </p>
          )}
          <button
            type="button"
            disabled={busy || status.syncing}
            onClick={() => call("POST", token)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-medium sm:w-auto text-white hover:bg-brand-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
            {busy ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        </>
      )}
    </div>
  );
}
