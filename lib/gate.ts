import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Portão de acesso por token (funções puras, testáveis).
 * O usuário digita o token uma vez; o servidor grava um cookie assinado (HttpOnly) que vale por 8 horas.
 * O cookie não contém o token: só a data de expiração e uma assinatura HMAC calculada com ele.
 * Trocar o token no servidor invalida imediatamente todos os cookies emitidos.
 */
export const ACCESS_COOKIE = "buscadoc_access";
export const ACCESS_SECONDS = 8 * 60 * 60;

/** Painéis de hospedagem às vezes gravam espaços ou aspas junto do valor colado. */
export const cleanToken = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const sign = (token: string, exp: string) => createHmac("sha256", token).update(`buscadoc-access:${exp}`).digest("base64url");

/** O token digitado confere com algum dos tokens aceitos? (comparação em tempo constante) */
export function tokenMatches(input: string, accepted: string[]): boolean {
  const given = cleanToken(input);
  if (!given) return false;
  return accepted.some((t) => t && safeEqual(given, t));
}

/** Valor do cookie: "<expiração em ms>.<assinatura>" */
export function signCookie(token: string, now = Date.now()): string {
  const exp = String(now + ACCESS_SECONDS * 1000);
  return `${exp}.${sign(token, exp)}`;
}

export function verifyCookie(value: string | undefined, accepted: string[], now = Date.now()): boolean {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return accepted.some((t) => t && safeEqual(sig, sign(t, exp)));
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}
