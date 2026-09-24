import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import { decodeJwtPayload, isAdminEmail, isAllowedEmail, isTenantAllowed, parseList } from "@/lib/access";

/**
 * Configuração do Auth.js. Login com Google e Microsoft (Gmail, Outlook.com e contas Microsoft 365).
 * Quem pode entrar é decidido só por lista de e-mails (ALLOWED_EMAILS / ADMIN_EMAILS): como qualquer
 * pessoa tem conta Gmail/Outlook, um login válido NÃO significa acesso autorizado.
 *
 * Variáveis: AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, AUTH_MICROSOFT_ID/SECRET, ALLOWED_EMAILS,
 * ADMIN_EMAILS e (opcional) AUTH_MICROSOFT_ALLOWED_TENANTS. Veja .env.example.
 */

const googleId = process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET;
const msId = process.env.AUTH_MICROSOFT_ID;
const msSecret = process.env.AUTH_MICROSOFT_SECRET;

export const enabledProviders = {
  google: !!(googleId && googleSecret),
  microsoft: !!(msId && msSecret),
};

/**
 * Provedor Microsoft como OAuth2 puro + endpoint userinfo do Graph. O provedor OIDC padrão exige
 * um tenant específico e falha com contas pessoais/multi-tenant ("common") ao validar o `iss`.
 * O id_token vem direto do endpoint de token (TLS + segredo do cliente), então basta ler o `tid`.
 */
const microsoft: Provider = {
  id: "microsoft",
  name: "Microsoft",
  type: "oauth",
  clientId: msId,
  clientSecret: msSecret,
  authorization: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    params: { scope: "openid profile email", prompt: "select_account" },
  },
  token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userinfo: "https://graph.microsoft.com/oidc/userinfo",
  checks: ["pkce", "state"],
  profile(profile: Record<string, unknown>, tokens: { id_token?: string }) {
    const claims = decodeJwtPayload(tokens.id_token);
    return {
      id: String(profile.sub),
      name: (profile.name as string | undefined) ?? null,
      email: ((profile.email as string | undefined) ?? (claims.preferred_username as string | undefined) ?? null),
      tid: claims.tid as string | undefined,
    };
  },
};

const providers: Provider[] = [];
if (enabledProviders.google) providers.push(Google({ clientId: googleId, clientSecret: googleSecret }));
if (enabledProviders.microsoft) providers.push(microsoft);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true, // atrás do proxy do Render/Vercel
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // sessão de 8 horas
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile, user }) {
      const allowed = parseList(process.env.ALLOWED_EMAILS);
      const admins = parseList(process.env.ADMIN_EMAILS);
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (account?.provider === "google" && profile?.email_verified !== true) return false;
      if (account?.provider === "microsoft") {
        const tid = (user as { tid?: string }).tid;
        if (!isTenantAllowed(tid, parseList(process.env.AUTH_MICROSOFT_ALLOWED_TENANTS))) return false;
      }
      const ok = isAllowedEmail(email, allowed, admins);
      if (!ok) console.warn("[AUTH] Login negado: e-mail fora da lista de autorizados");
      return ok;
    },
    async jwt({ token }) {
      // Recalcula a cada requisição: remover alguém da lista vale já na próxima ação, sem esperar a sessão expirar.
      const email = token.email?.toLowerCase() ?? "";
      token.allowed = isAllowedEmail(email, parseList(process.env.ALLOWED_EMAILS), parseList(process.env.ADMIN_EMAILS));
      token.admin = isAdminEmail(email, parseList(process.env.ADMIN_EMAILS));
      return token;
    },
    async session({ session, token }) {
      (session.user as { admin?: boolean; allowed?: boolean }).admin = token.admin === true;
      (session.user as { admin?: boolean; allowed?: boolean }).allowed = token.allowed === true;
      return session;
    },
  },
});
