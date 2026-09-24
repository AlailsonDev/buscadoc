import { guard, jsonError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const blocked = await guard(req, "admin", 20);
  if (blocked) return blocked;
  if (!(await requireAdmin())) return jsonError(403, "Acesso restrito a administradores.");

  const catalog = getCatalog();
  // Primeiro acesso: tenta carregar para que o status reflita a conexão real.
  if (!catalog.status().lastSync) await catalog.get().catch(() => {});
  return Response.json(catalog.status(), { headers: { "Cache-Control": "no-store" } });
}
