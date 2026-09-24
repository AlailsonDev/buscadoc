import "server-only";
import { env } from "./env";
import { DemoSource, DEMO_ROOT_ID } from "./demo-source";
import { GoogleDriveSource } from "./google-drive";
import { getExtension, getKind } from "./file-types";
import { log } from "./logger";
import { buildSearchKeys } from "./search";
import type { DocumentRecord, DriveFileRaw, DriveFolder, DriveSource } from "./types";

/**
 * Catálogo de metadados dos documentos (id, nome, tipo, tamanho, data, pasta).
 *
 * ---- INDEXAÇÃO (Fase 3) ----
 * `CatalogStore` é a fronteira para o futuro índice: Drive -> sincronização -> banco -> busca.
 * A implementação atual mantém tudo em memória (adequada até algumas dezenas de milhares de
 * arquivos). Para trocar por SQLite/Postgres, implemente `CatalogStore` gravando os registros
 * na sincronização (e, depois, o texto extraído/OCR) sem alterar rotas nem interface.
 */
export interface CatalogSnapshot {
  records: DocumentRecord[];
  byId: Map<string, DocumentRecord>;
  folders: Map<string, DriveFolder>;
  rootName: string;
  syncedAt: string;
}

export interface CatalogStatus {
  mode: "drive" | "demo";
  documentCount: number;
  lastSync: string | null;
  rootName: string | null;
  connected: boolean;
  syncing: boolean;
  error: string | null;
}

export interface CatalogStore {
  /** Snapshot atual (sincroniza na primeira chamada; renova em segundo plano quando expira). */
  get(): Promise<CatalogSnapshot>;
  /** Força nova leitura do Drive. */
  sync(): Promise<CatalogSnapshot>;
  /**
   * Relê o Drive só se o catálogo tiver mais de `minAgeMs`. Usado quando uma busca não acha nada:
   * o arquivo pode ter sido enviado ao Drive depois da última sincronização.
   */
  refreshIfOlderThan(minAgeMs: number): Promise<CatalogSnapshot>;
  status(): CatalogStatus;
  /**
   * Autorização de acesso a arquivo: só devolve documentos que pertencem à pasta raiz autorizada.
   * IDs desconhecidos são conferidos no Drive e só aceitos se descenderem da raiz.
   */
  resolveAuthorized(id: string): Promise<DocumentRecord | null>;
}

function rootId(): string {
  return env.demoMode ? DEMO_ROOT_ID : env.rootFolderId;
}

/** Sobe pela hierarquia até a raiz. Retorna null se a pasta não descende da raiz autorizada. */
function makeResolver(folders: Map<string, DriveFolder>, root: string) {
  type Where = { path: string[]; ids: string[] };
  const memo = new Map<string, Where | null>();
  function resolve(folderId: string | null, depth = 0): Where | null {
    if (!folderId || depth > 64) return null; // limite protege contra ciclos
    if (folderId === root) return { path: [], ids: [root] };
    if (memo.has(folderId)) return memo.get(folderId)!;
    const folder = folders.get(folderId);
    const parent = folder ? resolve(folder.parentId, depth + 1) : null;
    const where = folder && parent ? { path: [...parent.path, folder.name], ids: [...parent.ids, folder.id] } : null;
    memo.set(folderId, where);
    return where;
  }
  return resolve;
}

function toRecord(f: DriveFileRaw, where: { path: string[]; ids: string[] }): DocumentRecord {
  const extension = getExtension(f.name);
  return {
    id: f.id,
    name: f.name,
    extension,
    mimeType: f.mimeType,
    kind: getKind(extension),
    size: f.size,
    modifiedTime: f.modifiedTime,
    folderPath: where.path,
    ancestorIds: where.ids,
    ...buildSearchKeys(f.name, where.path),
  };
}

class MemoryCatalogStore implements CatalogStore {
  private snapshot: CatalogSnapshot | null = null;
  private inflight: Promise<CatalogSnapshot> | null = null;
  private lastError: string | null = null;
  private readonly source: DriveSource;

  constructor() {
    this.source = env.demoMode ? new DemoSource() : new GoogleDriveSource();
  }

  async get(): Promise<CatalogSnapshot> {
    if (!this.snapshot) return this.sync();
    if (Date.now() - Date.parse(this.snapshot.syncedAt) > env.catalogTtlMs && !this.inflight) {
      // Stale-while-revalidate: responde já com os dados atuais e renova em segundo plano.
      this.sync().catch(() => {});
    }
    return this.snapshot;
  }

  async refreshIfOlderThan(minAgeMs: number): Promise<CatalogSnapshot> {
    if (this.snapshot && Date.now() - Date.parse(this.snapshot.syncedAt) < minAgeMs) return this.snapshot;
    return this.sync();
  }

  /** Chamadas simultâneas compartilham a mesma leitura (evita requisições duplicadas ao Drive). */
  sync(): Promise<CatalogSnapshot> {
    if (this.inflight) return this.inflight;
    this.inflight = this.load()
      .then((s) => {
        this.snapshot = s;
        this.lastError = null;
        return s;
      })
      .catch((err) => {
        const msg = err instanceof Error && err.message.startsWith("Configuração ausente")
          ? err.message
          : "Falha ao consultar o Google Drive";
        this.lastError = msg;
        log.error("Falha na sincronização", err);
        throw err;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  private async load(): Promise<CatalogSnapshot> {
    const started = Date.now();
    const listing = await this.source.listAll();
    const folders = new Map(listing.folders.map((f) => [f.id, f]));
    const resolve = makeResolver(folders, rootId());

    const records: DocumentRecord[] = [];
    for (const f of listing.files) {
      const where = resolve(f.parentId);
      if (where) records.push(toRecord(f, where));
    }
    log.info(`Catálogo sincronizado: ${records.length} documentos em ${Date.now() - started} ms`);
    return {
      records,
      byId: new Map(records.map((r) => [r.id, r])),
      folders,
      rootName: listing.rootName,
      syncedAt: new Date().toISOString(),
    };
  }

  status(): CatalogStatus {
    return {
      mode: this.source.mode,
      documentCount: this.snapshot?.records.length ?? 0,
      lastSync: this.snapshot?.syncedAt ?? null,
      rootName: this.snapshot?.rootName ?? null,
      connected: this.snapshot !== null && this.lastError === null,
      syncing: this.inflight !== null,
      error: this.lastError,
    };
  }

  async resolveAuthorized(id: string): Promise<DocumentRecord | null> {
    const snap = await this.get();
    const known = snap.byId.get(id);
    if (known) return known;
    // Arquivo novo desde a última sincronização: valida ancestralidade antes de aceitar.
    const raw = await this.source.getFile(id);
    if (!raw) return null;
    const where = makeResolver(snap.folders, rootId())(raw.parentId);
    return where ? toRecord(raw, where) : null;
  }

  openFile(id: string) {
    return this.source.openFile(id);
  }
}

const g = globalThis as unknown as { __buscadocCatalog?: MemoryCatalogStore };

/** Singleton do processo (sobrevive ao hot reload em desenvolvimento). */
export function getCatalog(): MemoryCatalogStore {
  return (g.__buscadocCatalog ??= new MemoryCatalogStore());
}
