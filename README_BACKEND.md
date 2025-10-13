# Backend — INPROLIB

Este documento descreve o backend Flask, rotas, configurações, o que foi alterado e como executar.

## Stack
- `Flask 2.3.3`
- `Werkzeug 2.3.7` (uploads e hashing de senha)
- `psycopg3` (conexão PostgreSQL)

## Configuração
- Arquivo principal: `app.py`
- `DB_CONFIG` em `app.py` define credenciais do PostgreSQL.
- `app.secret_key`: chave de sessão.
- Uploads em `static/uploads` e limite de tamanho `16MB`.
- Rate limiting simples por IP/rota (in-memory).

## O que foi feito
- Consolidado código Python em `app.py` (sem arquivos `.py` adicionais).
- Senhas de novos cadastros são armazenadas com hash (`pbkdf2:sha256`).
- Rotina de migração de senhas em texto puro para hash: `--hash-migrate`.
- Rotina de validação automática usando `Flask.test_client`: `--validate`.
- Publicação agora exige título, tipo (via select) e validação de arquivo; CAPTCHA mantido.
- Máscaras e validações front-end integradas ao `home.js` (CPF, portaria, captcha, código de curso, uploads).
- Ícone de notificações permanece, badge só aparece com contagem real.

## Rotas Principais (resumo)
- `GET /home`: Home e busca/últimas publicações (UI).
- `GET/POST /cadastro_curso`: Cadastrar curso.
  - Campos: `nome` (ou `nome_curso`), `descricao`, `codigo`, `autorizacao`, `coordenador` (opcional).
- `GET/POST /cadastro_alunos`: Cadastrar aluno.
  - Campos: `nome_user`, `cpf_user`, `email_user`, `senha`, `confirmar_senha`, `captcha`.
  - Hash aplicado ao salvar (pbkdf2:sha256).
- `GET/POST /publicacao`: Publicar conteúdo.
  - GET: cria `captcha_question` e salva resposta na sessão.
  - POST: requer `titulo_conteudo`, `tipo_publicacao`, `curso`, `captcha` e arquivo `conteudo` (extensões permitidas).
  - Salva arquivo e grava publicação (autor = `session.user_id` se existir).
- `GET/POST /vinculacao_curso`: Vincular usuário a curso.
  - Campos: `usuario`, `curso`, `data_vinculacao`.
- `GET /avaliacao`: Lista publicações para avaliação.

Observação: alguns nomes de campos no POST são conciliados no backend (ex.: `titulo` vs `titulo_conteudo`, `tipo` vs `tipo_publicacao`).

## Modos de Execução
- Servidor padrão (desenvolvimento):
  - `python app.py`
  - Abre em `http://127.0.0.1:5000/`
- Validação automatizada (cria curso, publica com CAPTCHA e vincula usuário):
  - `python app.py --validate`
  - Usa `Flask.test_client` internamente.
- Migração de senhas (plaintext -> hash):
  - `python app.py --hash-migrate`
  - Converte entradas não-hash para `pbkdf2:sha256`.

## Logs
- `logs/audit.log` registra eventos (ex.: limitações de taxa, erros de publicação).

## Uploads e Segurança
- Extensões permitidas: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`.
- Nomes de arquivos sanitizados (`secure_filename`) e prefixados com timestamp.
- `MAX_CONTENT_LENGTH` = 16MB.

## Ajustes Sugeridos
- Caso exista autenticação de login, alinhar com `check_password_hash` para validar senhas hashed.
- Adaptar `DB_CONFIG` para ambientes variados.