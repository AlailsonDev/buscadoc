import { redirect } from "next/navigation";
import { AlertTriangle, FileSearch, ShieldCheck } from "lucide-react";
import { enabledProviders } from "@/auth";
import { authRequired, getSession } from "@/lib/auth";
import { loginWith } from "./actions";

export const metadata = { title: "Entrar — BuscaDoc" };

const btn =
  "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-5 font-medium text-ink shadow-sm transition-colors hover:bg-slate-50";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 23 23" className="h-5 w-5" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

const ERRORS: Record<string, string> = {
  AccessDenied: "Este e-mail não está autorizado a acessar o BuscaDoc. Solicite acesso ao administrador.",
  Configuration: "O login não está configurado corretamente. Avise o administrador.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/");
  const { error } = await searchParams;
  const noProvider = !enabledProviders.google && !enabledProviders.microsoft;

  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
          <FileSearch className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-800">BuscaDoc</h1>
        <p className="mt-2 text-muted">Entre para pesquisar os documentos institucionais.</p>

        {error && (
          <p role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {ERRORS[error] ?? "Não foi possível entrar. Tente novamente."}
          </p>
        )}

        {noProvider ? (
          <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Nenhum método de login está configurado neste servidor. Avise o administrador.
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {enabledProviders.google && (
              <form action={loginWith.bind(null, "google")}>
                <button type="submit" className={btn}>
                  <GoogleLogo /> Entrar com Google
                </button>
              </form>
            )}
            {enabledProviders.microsoft && (
              <form action={loginWith.bind(null, "microsoft")}>
                <button type="submit" className={btn}>
                  <MicrosoftLogo /> Entrar com Microsoft
                </button>
              </form>
            )}
          </div>
        )}

        {!authRequired() && (
          <p className="mt-6 text-xs text-muted">Modo de desenvolvimento: sem login configurado, o acesso é liberado.</p>
        )}
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> Acesso restrito a servidores autorizados
        </p>
      </div>
    </main>
  );
}
