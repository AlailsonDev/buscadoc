import { Suspense } from "react";
import { ResultsView } from "@/components/ResultsView";
import { requirePageSession } from "@/lib/auth";

export const metadata = { title: "Resultados — BuscaDoc" };

export default async function DocumentosPage() {
  const session = await requirePageSession();
  return (
    <Suspense>
      <ResultsView userEmail={session.email} />
    </Suspense>
  );
}
