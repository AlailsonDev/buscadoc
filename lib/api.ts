import "server-only";
import { hasAccess } from "./auth";
import { rateLimit } from "./rate-limit";

export function jsonError(status: number, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * Acesso + rate limit. Retorna uma Response de erro para encerrar a requisição, ou null.
 * `access: false` dispensa o cookie de acesso (usado no /admin, que tem seu próprio token).
 */
export function guard(req: Request, group: string, limitPerMin: number, opts: { access?: boolean } = {}): Response | null {
  if (opts.access !== false && !hasAccess(req)) return jsonError(401, "Acesso não autorizado. Informe o token de acesso.");
  const retry = rateLimit(req, group, limitPerMin);
  if (retry !== null) {
    return jsonError(429, "Muitas requisições. Tente novamente em instantes.", { "Retry-After": String(retry) });
  }
  return null;
}

/** Proteção extra contra CSRF em ações que alteram estado: a origem deve ser a própria aplicação. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
