import "server-only";
import { requireUser } from "./auth";
import { rateLimit } from "./rate-limit";

export function jsonError(status: number, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Autenticação + rate limit. Retorna uma Response de erro para encerrar a requisição, ou null. */
export function guard(req: Request, group: string, limitPerMin: number): Response | null {
  if (!requireUser(req)) return jsonError(401, "Autenticação necessária.");
  const retry = rateLimit(req, group, limitPerMin);
  if (retry !== null) {
    return jsonError(429, "Muitas requisições. Tente novamente em instantes.", { "Retry-After": String(retry) });
  }
  return null;
}
