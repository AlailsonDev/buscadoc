import "server-only";
import { requireUser } from "./auth";
import { rateLimit } from "./rate-limit";

export function jsonError(status: number, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Autenticação + rate limit. Retorna uma Response de erro para encerrar a requisição, ou null. */
export async function guard(req: Request, group: string, limitPerMin: number): Promise<Response | null> {
  if (!(await requireUser())) return jsonError(401, "Sessão expirada ou acesso não autorizado.");
  const retry = rateLimit(req, group, limitPerMin);
  if (retry !== null) {
    return jsonError(429, "Muitas requisições. Tente novamente em instantes.", { "Retry-After": String(retry) });
  }
  return null;
}

/** Proteção extra contra CSRF em ações que alteram estado: a origem deve ser a própria aplicação. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // chamadas sem Origin (ex.: ferramentas) ainda dependem do cookie de sessão SameSite
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
