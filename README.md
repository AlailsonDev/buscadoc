# BuscaCGM

Buscador interno de documentos institucionais. O **Google Drive é o repositório oficial**: nenhum arquivo é armazenado no servidor da aplicação. O backend consulta o Drive por meio de uma Service Account e entrega ao navegador apenas metadados, visualização e download.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + Lucide React
- `@googleapis/drive` (cliente oficial, somente o Drive)
- Sem banco de dados e sem Firebase na Fase 1 (ver Roadmap)

## Estrutura

```
app/
  page.tsx                      página inicial (busca)
  documentos/page.tsx           resultados, filtros e paginação
  admin/page.tsx                painel administrativo básico
  api/documentos/               GET busca
  api/documentos/[id]/          GET metadados
  api/documentos/[id]/download/ GET download (ou ?inline=1 para visualizar PDF/imagem)
  api/admin/{status,sync}/      status do catálogo e sincronização manual
components/                     interface (SearchBar, DocumentCard, DocumentViewer, Filters, ...)
lib/
  google-drive.ts   integração com o Drive (única camada que fala com o Google)
  demo-source.ts    fonte fictícia para DEMO_MODE
  catalog.ts        catálogo de metadados em memória (CatalogStore) + autorização de arquivos
  search.ts         regras de busca (normalização, pontuação, filtros) — puro e testado
  auth.ts           ponto único de autenticação/autorização
  rate-limit.ts, api.ts, env.ts, logger.ts, file-types.ts, utils.ts, types.ts
```

Separação de camadas: **interface** (`components/`, `app/`) → **API** (`app/api`, valida entradas) → **regras** (`lib/search.ts`) → **catálogo** (`lib/catalog.ts`) → **integração** (`lib/google-drive.ts`). A interface nunca fala com o Google.

## Como funciona a busca

O Drive não ignora pontuação (`2026000123` não casa com `2026.000123-5` na consulta nativa). Por isso a aplicação lista os metadados da pasta raiz e subpastas (poucas requisições, 1000 itens por página), guarda-os em memória e pesquisa sobre eles, normalizando texto (minúsculas, sem acentos, sem pontuação):

- busca parcial e por palavras separadas, em qualquer ordem;
- número de processo com ou sem pontuação;
- o caminho da pasta (`Processos / 2026`) é montado em memória durante a listagem, sem requisições extras.

O catálogo é renovado automaticamente após `CATALOG_TTL_MINUTES` (padrão 15), e também quando uma busca não retorna nada e o catálogo tem mais de 1 minuto (assim arquivos recém-enviados ao Drive aparecem sem esperar) (a resposta é imediata com os dados atuais e a renovação ocorre em segundo plano) ou manualmente em **/admin → Sincronizar agora**.

## Visualização de documentos

- **PDF:** no computador, pelo leitor nativo do navegador. No celular e no tablet, por um leitor próprio (`pdf.js`), porque o Chrome do Android não exibe PDF embutido e abrir em outra aba faria o usuário perder o botão Voltar. Ele desenha as páginas sob demanda (economiza memória) e mostra "Página X de N". O arquivo `public/pdf.worker.min.mjs` é uma cópia de `node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs`; ao atualizar o `pdfjs-dist`, copie-o novamente para manter as versões iguais.
- **Botão/gesto de voltar:** o documento aberto fica na URL (`?doc=<id>`). Voltar fecha o visualizador e mantém o usuário nos resultados; o link também pode ser compartilhado.
- **Imagens:** exibidas na própria página.
- **Word (.docx) e Excel (.xlsx):** convertidos no próprio navegador (`mammoth` e `read-excel-file`, carregados só ao abrir o documento). O Word reflui para a largura da tela; a planilha rola na horizontal, com abas por planilha e limite de 1.000 linhas exibidas. É uma visualização de leitura: formatações complexas podem diferir do original. O HTML convertido é sanitizado (`lib/sanitize-html.ts`).
- **Texto (.txt, .csv, .md, .json, .log, .xml):** exibido como texto simples (UTF-8 ou Windows-1252, detectado automaticamente), com zoom. Limite de 2 MB.
- Arquivos acima de 30 MB, e formatos antigos (`.doc`, `.xls`) e demais tipos, têm apenas download.

> Arquivos nativos do Google (Docs, Sheets, atalhos) não são listados na Fase 1, pois não possuem conteúdo binário para baixar. Envie os arquivos em formato PDF/Office.

