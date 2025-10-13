# Backend — INPROLIB

Este documento descreve o backend Flask, as rotas e serviços disponíveis, configurações, segurança e mudanças implementadas nesta entrega.

## Stack
- `Flask 2.3.3`
- `Werkzeug 2.3.7` (uploads e hashing de senha)
- `psycopg[binary] 3.2.10` (PostgreSQL)
- `python-dotenv 1.0.1` (variáveis de ambiente)

## Configuração
- Arquivo principal: `app.py`
- Conexão PostgreSQL em `DB_CONFIG` (dbname, user, password, host, port).
- `app.secret_key` via `.env` (fallback padrão para desenvolvimento).
- Uploads em `static/uploads` com limite `MAX_CONTENT_LENGTH = 16MB`.
- Pastas criadas automaticamente: `static/uploads` e `logs/`.
- Rate limiting simples em memória por IP/rota.

## Segurança e Autenticação
- Decorador `@login_required` protege rotas internas e redireciona para `/login` se não houver sessão:
  - Protegidas: `/home`, `/cadastro_curso`, `/publicacao`, `/avaliacao`, `/vinculacao_curso`, `/relatorio`, `/suporte`, `/configuracao`.
- Logout: `GET /logout` limpa a sessão (`session.clear()`) e redireciona para login.

## Entrega de Assets
- CSS: `GET /<asset_name>.css` serve arquivos de `static/css` com cache.
- JS: `GET /<script_name>.js` serve arquivos de `static/javascript` com cache.
- Imagens: `GET /img/<path:filename>` serve de `static/img` com cache.

## Publicação de Conteúdo
- `GET/POST /publicacao`:
  - POST: valida `titulo`, `tipo`, `conteudo` (extensões permitidas), curso opcional, e CAPTCHA; normaliza nome do arquivo com `secure_filename` e prefixo de timestamp.
  - Salva publicação em `publicacao` com `status='Publicado'`, caminho completo e `nome_arquivo`.
  - GET: além de cursos e tipos, lista últimas publicações incluindo `id_publicacao`, `titulo`, `tipo`, `curso`, `nome_arquivo` e `data_publicacao` (usado pela UI para preview/modal).

## Outras Rotas Principais
- `GET /home`: últimas publicações (somente publicadas).
- `GET/POST /cadastro_curso`: cadastro de curso, com validações básicas.
- `GET/POST /cadastro_alunos`: cadastro de alunos (armazena senha com hash `pbkdf2:sha256`).
- `GET/POST /vinculacao_curso`: vínculo usuário-curso.
- `GET /avaliacao`: lista para avaliação.
- `GET /relatorio`, `GET /suporte`, `GET /configuracao`: páginas internas.
- `GET /api/publicacoes`: busca com filtros por `autor`, `assunto`, `curso`, `titulo`; retorno JSON com metadados.

## Execução
- Desenvolvimento:
  - `python app.py`
  - Abre em `http://127.0.0.1:5000/`
- Validação automatizada:
  - `python app.py --validate`
- Migração de senhas (plaintext -> hash):
  - `python app.py --hash-migrate`

## Logs
- `logs/audit.log` registra eventos (rate limit, publicação OK/erro, etc.).

## Uploads e Segurança
- Extensões permitidas: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`.
- Nomes sanitizados e com timestamp; tamanho máximo 16MB.

## Mudanças Implementadas nesta Entrega
- Proteção de rotas internas com `@login_required` e redirecionamento de não autenticados.
- Ajuste da consulta de publicações em `/publicacao` para incluir `nome_arquivo` e `data_publicacao` (suporte ao modal de visualização no frontend).
- Rotas de assets (CSS/JS/IMG) com cabeçalhos de cache e compatibilidade com caminhos de templates.

## Observações
- O preview de conteúdo (PDF/Imagens) é feito no frontend; tipos não suportados têm fallback para “Abrir/baixar”.
- Garanta que `.env` esteja presente com `SECRET_KEY` e `DB_CONFIG` corretos para produção.