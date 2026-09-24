import { guard, jsonError } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";
import { toDTO } from "@/lib/search";
import { DRIVE_ID_RE } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await guard(req, "file", env.rateFile);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  if (!DRIVE_ID_RE.test(id)) return jsonError(400, "Identificador inválido.");
  try {
    const doc = await getCatalog().resolveAuthorized(id);
    if (!doc) return jsonError(404, "Documento não encontrado.");
    return Response.json(toDTO(doc), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(502, "Não foi possível consultar o documento.");
  }
}
