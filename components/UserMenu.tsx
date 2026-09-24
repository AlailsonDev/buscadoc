import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

/** E-mail do usuário logado e botão Sair. Sem e-mail (modo desenvolvimento aberto), não aparece. */
export function UserMenu({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <form action={logout} className="flex shrink-0 items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-muted lg:inline" title={email}>
        {email}
      </span>
      <button
        type="submit"
        className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-medium hover:bg-slate-50 sm:w-auto sm:px-3"
        aria-label="Sair"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </form>
  );
}
