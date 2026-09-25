import { guard, jsonError } from "@/lib/api";
import { adminDisabled, requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const blocked = guard(req, "admin", 20, { access: false });
  if (blocked) return blocked;
  if (adminDisabled()) {
    return jsonError(503, "Painel desativado: defina a variável ADMIN_TOKEN nas configurações do servidor.");
  }
  if (!requireAdmin(req)) return jsonError(401, "Acesso administrativo negado.");

  const catalog = getCatalog();
  // Primeiro acesso: tenta carregar para que o status reflita a conexão real.
  if (!catalog.status().lastSync) await catalog.get().catch(() => {});
  return Response.json(catalog.status(), { headers: { "Cache-Control": "no-store" } });
}
