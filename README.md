# BuscaDoc

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
  auth.ts           sessão e permissões (ponto único de controle de acesso)
  access.ts         regras de quem entra e de quem é administrador (puras, testadas)
auth.ts (raiz)      configuração do Auth.js: provedores Google e Microsoft
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
- **Botão/gesto de voltar:** o documento aberto fica na URL (`?doc=<id>`). Voltar fecha o visualizador e mantém o usuário nos resultados; o link também pode ser compartilhado (exige login).
- **Imagens:** exibidas na própria página.
- **Word (.docx) e Excel (.xlsx):** convertidos no próprio navegador (`mammoth` e `read-excel-file`, carregados só ao abrir o documento). O Word reflui para a largura da tela; a planilha rola na horizontal, com abas por planilha e limite de 1.000 linhas exibidas. É uma visualização de leitura: formatações complexas podem diferir do original. O HTML convertido é sanitizado (`lib/sanitize-html.ts`).
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
   - Variáveis de login: veja a seção **Login e controle de acesso**
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
- **Login obrigatório** (Google e/ou Microsoft) e **lista de e-mails autorizados**: um login válido não basta, o e-mail precisa estar em `ALLOWED_EMAILS` ou `ADMIN_EMAILS`. Lista vazia = ninguém entra. Toda a API e todas as páginas passam por `lib/auth.ts`.
- A lista é reavaliada a cada requisição: remover um e-mail bloqueia a pessoa imediatamente, mesmo com sessão aberta. A sessão dura 8 horas.
- `/admin` e a sincronização exigem perfil de administrador (`ADMIN_EMAILS`); a sincronização confere a origem da requisição (CSRF).
- Microsoft: contas pessoais (Outlook.com/Hotmail) são aceitas. Contas de trabalho/escola só de tenants listados em `AUTH_MICROSOFT_ALLOWED_TENANTS`, porque o e-mail de contas de outros tenants pode ser definido pelo administrador deles.
- Em produção, sem nenhum provedor configurado, ninguém entra (falha segura). Só em desenvolvimento, sem provedor, o acesso fica aberto.

## Login e controle de acesso

1. **Google**: no projeto do Google Cloud, *APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth* (tipo *Aplicativo da Web*). Em *URIs de redirecionamento autorizados* informe `https://SEU-DOMINIO/api/auth/callback/google` (e `http://localhost:3000/api/auth/callback/google` para testes). Configure a *Tela de permissão OAuth* (tipo Externo). Copie ID e segredo para `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`.
2. **Microsoft**: em <https://entra.microsoft.com> → *Registros de aplicativo → Novo registro*. Tipos de conta: *Contas em qualquer diretório organizacional e contas pessoais da Microsoft*. URI de redirecionamento (Web): `https://SEU-DOMINIO/api/auth/callback/microsoft`. Em *Certificados e segredos* crie um segredo. `AUTH_MICROSOFT_ID` = ID do aplicativo (cliente); `AUTH_MICROSOFT_SECRET` = *valor* do segredo.
3. `AUTH_SECRET`: gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
4. `ALLOWED_EMAILS` e `ADMIN_EMAILS`: e-mails separados por vírgula. Alterar a lista exige reiniciar/redeployar o serviço.

Configure apenas os provedores que for usar; o botão de um provedor sem credenciais não aparece.

## Preparação para o futuro

- **Autorização por setor/usuário**: a lista de e-mails hoje vem de variáveis de ambiente; para permissões por setor, mover a lista para o banco da Fase 3 mantendo `lib/access.ts`.
- **Indexação**: `CatalogStore` (`lib/catalog.ts`) é a fronteira; troque a versão em memória por SQLite/Postgres alimentado na sincronização.
- **Pesquisa no conteúdo**: `SearchProvider` em `lib/search.ts` tem o ponto de extensão documentado. Exemplo: a busca por "empresa responsável pela limpeza" encontrará `Contrato_2026_001.pdf` quando houver índice de texto extraído dos PDFs/Word e OCR para digitalizados.
- **Filtro por pasta**: a API já aceita `?pasta=<id>` e cada registro guarda seus ancestrais; falta o seletor na interface.

## Roadmap

**Fase 1 (esta versão)** — busca por nome e número de processo, Google Drive, visualização, download, filtros básicos.

**Fase 2** — (login com Google/Microsoft e lista de autorizados já implementados), histórico de pesquisas, favoritos, busca mais inteligente.

**Fase 3** — indexação local em banco, pesquisa dentro do conteúdo, OCR, busca semântica.

**Fase 4** — dashboard administrativo, estatísticas, documentos mais acessados, auditoria, permissões por usuário/setor.
