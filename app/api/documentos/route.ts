import { guard, jsonError } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { NameSearchProvider, normalize } from "@/lib/search";
import { DRIVE_ID_RE } from "@/lib/utils";
import type { KindFilter, PeriodFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: KindFilter[] = ["todos", "pdf", "word", "excel", "powerpoint", "imagem", "outros"];
const PERIODS: PeriodFilter[] = ["qualquer", "hoje", "7dias", "30dias", "ano"];
const provider = new NameSearchProvider();
const MIN_REFRESH_MS = 60_000;

export async function GET(req: Request) {
  const blocked = guard(req, "search", env.rateSearch);
  if (blocked) return blocked;

  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 120);
  const kind = (sp.get("tipo") ?? "todos") as KindFilter;
  const period = (sp.get("periodo") ?? "qualquer") as PeriodFilter;
  const folderId = sp.get("pasta") ?? undefined;
  const page = Number.parseInt(sp.get("pagina") ?? "1", 10);
  const pageSize = Number.parseInt(sp.get("porPagina") ?? "20", 10);

  if (normalize(q).length < 2) return jsonError(400, "Digite ao menos 2 caracteres para pesquisar.");
  if (!KINDS.includes(kind) || !PERIODS.includes(period)) return jsonError(400, "Filtro inválido.");
  if (folderId !== undefined && !DRIVE_ID_RE.test(folderId)) return jsonError(400, "Pasta inválida.");
  if (!Number.isInteger(page) || page < 1 || page > 10_000) return jsonError(400, "Página inválida.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return jsonError(400, "Tamanho de página inválido.");

  try {
    const catalog = getCatalog();
    const params = { q, kind, period, folderId, page, pageSize };
    let result = provider.search((await catalog.get()).records, params);
    if (result.total === 0) {
      // Sem resultados: o documento pode ser novo no Drive. Relê (no máximo 1x por minuto) e tenta de novo.
      const fresh = await catalog.refreshIfOlderThan(MIN_REFRESH_MS).catch(() => null);
      if (fresh) result = provider.search(fresh.records, params);
    }
    log.info(`Busca realizada (${q.length} caracteres, tipo=${kind}, periodo=${period})`);
    log.info(`${result.total} resultados encontrados`);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(502, "Não foi possível realizar a busca.");
  }
}
