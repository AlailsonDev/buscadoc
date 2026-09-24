import "server-only";
import { Readable } from "node:stream";
import { auth as gauth, drive as driveClient, type drive_v3 } from "@googleapis/drive";
import { env, missingDriveConfig } from "./env";
import { log } from "./logger";
import { DRIVE_ID_RE } from "./utils";
import type { DriveFileRaw, DriveFolder, DriveListing, DriveSource, FileStream } from "./types";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const FIELDS = "id,name,mimeType,size,modifiedTime,parents";

function toRaw(f: drive_v3.Schema$File): DriveFileRaw | null {
  if (!f.id || !f.name) return null;
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType ?? "application/octet-stream",
    size: f.size ? Number(f.size) : null,
    modifiedTime: f.modifiedTime ?? new Date(0).toISOString(),
    parentId: f.parents?.[0] ?? null,
  };
}

/**
 * Integração real com o Google Drive via Service Account.
 * Estratégia: listar TUDO que a conta enxerga em páginas de 1000 itens (poucas requisições)
 * e montar a hierarquia em memória, em vez de uma requisição por pasta/arquivo.
 * A conta só enxerga o que foi compartilhado com ela; mesmo assim o catálogo descarta
 * qualquer item que não descenda da pasta raiz configurada.
 */
export class GoogleDriveSource implements DriveSource {
  readonly mode = "drive" as const;
  private client: drive_v3.Drive | null = null;

  private get drive(): drive_v3.Drive {
    if (!this.client) {
      const missing = missingDriveConfig();
      if (missing.length) throw new Error(`Configuração ausente: ${missing.join(", ")}`);
      const jwt = new gauth.JWT({
        email: env.serviceAccountEmail,
        key: env.privateKey,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
      this.client = driveClient({ version: "v3", auth: jwt });
    }
    return this.client;
  }

  async listAll(): Promise<DriveListing> {
    const drive = this.drive;
    const folders: DriveFolder[] = [];
    const files: DriveFileRaw[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const res = await drive.files.list({
        q: "trashed = false",
        fields: `nextPageToken, files(${FIELDS})`,
        pageSize: 1000,
        pageToken,
        corpora: "user",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });
      pages++;
      for (const f of res.data.files ?? []) {
        const raw = toRaw(f);
        if (!raw) continue;
        if (raw.mimeType === FOLDER_MIME) folders.push({ id: raw.id, name: raw.name, parentId: raw.parentId });
        // Arquivos nativos do Google (Docs/Sheets/atalhos) não têm conteúdo binário: fora da v1.
        else if (!raw.mimeType.startsWith("application/vnd.google-apps.")) files.push(raw);
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    const root = await drive.files.get({ fileId: env.rootFolderId, fields: "name", supportsAllDrives: true });
    log.info(`Listagem concluída em ${pages} requisição(ões)`);
    return { rootName: root.data.name ?? "Pasta raiz", folders, files };
  }

  async getFile(id: string): Promise<DriveFileRaw | null> {
    if (!DRIVE_ID_RE.test(id)) return null;
    try {
      const res = await this.drive.files.get({ fileId: id, fields: FIELDS, supportsAllDrives: true });
      if (res.data.mimeType === FOLDER_MIME) return null;
      return toRaw(res.data);
    } catch {
      return null;
    }
  }

  async openFile(id: string): Promise<FileStream> {
    const res = await this.drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "stream" },
    );
    const len = Number(res.headers?.["content-length"]);
    return {
      stream: Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>,
      size: Number.isFinite(len) && len > 0 ? len : null,
    };
  }
}
