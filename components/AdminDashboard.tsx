"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, FolderOpen, RefreshCw } from "lucide-react";
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

/** Painel administrativo. O acesso é decidido pela sessão (lista ADMIN_EMAILS); não há token para digitar. */
export function AdminDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (method: "GET" | "POST") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(method === "GET" ? "/api/admin/status" : "/api/admin/sync", { method });
      if (res.status === 401) return void (window.location.href = "/login");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Não foi possível obter as informações.");
      } else {
        setStatus((await res.json()) as Status);
      }
    } catch {
      setError("Não foi possível obter as informações.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    call("GET");
  }, [call]);

  return (
    <div className="mt-6 space-y-6">
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
            onClick={() => call("POST")}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-medium text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
            {busy ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        </>
      )}
    </div>
  );
}
