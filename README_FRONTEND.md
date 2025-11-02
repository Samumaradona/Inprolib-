# Frontend — INPROLIB

Guia dos templates, estilos e JavaScript, com foco nas funcionalidades de Publicação, preview universal e download com progresso.

## Visão Geral
- Modal de Publicação com preview universal via PDF (Office → PDF).
- Barra de progresso no download com nome sugerido e conclusão.
- Filtros de busca, status e ações no grid de publicações.
- Mensagens de sucesso/erro renderizadas via `flash`.

## Estrutura
- Templates: `templates/` — páginas como `home.html`, `publicacao.html`, `avaliacao.html`.
- CSS: `static/css/` — estilos por página (`publicacao.css`, `home.css`, etc.).
- JS: `static/javascript/` — scripts principais (`publicacao.js`, `home.js`).

## Publicação e Preview
- Ao clicar em uma linha (`.pub-row`), abre o modal com título, tipo, curso e data.
- Preview por tipo:
  - Imagens (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`): exibidas diretamente.
  - PDF: carregado em `<iframe>`.
  - Texto/CSV: lido via `fetch` e exibido em `<pre>`.
  - Office (`.doc`, `.docx`, `.xls`, `.xlsx`): renderizado como PDF pelo backend em `/preview_pdf_publicacao/<id>` e exibido em `<iframe>`.
- Sem `id_publicacao`, exibe aviso e recomenda download.

## Download com Barra de Progresso
- Botão “Fazer download” usa `fetch` e, quando disponível, File System Access API para salvar com progresso.
- Elementos:
  - `#pubActions` (container), `#pubDlWrap` (criado dinamicamente), `#pubDlProgress` (progress), `#pubDlLabel`.
- Mostra estados: iniciando, porcentagem, concluído, erro.

## Filtros e UX
- Busca por texto (título/tipo/curso), filtro de status (ativo/inativo) e contador de resultados.
- Modais/menus fecham com clique fora ou `Esc`. Atributos ARIA aplicados.

## Compatibilidade
- Chrome/Edge: suporte à File System Access API; barra de progresso com escolha de local.
- Firefox/Safari: fallback para download tradicional com progresso aproximado.

## IDs/Rotas relevantes
- `#pubDownload`: botão principal de download no modal.
- `#pubActions`: área onde a barra de progresso é inserida.
- Rota de preview PDF: `/preview_pdf_publicacao/<id>`.

## Como Testar
- Inicie o backend (`python app.py`) e acesse `http://127.0.0.1:5000/publicacao`.
- Clique em publicações com `.docx`/`.xlsx` para ver o `<iframe>` com PDF.
- Clique em “Fazer download” para ver a barra de progresso.

## Atualizações Recentes
- Preview universal: Office convertido para PDF no backend e exibido no modal.
- Barra de progresso de download com estados e nome sugerido.
- Versionamento de scripts nos templates para cache busting.