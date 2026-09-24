export type FileKind = "pdf" | "word" | "excel" | "powerpoint" | "image" | "text" | "other";
export type KindFilter = "todos" | "pdf" | "word" | "excel" | "powerpoint" | "imagem" | "outros";
export type PeriodFilter = "qualquer" | "hoje" | "7dias" | "30dias" | "ano";

/** Registro interno do catálogo (nunca enviado inteiro ao cliente). */
export interface DocumentRecord {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  kind: FileKind;
  size: number | null;
  modifiedTime: string; // ISO
  /** Caminho de pastas abaixo da raiz, ex.: ["Processos", "2026"]. */
  folderPath: string[];
  /** IDs das pastas ancestrais (da raiz até a pasta pai). Base do futuro filtro por pasta. */
  ancestorIds: string[];
  /** Chaves pré-computadas para busca (ver lib/search.ts). */
  searchKey: string;
  compactKey: string;
  pathKey: string;
}

/** Representação enviada ao navegador: apenas metadados necessários. */
export interface DocumentDTO {
  id: string;
  name: string;
  extension: string;
  kind: FileKind;
  size: number | null;
  modifiedTime: string;
  folder: string;
  previewable: boolean;
}

export interface SearchParams {
  q: string;
  kind: KindFilter;
  period: PeriodFilter;
  /** Preparado para filtro por pasta (ID de pasta ancestral). */
  folderId?: string;
  page: number;
  pageSize: number;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: DocumentDTO[];
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface DriveFileRaw {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  parentId: string | null;
}

export interface DriveListing {
  rootName: string;
  folders: DriveFolder[];
  files: DriveFileRaw[];
}

export interface FileStream {
  stream: ReadableStream<Uint8Array>;
  size: number | null;
}

/** Fonte de dados: Google Drive real ou modo demonstração. */
export interface DriveSource {
  readonly mode: "drive" | "demo";
  /** Lista pastas e arquivos visíveis à conta (a filtragem pela raiz é feita no catálogo). */
  listAll(): Promise<DriveListing>;
  /** Metadados de um arquivo específico (usado quando o ID não está no catálogo em cache). */
  getFile(id: string): Promise<DriveFileRaw | null>;
  openFile(id: string): Promise<FileStream>;
}
