import type { DocumentDTO } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";

export function DocumentList({ docs, onView }: { docs: DocumentDTO[]; onView: (d: DocumentDTO) => void }) {
  return (
    <ul className="space-y-3" aria-label="Documentos encontrados">
      {docs.map((d) => (
        <DocumentCard key={d.id} doc={d} onView={onView} />
      ))}
    </ul>
  );
}
