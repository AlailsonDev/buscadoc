import { AdminDashboard } from "@/components/AdminDashboard";
import { Header } from "@/components/Header";

export const metadata = { title: "Administração — BuscaCGM" };

export default function AdminPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-brand-800">Administração</h1>
        <p className="mt-1 text-muted">Situação da conexão com o Google Drive e do catálogo de documentos.</p>
        <AdminDashboard />
      </main>
    </>
  );
}
