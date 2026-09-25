import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Camada de autenticação — ponto ÚNICO de controle de acesso.
 *
 * Fluxo alvo:  Login -> Aplicação -> Busca -> Google Drive
 *
 * Todas as rotas da API chamam `requireUser()` antes de qualquer trabalho. Na v1 não há login
 * institucional: `getSession()` devolve um usuário anônimo permitido. Para ativar login
 * (Google Workspace / Microsoft Entra / OIDC), basta implementar a leitura da sessão aqui
 * (cookie assinado ou biblioteca de auth) e devolver null quando não autenticado; nenhuma
 * rota nem componente precisa mudar. Permissões por setor entram em `Session.roles`.
 */
export interface Session {
  userId: string;
  roles: Array<"user" | "admin">;
}

export function getSession(_req: Request): Session | null {
  return { userId: "anonimo", roles: ["user"] };
}

export function requireUser(req: Request): Session | null {
  return getSession(req);
}

// Painéis de hospedagem às vezes gravam espaços ou aspas junto do valor colado.
const clean = (v: string) => v.trim().replace(/^["']|["']$/g, "");

/** Em produção, sem ADMIN_TOKEN o painel fica desativado (nenhum token é aceito). */
export function adminDisabled(): boolean {
  return process.env.NODE_ENV === "production" && !clean(env.adminToken);
}

/**
 * Administração na v1: token secreto em ADMIN_TOKEN (cabeçalho Authorization: Bearer ...).
 * Substituir por `session.roles.includes("admin")` quando houver login.
 */
export function requireAdmin(req: Request): boolean {
  const expected = clean(env.adminToken);
  if (!expected) return process.env.NODE_ENV !== "production";
  const given = clean(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
