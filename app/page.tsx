import Link from "next/link";
import { FileSearch, ShieldCheck } from "lucide-react";
import { HomeSearch } from "@/components/HomeSearch";
import { LogoutButton } from "@/components/LogoutButton";
import { gateRequired, requirePageAccess } from "@/lib/auth";

export default async function Home() {
  await requirePageAccess();
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-[env(safe-area-inset-top)]">
      {gateRequired() && (
        <div className="flex justify-end pt-3">
          <LogoutButton />
        </div>
      )}

      <main id="conteudo" className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="animate-fade-up w-full max-w-2xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm sm:h-16 sm:w-16">
            <FileSearch className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-brand-800 sm:text-5xl">BuscaCGM</h1>
          <p className="mt-2 text-base text-muted sm:text-lg">Busca de documentos institucionais</p>

          <div className="mt-8 sm:mt-10">
            <HomeSearch />
          </div>
          <p className="mt-5 text-sm text-muted">Pesquise pelo número do processo, nome ou palavra-chave.</p>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-muted">
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> Uso restrito a servidores autorizados da CGM Jaboatão dos Guararapes
        </p>
        {/* O acesso é protegido pelo token de administração; o link apenas facilita a navegação. */}
        <Link href="/admin" className="inline-flex min-h-11 items-center px-3 underline hover:text-brand-700">
          Administração
        </Link>
      </footer>
    </div>
  );
}
