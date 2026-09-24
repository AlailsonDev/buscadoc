import test from "node:test";
import assert from "node:assert/strict";
import { NameSearchProvider, buildSearchKeys, normalize } from "./search.ts";
import type { DocumentRecord } from "./types.ts";

function rec(id: string, name: string, path: string[] = [], modified = "2026-05-01T00:00:00Z"): DocumentRecord {
  return {
    id,
    name,
    extension: name.split(".").pop()!.toLowerCase(),
    mimeType: "x",
    kind: name.endsWith(".pdf") ? "pdf" : "word",
    size: 1,
    modifiedTime: modified,
    folderPath: path,
    ancestorIds: ["root", ...path],
    ...buildSearchKeys(name, path),
  };
}

const data = [
  rec("a1", "Processo 2026.000123-5.pdf", ["Processos", "2026"]),
  rec("a2", "Despacho - Processo 2026.000123-5.docx"),
  rec("a3", "Contrato de Limpeza Urbana 2026.pdf"),
  rec("a4", "Termo Aditivo - Limpeza Urbana.docx"),
  rec("a5", "Ofício nº 15.pdf"),
];
const run = (q: string, extra = {}) =>
  new NameSearchProvider().search(data, { q, kind: "todos", period: "qualquer", page: 1, pageSize: 20, ...extra });

test("normalize remove acentos e pontuação", () => {
  assert.equal(normalize("Ofício Nº 2026.000123-5"), "oficio n 2026 000123 5");
});
test("número sem pontuação encontra número com pontuação", () => {
  assert.deepEqual(run("2026000123").items.map((i) => i.id).sort(), ["a1", "a2"]);
});
test("número com pontuação diferente", () => {
  assert.equal(run("2026.000123-5").total, 2);
});
test("palavras separadas em qualquer ordem, sem acento", () => {
  assert.deepEqual(run("limpeza contrato").items.map((i) => i.id), ["a3"]);
  assert.equal(run("oficio").total, 1);
});
test("busca parcial", () => {
  assert.equal(run("limp").total, 2);
});
test("filtro de tipo e pasta", () => {
  assert.equal(run("processo", { kind: "word" }).total, 1);
  assert.equal(run("2026", { folderId: "Processos" }).total, 1);
});
test("filtro de período exclui antigos", () => {
  assert.equal(run("processo", { period: "hoje" }).total, 0);
});
