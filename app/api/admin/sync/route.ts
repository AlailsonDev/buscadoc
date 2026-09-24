import { guard, jsonError, sameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = await guard(req, "admin", 20);
  if (blocked) return blocked;
  if (!(await requireAdmin())) return jsonError(403, "Acesso restrito a administradores.");
  if (!sameOrigin(req)) return jsonError(403, "Origem não permitida.");

  const catalog = getCatalog();
  try {
    await catalog.sync();
    log.info("Sincronização manual concluída");
  } catch {
    // o motivo resumido fica em status().error
  }
  return Response.json(catalog.status(), { headers: { "Cache-Control": "no-store" } });
}
