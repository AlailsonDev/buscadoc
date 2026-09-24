import "server-only";
import type { DriveFileRaw, DriveFolder, DriveListing, DriveSource, FileStream } from "./types";

/** Fonte fictícia para testar a interface sem Google Drive (DEMO_MODE=true). */
export const DEMO_ROOT_ID = "demoroot00";
const ROOT = DEMO_ROOT_ID;
const folder = (id: string, name: string, parentId: string | null): DriveFolder => ({ id, name, parentId });

const FOLDERS: DriveFolder[] = [
  folder(ROOT, "Documentos Institucionais (demonstração)", null),
  folder("demofolder-proc", "Processos", ROOT),
  folder("demofolder-p26", "2026", "demofolder-proc"),
  folder("demofolder-p25", "2025", "demofolder-proc"),
  folder("demofolder-cont", "Contratos", ROOT),
  folder("demofolder-c26", "2026", "demofolder-cont"),
  folder("demofolder-ofi", "Ofícios", ROOT),
];

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  txt: "text/plain",
};

function buildFiles(): DriveFileRaw[] {
  const out: DriveFileRaw[] = [];
  let n = 0;
  const add = (parentId: string, name: string, size: number, daysAgo: number) => {
    const ext = name.split(".").pop()!;
    out.push({
      id: `demofile${String(++n).padStart(5, "0")}`,
      name,
      mimeType: MIME[ext] ?? "application/octet-stream",
      size,
      modifiedTime: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      parentId,
    });
  };
  add("demofolder-p26", "Processo 2026.000123-5.pdf", 2_450_000, 3);
  add("demofolder-p26", "Despacho - Processo 2026.000123-5.docx", 48_000, 5);
  add("demofolder-p26", "Ofício referente ao processo 2026.000123-5.pdf", 310_000, 9);
  add("demofolder-p26", "Processo 2026.000124-3.pdf", 1_100_000, 12);
  add("demofolder-p26", "Planilha de custos - Processo 2026.000124-3.xlsx", 92_000, 20);
  add("demofolder-p25", "Processo 2025.004410-1.pdf", 3_800_000, 240);
  add("demofolder-p25", "Parecer jurídico 2025.004410-1.docx", 61_000, 250);
  add("demofolder-cont", "Contrato Empresa XYZ.pdf", 870_000, 400);
  add("demofolder-c26", "Contrato de Limpeza Urbana 2026.pdf", 1_900_000, 30);
  add("demofolder-c26", "Termo Aditivo - Limpeza Urbana.docx", 55_000, 15);
  add("demofolder-c26", "Apresentação - Licitação de Limpeza.pptx", 4_200_000, 45);
  add("demofolder-ofi", "Ofício nº 015-2026.pdf", 150_000, 1);
  add("demofolder-ofi", "Ofício nº 016-2026.pdf", 152_000, 0);
  add("demofolder-ofi", "Foto da vistoria.png", 640_000, 60);
  add("demofolder-ofi", "Anotações da reunião.txt", 1_800, 7);
  add(ROOT, "Manual de procedimentos.pdf", 5_600_000, 500);
  // Volume para exercitar a paginação.
  for (let i = 1; i <= 60; i++) {
    add("demofolder-p26", `Processo 2026.${String(200 + i).padStart(6, "0")}-${i % 10}.pdf`, 200_000 + i * 1000, i);
  }
  return out;
}

/** PDF mínimo válido (uma página A4 com texto), gerado em código: sem binários no repositório. */
function samplePdf(title: string): Uint8Array {
  const safe = title.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "");
  const stream = `BT /F1 20 Tf 60 760 Td (BuscaDoc - documento de demonstracao) Tj 0 -30 Td /F1 14 Tf (${safe}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

// PNG 1x1 cinza
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

export class DemoSource implements DriveSource {
  readonly mode = "demo" as const;
  private files = buildFiles();

  async listAll(): Promise<DriveListing> {
    return { rootName: FOLDERS[0].name, folders: FOLDERS, files: this.files };
  }

  async getFile(id: string) {
    return this.files.find((f) => f.id === id) ?? null;
  }

  async openFile(id: string): Promise<FileStream> {
    const f = this.files.find((x) => x.id === id);
    if (!f) throw new Error("not found");
    const ext = f.name.split(".").pop()!;
    const bytes =
      ext === "pdf"
        ? samplePdf(f.name)
        : ext === "png"
          ? PNG
          : new TextEncoder().encode(`Arquivo de demonstração: ${f.name}\n`);
    return {
      size: bytes.length,
      stream: new ReadableStream({
        start(c) {
          c.enqueue(bytes);
          c.close();
        },
      }),
    };
  }
}
