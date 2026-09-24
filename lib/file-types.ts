import type { FileKind, KindFilter } from "./types";

const EXT_KIND: Record<string, FileKind> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  xls: "excel",
  xlsx: "excel",
  ppt: "powerpoint",
  pptx: "powerpoint",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  txt: "text",
};

/** Tipos que o navegador exibe com segurança dentro da aplicação. */
const INLINE_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : "";
}

export function getKind(extension: string): FileKind {
  return EXT_KIND[extension] ?? "other";
}

/** Word (.docx) e Excel (.xlsx) são convertidos no navegador; .doc/.xls antigos só têm download. */
const OFFICE_PREVIEW = new Set(["docx", "xlsx"]);
/** Acima disso a conversão no navegador fica pesada (principalmente em celulares): só download. */
export const MAX_OFFICE_PREVIEW_BYTES = 30 * 1024 * 1024;

export function isPreviewable(extension: string, size: number | null = null): boolean {
  if (extension in INLINE_MIME) return true;
  return OFFICE_PREVIEW.has(extension) && (size === null || size <= MAX_OFFICE_PREVIEW_BYTES);
}

/** Content-Type para exibição inline; só para tipos da lista, senão null (forçar download). */
export function inlineMime(extension: string): string | null {
  return INLINE_MIME[extension] ?? null;
}

export function matchesKind(kind: FileKind, filter: KindFilter): boolean {
  switch (filter) {
    case "todos":
      return true;
    case "outros":
      return kind === "other" || kind === "text";
    case "imagem":
      return kind === "image";
    default:
      return kind === filter;
  }
}

export const KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  powerpoint: "PowerPoint",
  image: "Imagem",
  text: "Texto",
  other: "Arquivo",
};
