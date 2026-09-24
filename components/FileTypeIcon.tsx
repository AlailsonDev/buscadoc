import { File, FileImage, FileSpreadsheet, FileText, FileType, Presentation } from "lucide-react";
import type { FileKind } from "@/lib/types";
import { KIND_LABEL } from "@/lib/file-types";

const MAP: Record<FileKind, { Icon: typeof File; cls: string }> = {
  pdf: { Icon: FileText, cls: "bg-red-50 text-red-700" },
  word: { Icon: FileType, cls: "bg-blue-50 text-blue-700" },
  excel: { Icon: FileSpreadsheet, cls: "bg-emerald-50 text-emerald-700" },
  powerpoint: { Icon: Presentation, cls: "bg-orange-50 text-orange-700" },
  image: { Icon: FileImage, cls: "bg-violet-50 text-violet-700" },
  text: { Icon: FileText, cls: "bg-slate-100 text-slate-600" },
  other: { Icon: File, cls: "bg-slate-100 text-slate-600" },
};

export function FileTypeIcon({ kind, className = "h-12 w-12" }: { kind: FileKind; className?: string }) {
  const { Icon, cls } = MAP[kind];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${cls} ${className}`}
      title={KIND_LABEL[kind]}
    >
      <Icon className="h-1/2 w-1/2" aria-hidden />
    </span>
  );
}
