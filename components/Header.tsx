import Link from "next/link";
import { FileSearch } from "lucide-react";

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-6">
        <Link
          href="/"
          className="flex h-11 shrink-0 items-center gap-2 font-semibold text-brand-800"
          aria-label="BuscaDoc — página inicial"
        >
          <FileSearch className="h-6 w-6 text-brand-600" aria-hidden />
          <span className="hidden text-lg sm:inline">BuscaDoc</span>
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </header>
  );
}
