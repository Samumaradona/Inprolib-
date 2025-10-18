# Deploy no Render (App Flask + PostgreSQL)

Este guia coloca a aplicação Flask online no Render com banco PostgreSQL gerenciado, usando `gunicorn` em produção.

## 1) Pré-requisitos
- Conta no Render (https://render.com)
- Repositório do projeto no GitHub (público ou privado)
- `requirements.txt` atualizado (inclui `gunicorn`)
- Arquivo `render.yaml` na raiz do projeto

## 2) Banco de Dados PostgreSQL
1. No Render, crie um novo recurso: PostgreSQL.
2. Copie as credenciais: `DATABASE_URL` (ou host, porta, user, password).
3. Importe o schema e dados:
   ```bash
   # No terminal local, com psql instalado
   psql "<DATABASE_URL>" -f banco.sql
   # ou, se preferir separar:
   psql -h <host> -p <port> -U <user> -d <db> -f banco.sql
   ```

## 3) Serviço Web
1. No Render, crie um recurso do tipo Web Service a partir do seu GitHub repo.
2. Ele detectará `render.yaml` e usará:
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn app:app --bind 0.0.0.0:$PORT`
3. Configure variáveis de ambiente no serviço Web:
   - `SECRET_KEY`
   - `ADMIN_SETUP_TOKEN`
   - `ADMIN_TEMP_PASSWORD` (opcional)
   - `RESET_TOKEN_EXP_SECONDS` (opcional)
   - `DATABASE_URL` (copiada do Postgres do Render)

> Observação: O código foi atualizado para usar `DATABASE_URL` automaticamente, com fallback para `DB_HOST`, `DB_NAME`, etc. Se `DATABASE_URL` estiver definido, ele é preferido.

## 4) Disco Persistente (Uploads)
- No `render.yaml`, já definimos um disco montado em `static/uploads`.
- Isso garante que arquivos enviados não sejam perdidos em novos deploys.

## 5) Teste Inicial
1. Acesse `/login` do serviço Web (URL pública do Render).
2. Execute o setup do admin (opcional):
   - `GET /setup_admin?token=<ADMIN_SETUP_TOKEN>&senha=Adm@2025!`
3. Faça um cadastro pelo modal e valide inserção de usuário no banco.

## 6) Notas de Produção
- SMTP: para recuperação de senha, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` se necessário (o app usa `smtplib`).
- Cache: assets estáticos têm cache-control leve para performance.
- Logs: auditorias são gravadas em `logs/audit.log`. Em ambientes imutáveis, prefira logs de plataforma.

## 7) Railway (Alternativa)
- Crie Postgres e um serviço Web.
- Configure `DATABASE_URL` no serviço Web.
- Start: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Importação:
  ```bash
  psql "<DATABASE_URL>" -f banco.sql
  ```

---
Qualquer dúvida, posso fazer o provisionamento com você passo a passo.