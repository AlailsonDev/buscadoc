import "server-only";

/**
 * Limitador simples em memória (janela fixa por IP + grupo).
 * Suficiente para uma única instância. Com várias instâncias/serverless, trocar por um
 * armazenamento compartilhado (Redis/Upstash) mantendo esta mesma assinatura.
 */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;

export function clientIp(req: Request): string {
  // Atrás do proxy do Render/Vercel o primeiro valor de x-forwarded-for é o cliente.
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconhecido").slice(0, 64);
}

/** Retorna segundos até liberar (429) ou null se dentro do limite. */
export function rateLimit(req: Request, group: string, limitPerMin: number): number | null {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);

  const key = `${group}:${clientIp(req)}`;
  const cur = hits.get(key);
  if (!cur || cur.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  cur.count++;
  return cur.count > limitPerMin ? Math.ceil((cur.resetAt - now) / 1000) : null;
}
