import { redirect } from "next/navigation";
import { AlertTriangle, FileSearch, ShieldCheck } from "lucide-react";
import { AccessForm } from "@/components/AccessForm";
import { gateMisconfigured, pageHasAccess } from "@/lib/auth";

export const metadata = { title: "Acesso — BuscaCGM" };

export default async function AcessoPage() {
  if (await pageHasAccess()) redirect("/");

  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
          <FileSearch className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-800">BuscaCGM</h1>
        <p className="mt-2 text-muted">Informe o token de acesso para pesquisar os documentos.</p>

        {gateMisconfigured() ? (
          <p role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Nenhum token de acesso está configurado neste servidor. Avise o administrador.
          </p>
        ) : (
          <AccessForm />
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> Acesso restrito a servidores autorizados
        </p>
      </div>
    </main>
  );
}
