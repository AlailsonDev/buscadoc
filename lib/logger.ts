import "server-only";

/**
 * Logs sem dados sensíveis: nunca registrar credenciais, tokens, conteúdo de
 * documentos nem o texto pesquisado (pode conter números de processo).
 */
export const log = {
  info: (msg: string) => console.log(`[DRIVE] ${msg}`),
  warn: (msg: string) => console.warn(`[DRIVE] ${msg}`),
  error: (msg: string, err?: unknown) => {
    // Apenas o tipo/mensagem curta do erro, sem stack nem objetos de resposta (podem conter cabeçalhos).
    const detail = err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : "";
    console.error(`[DRIVE] ${msg}${detail ? ` (${detail})` : ""}`);
  },
};
