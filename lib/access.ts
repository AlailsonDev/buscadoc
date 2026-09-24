/**
 * Regras de acesso (puras, testáveis): quem pode entrar e quem é administrador.
 * As listas vêm de variáveis de ambiente; nenhum e-mail fica no código.
 */

/** Tenant fixo da Microsoft para contas pessoais (Outlook.com, Hotmail, Live). */
export const MS_PERSONAL_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

/** "a@x.com, B@y.com" -> ["a@x.com", "b@y.com"] */
export function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((v) => v.trim().replace(/^["']|["']$/g, "").toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, admins: string[]): boolean {
  return !!email && admins.includes(email.trim().toLowerCase());
}

/** Administradores também são autorizados a entrar. Lista vazia = ninguém entra (falha segura). */
export function isAllowedEmail(email: string | null | undefined, allowed: string[], admins: string[]): boolean {
  const e = email?.trim().toLowerCase();
  return !!e && (allowed.includes(e) || admins.includes(e));
}

/**
 * Contas Microsoft pessoais têm e-mail verificado. Contas de trabalho/escola de OUTROS tenants
 * podem ter o e-mail definido pelo administrador do tenant delas, então só aceitamos os tenants
 * explicitamente liberados (ex.: o Microsoft 365 da própria instituição).
 */
export function isTenantAllowed(tid: string | undefined, extraTenants: string[]): boolean {
  const t = tid?.toLowerCase();
  return !!t && (t === MS_PERSONAL_TENANT || extraTenants.includes(t));
}

/** Lê as claims de um JWT recebido direto do endpoint de token da Microsoft (via TLS). */
export function decodeJwtPayload(jwt: string | undefined): Record<string, unknown> {
  try {
    const part = jwt?.split(".")[1];
    if (!part) return {};
    return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return {};
  }
}
