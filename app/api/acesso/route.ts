import { NextResponse } from "next/server";
import { jsonError, sameOrigin } from "@/lib/api";
import { accessTokenForCookie, gateMisconfigured } from "@/lib/auth";
import { ACCESS_COOKIE, ACCESS_SECONDS, signCookie } from "@/lib/gate";
import { log } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** HTTPS de verdade (inclusive atrás do proxy do Render, que envia x-forwarded-proto). */
function isHttps(req: Request): boolean {
  return (req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? new URL(req.url).protocol.replace(":", "")) === "https";
}

const cookieBase = (req: Request) => ({
  httpOnly: true, // o JavaScript da página não consegue ler o cookie
  sameSite: "lax" as const,
  secure: isHttps(req), // navegadores descartam cookie "Secure" recebido por http (ex.: npm start local)
  path: "/",
});

/** Entrar: confere o token e grava o cookie de acesso (8 horas). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "Origem não permitida.");
  // Freio contra tentativa de adivinhar o token: poucas tentativas por minuto por IP.
  const retry = rateLimit(req, "acesso", 8);
  if (retry !== null) {
    return jsonError(429, "Muitas tentativas. Aguarde um minuto e tente novamente.", { "Retry-After": String(retry) });
  }
  if (gateMisconfigured()) {
    return jsonError(503, "Acesso desativado: defina ACCESS_TOKEN ou ADMIN_TOKEN nas configurações do servidor.");
  }

  const body = (await req.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token.slice(0, 200) : "";
  const matched = accessTokenForCookie(token);
  if (!matched) {
    log.warn("Tentativa de acesso com token inválido");
    return jsonError(401, "Token incorreto.");
  }
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(ACCESS_COOKIE, signCookie(matched), { ...cookieBase(req), maxAge: ACCESS_SECONDS });
  return res;
}

/** Sair: apaga o cookie. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "Origem não permitida.");
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(ACCESS_COOKIE, "", { ...cookieBase(req), maxAge: 0 });
  return res;
}
