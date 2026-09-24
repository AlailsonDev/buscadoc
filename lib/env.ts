import "server-only";

function int(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  get demoMode() {
    return process.env.DEMO_MODE === "true";
  },
  get rootFolderId() {
    return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() ?? "";
  },
  get serviceAccountEmail() {
    return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  },
  get privateKey() {
    // Painéis de hospedagem costumam gravar as quebras de linha como "\n" literal.
    return (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\n/g, "\n");
  },
  get catalogTtlMs() {
    return int(process.env.CATALOG_TTL_MINUTES, 15) * 60_000;
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
