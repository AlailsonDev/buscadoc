/**
 * Regras de negócio da busca (puras, sem I/O).
 *
 * Fase 1: busca por nome/caminho sobre o catálogo em memória.
 *
 * ---- PESQUISA NO CONTEÚDO (Fase 3) ----
 * Ponto de extensão: `SearchProvider`. Hoje só existe `NameSearchProvider`. Para pesquisar
 * dentro dos documentos, criar um provider (ex.: `ContentSearchProvider`) que consulte um
 * índice de texto (SQLite FTS5 / Postgres tsvector / OpenSearch) alimentado pela sincronização
 * (extração de texto de PDF/Word e OCR para digitalizados) e combinar os resultados aqui,
 * por exemplo mesclando o score de nome com o score de conteúdo.
 */
import type { DocumentDTO, DocumentRecord, PeriodFilter, SearchParams, SearchResult } from "./types.ts";
import { isPreviewable, matchesKind } from "./file-types.ts";

/** Minúsculas, sem acentos, pontuação vira espaço. "2026.000123-5" -> "2026 000123 5". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Somente letras e dígitos, sem separadores. "2026.000123-5" -> "20260001235". */
export function compact(text: string): string {
  return normalize(text).replace(/ /g, "");
}

export function buildSearchKeys(name: string, folderPath: string[]) {
  return {
    searchKey: normalize(name),
    compactKey: compact(name),
    pathKey: normalize(folderPath.join(" ")),
  };
}

function periodStart(period: PeriodFilter, now = new Date()): number | null {
  switch (period) {
    case "hoje": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "7dias":
      return now.getTime() - 7 * 86_400_000;
    case "30dias":
      return now.getTime() - 30 * 86_400_000;
    case "ano":
      return new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return null;
  }
}

export function toDTO(r: DocumentRecord): DocumentDTO {
  return {
    id: r.id,
    name: r.name,
    extension: r.extension,
    kind: r.kind,
    size: r.size,
    modifiedTime: r.modifiedTime,
    folder: r.folderPath.join(" / "),
    previewable: isPreviewable(r.extension, r.size),
  };
}

/** Pontuação de um documento para os termos; 0 = não corresponde (todos os termos são obrigatórios). */
function score(r: DocumentRecord, tokens: string[], phrase: string, phraseCompact: string): number {
  let total = 0;
  for (const t of tokens) {
    const inName = r.searchKey.includes(t) || (t.length >= 3 && r.compactKey.includes(t));
    const inPath = !inName && r.pathKey.includes(t);
    if (!inName && !inPath) return 0;
    if (inName) {
      total += 10;
      // início de palavra vale mais que meio de palavra
      if (r.searchKey.startsWith(t) || r.searchKey.includes(` ${t}`)) total += 5;
    } else {
      total += 2;
    }
  }
  if (r.searchKey.includes(phrase)) total += 20; // frase inteira contígua
  if (phraseCompact.length >= 3 && r.compactKey.includes(phraseCompact)) total += 10; // ex.: número sem pontuação
  return total;
}

export interface SearchProvider {
  search(records: readonly DocumentRecord[], params: SearchParams): SearchResult;
}

export class NameSearchProvider implements SearchProvider {
  search(records: readonly DocumentRecord[], params: SearchParams): SearchResult {
    const tokens = normalize(params.q).split(" ").filter(Boolean);
    const phrase = tokens.join(" ");
    const phraseCompact = tokens.join("");
    const since = periodStart(params.period);

    const hits: Array<{ r: DocumentRecord; s: number }> = [];
    for (const r of records) {
      if (!matchesKind(r.kind, params.kind)) continue;
      if (since !== null && Date.parse(r.modifiedTime) < since) continue;
      if (params.folderId && !r.ancestorIds.includes(params.folderId)) continue;
      const s = tokens.length ? score(r, tokens, phrase, phraseCompact) : 1;
      if (s > 0) hits.push({ r, s });
    }

    hits.sort(
      (a, b) =>
        b.s - a.s ||
        Date.parse(b.r.modifiedTime) - Date.parse(a.r.modifiedTime) ||
        a.r.name.localeCompare(b.r.name, "pt-BR"),
    );

    const start = (params.page - 1) * params.pageSize;
    return {
      total: hits.length,
      page: params.page,
      pageSize: params.pageSize,
      items: hits.slice(start, start + params.pageSize).map((h) => toDTO(h.r)),
    };
  }
}
