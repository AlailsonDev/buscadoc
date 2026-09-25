import { Suspense } from "react";
import { ResultsView } from "@/components/ResultsView";
import { gateRequired, requirePageAccess } from "@/lib/auth";

export const metadata = { title: "Resultados — BuscaDoc" };

export default async function DocumentosPage() {
  await requirePageAccess();
  return (
    <Suspense>
      <ResultsView canLogout={gateRequired()} />
    </Suspense>
  );
}
