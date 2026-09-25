import { Suspense } from "react";
import { ResultsView } from "@/components/ResultsView";

export const metadata = { title: "Resultados — BuscaDoc" };

export default function DocumentosPage() {
  return (
    <Suspense>
      <ResultsView />
    </Suspense>
  );
}
