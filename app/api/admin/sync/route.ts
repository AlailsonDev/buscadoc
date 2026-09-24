import { guard, jsonError } from "@/lib/api";
import { adminDisabled, requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guard(req, "admin", 20);
  if (blocked) return blocked;
  if (adminDisabled()) {
    return jsonError(503, "Painel desativado: defina a variável ADMIN_TOKEN nas configurações do servidor.");
  }
  if (!requireAdmin(req)) return jsonError(401, "Acesso administrativo negado.");

  const catalog = getCatalog();
  try {
    await catalog.sync();
    log.info("Sincronização manual concluída");
  } catch {
    // o motivo resumido fica em status().error
  }
  return Response.json(catalog.status(), { headers: { "Cache-Control": "no-store" } });
}
