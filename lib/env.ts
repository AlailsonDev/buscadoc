import "server-only";

/** Painéis de hospedagem costumam gravar aspas e espaços junto do valor colado; remove ambos. */
function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

function int(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  get demoMode() {
    return clean(process.env.DEMO_MODE).toLowerCase() === "true";
  },
  get rootFolderId() {
    return clean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
  },
  get serviceAccountEmail() {
    return clean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  },
  get privateKey() {
    // Painéis de hospedagem costumam gravar as quebras de linha como "\n" literal.
    // Aceita a chave em uma linha só (com "\n" literal, como no JSON) ou com quebras de linha reais.
    return clean(process.env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");
  },
  get catalogTtlMs() {
    return int(process.env.CATALOG_TTL_MINUTES, 15) * 60_000;
  },
  get accessToken() {
    return process.env.ACCESS_TOKEN ?? "";
  },
  get adminToken() {
    return process.env.ADMIN_TOKEN ?? "";
  },
  get rateSearch() {
    return int(process.env.RATE_LIMIT_SEARCH_PER_MIN, 30);
  },
  get rateFile() {
    return int(process.env.RATE_LIMIT_FILE_PER_MIN, 60);
  },
};

/** Lista as variáveis obrigatórias ausentes para o modo Drive real. */
export function missingDriveConfig(): string[] {
  const missing: string[] = [];
  if (!env.rootFolderId) missing.push("GOOGLE_DRIVE_ROOT_FOLDER_ID");
  if (!env.serviceAccountEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!env.privateKey) missing.push("GOOGLE_PRIVATE_KEY");
  return missing;
}
