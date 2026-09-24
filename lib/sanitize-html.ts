/**
 * Sanitização do HTML gerado a partir de .docx (executa no navegador).
 * Defesa em profundidade: o conversor já não gera scripts, mas o arquivo vem de fora da aplicação.
 * Mantém só marcação de texto/tabelas/imagens; remove scripts, estilos, formulários, eventos (on*)
 * e links com protocolos perigosos; imagens só como data: URI; tabelas ganham rolagem horizontal.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "a", "img", "blockquote", "span", "div",
]);
const ALLOWED_ATTRS = new Set(["href", "src", "alt", "colspan", "rowspan"]);

export function sanitizeDocHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Descarta o elemento inteiro (scripts, estilos, iframes...) mantendo nada do seu conteúdo.
        child.remove();
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        if (!ALLOWED_ATTRS.has(attr.name)) child.removeAttribute(attr.name);
      }
      if (tag === "a") {
        const href = child.getAttribute("href") ?? "";
        if (/^(https?:|mailto:|#)/i.test(href)) {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        } else {
          child.removeAttribute("href");
        }
      }
      if (tag === "img" && !/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(child.getAttribute("src") ?? "")) {
        child.remove();
        continue;
      }
      clean(child);
    }
  };
  clean(doc.body);

  // Tabelas largas rolam na horizontal em vez de estourar a tela do celular.
  for (const table of Array.from(doc.body.querySelectorAll("table"))) {
    const wrap = doc.createElement("div");
    wrap.className = "doc-table-wrap";
    table.replaceWith(wrap);
    wrap.appendChild(table);
  }
  return doc.body.innerHTML;
}
