import { guard, jsonError } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";
import { inlineMime } from "@/lib/file-types";
import { log } from "@/lib/logger";
import { DRIVE_ID_RE } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Content-Disposition seguro: nome original preservado (RFC 5987) + fallback ASCII. */
function disposition(type: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\;%]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guard(req, "file", env.rateFile);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  if (!DRIVE_ID_RE.test(id)) return jsonError(400, "Identificador inválido.");

  try {
    const catalog = getCatalog();
    // Autorização: o arquivo precisa pertencer à pasta raiz configurada.
    const doc = await catalog.resolveAuthorized(id);
    if (!doc) return jsonError(404, "Documento não encontrado.");

    const wantsInline = new URL(req.url).searchParams.get("inline") === "1";
    const mime = wantsInline ? inlineMime(doc.extension) : null; // só PDF/imagens são exibidos inline
    log.info(`Documento solicitado: ${doc.id} (${mime ? "visualização" : "download"})`);

    const file = await catalog.openFile(doc.id);
    const headers: Record<string, string> = {
      "Content-Type": mime ?? "application/octet-stream",
      "Content-Disposition": disposition(mime ? "inline" : "attachment", doc.name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (file.size !== null) headers["Content-Length"] = String(file.size);
    return new Response(file.stream, { headers });
  } catch {
    return jsonError(502, "Não foi possível obter o documento.");
  }
}
