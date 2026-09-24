import "server-only";
import { redirect } from "next/navigation";
import { auth, enabledProviders } from "@/auth";

/**
 * Camada de autenticação — ponto ÚNICO de controle de acesso.
 *
 *   Login (Google/Microsoft) -> lista de e-mails autorizados -> Aplicação -> Busca -> Google Drive
 *
 * Toda rota da API chama `guard()` (lib/api.ts) e toda página protegida chama `requirePageSession()`.
 * A configuração do Auth.js está em /auth.ts; as regras de quem entra, em lib/access.ts.
 */
export interface Session {
  userId: string;
  email: string | null;
  isAdmin: boolean;
}

export function anyProviderConfigured(): boolean {
  return enabledProviders.google || enabledProviders.microsoft;
}

/**
 * Em produção o login é sempre exigido (sem provedor configurado, ninguém entra: falha segura).
 * Só em desenvolvimento, sem nenhum provedor configurado, o acesso fica aberto para facilitar testes.
 */
export function authRequired(): boolean {
  return process.env.NODE_ENV === "production" || anyProviderConfigured();
}

export async function getSession(): Promise<Session | null> {
  if (!authRequired()) return { userId: "dev", email: null, isAdmin: true };
  const s = await auth();
  const user = s?.user as { email?: string | null; admin?: boolean; allowed?: boolean } | undefined;
  if (!user?.email || user.allowed !== true) return null;
  return { userId: user.email, email: user.email, isAdmin: user.admin === true };
}

export async function requireUser(): Promise<Session | null> {
  return getSession();
}

export async function requireAdmin(): Promise<boolean> {
  return (await getSession())?.isAdmin === true;
}

/** Para páginas (server components): sem sessão válida, vai para /login. */
export async function requirePageSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
