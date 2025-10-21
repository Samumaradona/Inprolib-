# Backend — INPROLIB

Referência do backend Flask: requisitos, configuração, rotas, segurança e funcionalidades recentes (preview PDF, barra de progresso e auditoria).

## Stack e Dependências
- `Flask 2.3.3`, `Werkzeug 2.3.7`, `psycopg[binary] 3.2.10`, `python-dotenv 1.0.1`.
- Pré-visualização local de Office: `python-docx`, `openpyxl`, `xlrd`.
- Conversão universal para PDF: `reportlab` (fallback) + `LibreOffice` se disponível.

## Configuração
- App: `app.py`.
- Uploads: `static/uploads` (criada automaticamente), limite `16MB`.
- Previews PDF: `static/previews` (cache de PDFs gerados).
- MIME types explícitos: `.docx`, `.xlsx`, `.xls` via `mimetypes.add_type`.
- Rate limiting simples por IP/rota.
- Logs: `logs/audit.log`.

Variáveis `.env`:
- `SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- `ADMIN_SETUP_TOKEN`, `ADMIN_TEMP_PASSWORD`, `RESET_TOKEN_EXP_SECONDS`.

## Rotas Principais
- `GET /home`: últimas publicações.
- `GET/POST /publicacao`: cria/lista publicações.
- `GET /download_publicacao/<id>`: download com `Content-Length` e auditoria.
- `GET /preview_publicacao/<id>`: preview em HTML (localhost) p/ DOCX/XLSX/XLS.
- `GET /preview_pdf_publicacao/<id>`: conversão automática p/ PDF (Office) e inline.
- `GET /setup_admin`: cria/atualiza admin.
- Demais páginas: `/avaliacao`, `/relatorio`, `/suporte`, `/configuracao`.

## Preview e Conversão para PDF
- Pipeline:
  - Cache: reutiliza PDF se mais novo que o arquivo original.
  - Tenta `LibreOffice` (`soffice --headless --convert-to pdf`).
  - Fallback:
    - `.docx`: texto plano para PDF com `reportlab`.
    - `.xlsx`/`.xls`: tabela (até 50 linhas × 20 colunas).
- Resposta: `application/pdf` servido via `send_from_directory`.

## Download com Auditoria
- Registros em `audit_log`:
  - `download_publicacao`: `{id_publicacao, arquivo, nome_download, size_bytes, content_type}`.
  - `download_publicacao_error`: `{id_publicacao, error}`.
- Cada linha do log: `timestamp\tip\tuser=<id>\tevento\tdetalhes`.

## Entrega de Assets
- CSS: `/<asset_name>.css` e JS: `/<script_name>.js` com cache desativado em dev.
- Imagens: `GET /img/<path:filename>` com `Cache-Control: public`.

## Execução
- Desenvolvimento: `python app.py` → `http://127.0.0.1:5000`.
- Produção (Render): ver `render.yaml` — disco persistente montado em `static/uploads`.

## Segurança
- Rotas internas com `@login_required` e `roles_required`.
- Uploads validados por extensão; nomes sanitizados com `secure_filename` + timestamp.

## Atualizações Recentes
- Rota `preview_pdf_publicacao`: preview universal de Office via PDF.
- `download_publicacao`: adiciona `Content-Length` e auditoria de download.
- MIME types explícitos p/ Office em assets estáticos.

## E-mail (SMTP)
- Variáveis `.env` obrigatórias para envio:
  - `SMTP_HOST` (ex.: `smtp.gmail.com` ou `smtp.office365.com`)
  - `SMTP_PORT` (`587` com STARTTLS; `465` com SSL)
  - `SMTP_USER` (e-mail da conta)
  - `SMTP_PASSWORD` (senha do app ou chave SMTP)
  - `SMTP_FROM` (remetente; use o mesmo do `SMTP_USER`)
  - `SMTP_USE_SSL` (`0` para STARTTLS em 587; `1` para SSL em 465)

### Gmail — como configurar
- Ative 2FA na conta.
- Gere uma "Senha de app" em `Minha Conta > Segurança`.
- Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USE_SSL=0`.
- `SMTP_USER` = seu e-mail Gmail; `SMTP_PASSWORD` = senha de app.

### Outlook/Office365
- `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`, `SMTP_USE_SSL=0`.
- `SMTP_USER` = e-mail corporativo; `SMTP_PASSWORD` = senha da conta (ou token de app).

### Teste local
- Reinicie o app: `python app.py`.
- Na página `Recuperar senha`, envie seu e-mail.
- Se o envio falhar, o app mostra o código de teste no modal (para validação e fluxo).
- Verifique o terminal: mensagens `[SMTP]` detalham erros de autenticação/porta/host.