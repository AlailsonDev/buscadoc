import Link from "next/link";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Header } from "@/components/Header";
import { requirePageSession } from "@/lib/auth";

export const metadata = { title: "Administração — BuscaDoc" };

export default async function AdminPage() {
  const session = await requirePageSession();

  return (
    <>
      <Header userEmail={session.email} />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-brand-800">Administração</h1>
        {session.isAdmin ? (
          <>
            <p className="mt-1 text-muted">Situação da conexão com o Google Drive e do catálogo de documentos.</p>
            <AdminDashboard />
          </>
        ) : (
          <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-medium">Acesso restrito a administradores.</p>
            <p className="mt-1 text-sm">Sua conta não tem permissão para ver esta página.</p>
            <Link href="/" className="mt-4 inline-flex min-h-11 items-center underline">
              Voltar para a busca
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
