// A build "legacy" do pdf.js (compatível com celulares mais antigos) não traz tipos próprios;
// reaproveita os tipos da build principal.
declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}
