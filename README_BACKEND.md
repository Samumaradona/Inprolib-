# Backend — INPROLIB

Documento de referência do backend Flask: requisitos, configuração, rotas, segurança e resumo das atualizações recentes.

## Stack
- `Flask 2.3.3`
- `Werkzeug 2.3.7` (uploads e hashing de senha)
- `psycopg[binary] 3.2.10` (PostgreSQL)
- `python-dotenv 1.0.1` (variáveis de ambiente)

## Requisitos
- Python 3.10+ (recomendado 3.11)
- PostgreSQL 14+ (local ou remoto)

## Configuração
- Arquivo principal: `app.py`
- Conexão PostgreSQL em `DB_CONFIG` (dbname, user, password, host, port).
- `app.secret_key` via `.env` (fallback padrão para desenvolvimento).
- Uploads em `static/uploads` com limite `MAX_CONTENT_LENGTH = 16MB`.
- Pastas criadas automaticamente: `static/uploads` e `logs/`.
- Rate limiting simples em memória por IP/rota.

Variáveis de ambiente suportadas (`.env`):
- `SECRET_KEY`: segredo da aplicação.
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: credenciais do banco.
- `ADMIN_SETUP_TOKEN`: token para `/setup_admin` (default: `setup_admin_2024`).
- `ADMIN_TEMP_PASSWORD`: senha temporária ao criar/atualizar admin (default: `Adm@2025!`).
- `RESET_TOKEN_EXP_SECONDS`: expiração de token de reset de senha (segundos).

## Segurança e Autenticação
- `@login_required` protege rotas internas e redireciona para `/login` se não houver sessão:
  - Protegidas: `/home`, `/cadastro_curso`, `/publicacao`, `/avaliacao`, `/vinculacao_curso`, `/relatorio`, `/suporte`, `/configuracao`.
- `GET /logout`: limpa a sessão e redireciona para login.

## Entrega de Assets e Cache (Atualizado)
- CSS: `GET /<asset_name>.css` com cache desativado em desenvolvimento (`Cache-Control: no-cache, no-store, must-revalidate`).
- JS: `GET /<script_name>.js` com cache desativado em desenvolvimento.
- Imagens: `GET /img/<path:filename>` com cache público (`max-age=604800`).
- Templates utilizam versionamento de script para forçar atualização: exemplo `home.js?v=aval-fix-1`.

## Rotas Principais
- `GET /`: redireciona para login.
- `GET /setup_admin`: cria/atualiza um usuário administrador.
  - Uso: `http://127.0.0.1:5000/setup_admin?token=SEU_TOKEN&senha=NovaSenhaSegura`
  - Parâmetros opcionais: `nome`, `email`, `cpf`, `senha` (ou `password`).
  - Retorno JSON com `status` (`created`/`updated`) e `temp_password`.
- `GET /home`: últimas publicações (`status = 'Publicado'`).
- `GET/POST /cadastro_curso`: cadastro de curso com validações.
- `GET/POST /cadastro_alunos`: cadastro de alunos com validações, captcha e hashing de senha.
- `GET/POST /vinculacao_curso`: vínculo usuário-curso.
- `GET /avaliacao`, `GET /relatorio`, `GET /suporte`, `GET /configuracao`: páginas internas.
- `GET /api/publicacoes`: filtros por `autor`, `assunto`, `curso`, `titulo`; retorno JSON.

## Cadastro de Alunos (Atualizado)
- Fluxo POST:
  - Valida campos obrigatórios, compara `senha`/`confirmar_senha`, valida e-mail e CPF, aplica captcha simples.
  - Verifica duplicidade de email, normaliza tipo do usuário (`Aluno`/`Professor`).
  - Armazena senha com hash `pbkdf2:sha256`.
  - Em caso de sucesso: `flash('Usuário cadastrado com sucesso!', 'success')` e redireciona para `/home`.
  - Em caso de erro: `flash(..., 'error')` e redireciona para `/cadastro_alunos`.

## Publicação de Conteúdo
- `GET/POST /publicacao`:
  - POST: valida `titulo`, `tipo`, `conteudo` (extensões permitidas), curso opcional e captcha; normaliza nome do arquivo com `secure_filename` e prefixo de timestamp.
  - Salva publicação com `status='Publicado'`, caminho completo e `nome_arquivo`.
  - GET: lista últimas publicações (inclui `nome_arquivo` e `data_publicacao`), utilizadas no preview do frontend.

## Execução
- Desenvolvimento:
  - `python app.py`
  - Acesse `http://127.0.0.1:5000/`
- Rotinas auxiliares:
  - `python app.py --validate` (se disponível no ambiente)
  - `python app.py --hash-migrate` (migração de senhas em texto para hash)

## Logs
- `logs/audit.log` registra eventos (rate limit, publicação OK/erro, setup de admin, etc.).

## Uploads e Segurança
- Extensões permitidas: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`.
- Nomes sanitizados com timestamp; tamanho máximo 16MB.

## Atualizações Recentes
- Menu lateral: correção para exibir “Avaliação” para perfis `Administrador` e `Docente` (via `home.js`).
- Cache busting: inclusão de `?v=aval-fix-1` nas importações de `home.js` em todos os templates relevantes.
- Cache desativado para CSS/JS via backend durante desenvolvimento.
- Cadastro de alunos: redirecionamento para Home e mensagem de sucesso exibida na Home (bloco de mensagens adicionado em `home.html`).

## Observações
- Em produção, ajuste a política de cache de assets para melhorar performance.
- Após alterações em scripts, use `Ctrl+F5` para garantir atualização no navegador.