import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { ACCESS_COOKIE, cleanToken, readCookie, tokenMatches, verifyCookie } from "./gate";

/**
 * Camada de autenticação — ponto ÚNICO de controle de acesso.
 *
 *   Token de acesso -> Aplicação -> Busca -> Google Drive
 *
 * Toda rota da API chama `guard()` (lib/api.ts) e toda página protegida chama `requirePageAccess()`.
 * Hoje o acesso é por token compartilhado (ACCESS_TOKEN, ou ADMIN_TOKEN se ACCESS_TOKEN não existir).
 * Para trocar por login institucional (Google Workspace / Microsoft / OIDC), reimplemente
 * `hasAccess` e `requirePageAccess` aqui; rotas e componentes não mudam.
 */

/** Tokens que dão acesso à aplicação. O de administrador também vale. */
function accessTokens(): string[] {
  return [cleanToken(env.accessToken), cleanToken(env.adminToken)].filter(Boolean);
}

/**
 * Em produção o token é sempre exigido (sem nenhum token configurado, ninguém entra: falha segura).
 * Só em desenvolvimento, sem nenhum token configurado, o acesso fica aberto.
 */
export function gateRequired(): boolean {
  return process.env.NODE_ENV === "production" || accessTokens().length > 0;
}

/** O servidor está em produção mas sem nenhum token configurado: acesso bloqueado. */
export function gateMisconfigured(): boolean {
  return gateRequired() && accessTokens().length === 0;
}

/** Devolve o token aceito que corresponde ao digitado (usado para assinar o cookie), ou null. */
export function accessTokenForCookie(input: string): string | null {
  const given = cleanToken(input);
  if (!tokenMatches(given, accessTokens())) return null;
  return accessTokens().find((t) => tokenMatches(given, [t])) ?? null;
}

/** O cookie de acesso da requisição é válido? */
export function hasAccess(req: Request): boolean {
  if (!gateRequired()) return true;
  return verifyCookie(readCookie(req.headers.get("cookie"), ACCESS_COOKIE), accessTokens());
}

/** Já tem acesso? (páginas) */
export async function pageHasAccess(): Promise<boolean> {
  if (!gateRequired()) return true;
  return verifyCookie((await cookies()).get(ACCESS_COOKIE)?.value, accessTokens());
}

/** Para páginas (server components): sem acesso, vai para a tela do token. */
export async function requirePageAccess(): Promise<void> {
  if (!(await pageHasAccess())) redirect("/acesso");
}

/** Em produção, sem ADMIN_TOKEN o painel fica desativado (nenhum token é aceito). */
export function adminDisabled(): boolean {
  return process.env.NODE_ENV === "production" && !cleanToken(env.adminToken);
}

/**
 * Administração: token secreto em ADMIN_TOKEN (cabeçalho Authorization: Bearer ...), pedido na
 * própria página /admin. Substituir por perfil de administrador quando houver login.
 */
export function requireAdmin(req: Request): boolean {
  const expected = cleanToken(env.adminToken);
  if (!expected) return process.env.NODE_ENV !== "production";
  return tokenMatches(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "", [expected]);
}