## Instalação e execução local

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env.local     # edite conforme abaixo
npm run dev                    # http://localhost:3000
```

**Modo demonstração:** com `DEMO_MODE=true` (padrão do `.env.example`) a aplicação usa ~75 documentos fictícios, sem acessar o Google. Serve para conhecer a interface antes de configurar o Drive.

Outros comandos: `npm run build`, `npm start`, `npm run typecheck`, `npm test`.

## Configuração do Google Cloud e do Drive

1. **Criar projeto** em <https://console.cloud.google.com> (Seletor de projetos → Novo projeto).
2. **Ativar a Google Drive API**: *APIs e serviços → Biblioteca → Google Drive API → Ativar*.
3. **Criar a Service Account**: *IAM e administrador → Contas de serviço → Criar conta de serviço*. Não é necessário atribuir papéis do projeto.
4. **Criar a chave**: abra a conta de serviço → *Chaves → Adicionar chave → Criar nova chave → JSON*. O arquivo baixado contém `client_email` e `private_key`. **Guarde-o fora do repositório e não o envie a ninguém.**
5. **Compartilhar a pasta**: no Google Drive, clique com o botão direito na pasta raiz → *Compartilhar* → adicione o `client_email` da Service Account com permissão **Leitor**. A subpasta de cada ano herda o acesso. Não torne a pasta pública.
6. **Variáveis de ambiente** (`.env.local` ou painel da hospedagem):
   - `DEMO_MODE=false`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` — trecho final da URL da pasta (`drive.google.com/drive/folders/<ID>`)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — campo `client_email`
   - `GOOGLE_PRIVATE_KEY` — campo `private_key`, entre aspas, com as quebras de linha como `\n`
   - `ADMIN_TOKEN` — valor longo e aleatório (ex.: `openssl rand -hex 32`); `ACCESS_TOKEN` — token que os usuários digitam (opcional)
7. **Executar**: `npm run dev` (ou `npm run build && npm start`) e abra `/admin` para conferir a conexão e a contagem de documentos.

## Variáveis de ambiente

Veja [.env.example](.env.example). Nenhuma credencial é lida no frontend nem enviada ao navegador; o módulo de integração usa `server-only`.

## Deploy

**GitHub Pages não é compatível**: ele só serve arquivos estáticos e a aplicação precisa de backend para proteger a chave da Service Account.

**Render (Web Service, plano gratuito):**

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: as variáveis acima (`GOOGLE_PRIVATE_KEY` cole com as quebras de linha reais ou como `\n`).
- Limitações do plano gratuito: o serviço "dorme" após ~15 min sem acesso; ao acordar o cache em memória é perdido e a primeira busca relê o Drive (mais lenta). Com muitos milhares de arquivos, considere a indexação em banco (Fase 3).
- O limitador de requisições é em memória e por instância. Com várias instâncias, troque por Redis (ver `lib/rate-limit.ts`).

## Segurança

- Credenciais apenas em variáveis de ambiente, somente no servidor; a chave nunca vai ao navegador ou ao código.
- Escopo do Drive `drive.readonly`; nenhum documento é tornado público.
- **Autorização por arquivo**: todo `id` é validado por formato e só é atendido se o arquivo descende da pasta raiz configurada; caso contrário responde 404.
- Validação de todos os parâmetros (tamanho da consulta, filtros, paginação, IDs).
- Rate limit por IP (`RATE_LIMIT_SEARCH_PER_MIN`, `RATE_LIMIT_FILE_PER_MIN`).
- Visualização inline apenas para PDF e imagens; demais tipos são sempre anexos. Cabeçalhos `nosniff`, CSP, `X-Frame-Options` e `Cache-Control: no-store` nos documentos.
- Logs sem credenciais, tokens, conteúdo de documentos ou o texto pesquisado (apenas o tamanho da consulta e a contagem de resultados).
- **Token de acesso**: para usar a aplicação (buscar, visualizar, baixar) é preciso digitar o token na tela `/acesso`. O servidor confere e grava um cookie assinado (HttpOnly, 8 horas) que não contém o token. Trocar o token no servidor derruba todas as sessões. Há limite de 8 tentativas por minuto por IP contra tentativa de adivinhar o token.
- `ACCESS_TOKEN` (opcional) é o token dos usuários; se ficar vazio, o `ADMIN_TOKEN` também serve como token de acesso. **Em produção, sem nenhum dos dois, ninguém entra.** O token de acesso não dá acesso ao `/admin`.
- `/admin` exige `ADMIN_TOKEN`, digitado na própria página; em produção, sem o token configurado o painel fica bloqueado.
- **Limitação**: o token é compartilhado (não identifica quem acessou e vale para todos até ser trocado). Para identificar pessoas e revogar acessos individuais, implemente a autenticação institucional (Fase 2). Toda a API e todas as páginas passam por `lib/auth.ts`, o ponto único onde o login será conectado.

## Preparação para o futuro

- **Autenticação**: implementar `getSession()` em `lib/auth.ts` (Google Workspace/Microsoft/OIDC). Rotas e componentes não mudam.
- **Indexação**: `CatalogStore` (`lib/catalog.ts`) é a fronteira; troque a versão em memória por SQLite/Postgres alimentado na sincronização.
- **Pesquisa no conteúdo**: `SearchProvider` em `lib/search.ts` tem o ponto de extensão documentado. Exemplo: a busca por "empresa responsável pela limpeza" encontrará `Contrato_2026_001.pdf` quando houver índice de texto extraído dos PDFs/Word e OCR para digitalizados.
- **Filtro por pasta**: a API já aceita `?pasta=<id>` e cada registro guarda seus ancestrais; falta o seletor na interface.

## Roadmap

**Fase 1 (esta versão)** — busca por nome e número de processo, Google Drive, visualização, download, filtros básicos.

**Fase 2** — autenticação institucional, histórico de pesquisas, favoritos, busca mais inteligente.

**Fase 3** — indexação local em banco, pesquisa dentro do conteúdo, OCR, busca semântica.

**Fase 4** — dashboard administrativo, estatísticas, documentos mais acessados, auditoria, permissões por usuário/setor.
