# Backend — INPROLIB

Sistema de gerenciamento de repositório institucional desenvolvido em Flask com PostgreSQL, oferecendo funcionalidades completas de autenticação, gestão de usuários, publicações acadêmicas e relatórios.

## 🚀 Stack Tecnológica

### Core Framework
- **Flask 2.3.3** - Framework web principal
- **Werkzeug 2.3.7** - Utilitários WSGI e segurança
- **Gunicorn 21.2.0** - Servidor WSGI para produção

### Banco de Dados
- **PostgreSQL** - Sistema de gerenciamento de banco
- **psycopg[binary] 3.2.10** - Driver PostgreSQL com suporte a tipos nativos
- **psycopg_pool 3.2.4** - Pool de conexões (auto detectado, recomendado em produção)
- **Suporte a ENUMs** - `tipo_usuario`, `status_publicacao`

### Processamento de Arquivos
- **python-docx 1.1.2** - Manipulação de documentos Word (.docx)
- **openpyxl 3.1.5** - Processamento de planilhas Excel (.xlsx)
- **xlrd 2.0.1** - Leitura de planilhas Excel legadas (.xls)
- **reportlab 4.2.5** - Geração de PDFs para preview universal

### Utilitários
- **python-dotenv 1.0.1** - Gerenciamento de variáveis de ambiente
- **LibreOffice** (opcional) - Conversão avançada Office → PDF

## ⚙️ Configuração e Instalação

### Variáveis de Ambiente (.env)
```env
# Configuração da Aplicação
SECRET_KEY=sua_chave_secreta_aqui
DEBUG=True

# Banco de Dados PostgreSQL
DB_NAME=inprolib_schema
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432

# Configuração de Administrador
ADMIN_SETUP_TOKEN=token_para_setup_admin
ADMIN_TEMP_PASSWORD=senha_temporaria_admin

# Recuperação de Senha
RESET_TOKEN_EXP_SECONDS=3600

# Configuração SMTP (E-mail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app
SMTP_FROM=seu_email@gmail.com
SMTP_USE_SSL=0
```

#### Conexão e Pooling
- A aplicação detecta automaticamente `psycopg_pool`. Quando disponível, usa `ConnectionPool` para reduzir overhead de conexão por requisição.
- O pool não requer configuração adicional; é habilitado automaticamente nas rotas que usam `get_db_connection()`.
- Em produção (Render/Cloud), prefira definir `DATABASE_URL` (sobrescreve `DB_*`). Exemplo:
  - `DATABASE_URL=postgresql://usuario:senha@host:5432/inprolib_schema`
- O schema deve permanecer `public` (`DB_SCHEMA=public`).


### Estrutura de Diretórios
```
TelaTest ADM/
├── app.py                 # Aplicação Flask principal
├── requirements.txt       # Dependências Python
├── banco.sql             # Schema do banco de dados
├── .env                  # Variáveis de ambiente
├── static/
│   ├── uploads/          # Arquivos enviados pelos usuários
│   ├── previews/         # Cache de PDFs gerados
│   ├── css/             # Folhas de estilo
│   ├── javascript/      # Scripts do frontend
│   └── img/             # Imagens estáticas
├── templates/           # Templates Jinja2
└── logs/
    └── audit.log        # Log de auditoria
```

## 🔐 Sistema de Autenticação e Autorização

### Tipos de Usuário
- **Administrador** - Acesso completo ao sistema
- **Professor/Docente** - Gestão de publicações e avaliações
- **Aluno** - Visualização e submissão de publicações

### Decoradores de Segurança
```python
@login_required          # Requer autenticação
@roles_required(['Administrador'])  # Controle por papel
```

### Hash de Senhas
- **Algoritmo**: `pbkdf2:sha256` (Werkzeug)
- **Validação**: CPF, e-mail e força de senha
- **Recuperação**: Sistema de tokens temporários via e-mail

## 🗄️ Arquitetura do Banco de Dados

### Tabelas Principais
- **usuario** - Dados pessoais, credenciais e endereço
- **curso** - Cursos acadêmicos e coordenadores
- **publicacao** - Trabalhos acadêmicos e metadados
- **avaliacao** - Sistema de avaliação por pares
- **usuario_curso** - Relacionamento N:N usuários-cursos
- **tipos_de_publicacao** - Catálogo de tipos (TCC, Dissertação, etc.)
- **esqueci_senha** - Tokens de recuperação de senha

### Funcionalidades de Schema Dinâmico
- **Auto-criação de banco** - Cria automaticamente se não existir
- **Migração de colunas** - Adiciona colunas ausentes automaticamente
- **Validação de integridade** - Constraints e foreign keys

## 📁 Sistema de Arquivos e Upload

### Configuração de Upload
- **Diretório**: `static/uploads/` (criado automaticamente)
- **Limite de tamanho**: 16MB por arquivo
- **Sanitização**: `secure_filename()` + timestamp único
- **Tipos suportados**: Office, PDF, imagens, texto

### Preview Universal de Documentos
```python
# Pipeline de conversão
1. Cache: Verifica se PDF já existe e está atualizado
2. LibreOffice: Conversão nativa (se disponível)
3. Fallback: Extração de texto/dados + ReportLab
4. Resposta: PDF inline com Content-Length
```

### Tipos de Preview Suportados
- **Imagens**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
- **PDFs**: Visualização direta
- **Office**: `.docx`, `.xlsx`, `.xls` → conversão para PDF
- **Texto**: `.txt`, `.csv` → exibição formatada

#### Notas de Conversão (TXT/CSV/Imagens)
- As pré-visualizações são servidas como PDF inline no modal, garantindo compatibilidade ampla.
- Imagens são encaixadas automaticamente na página, preservando proporções.
- TXT é renderizado com cabeçalho, monoespaçado e quebra de linha simples.
- CSV é convertido em tabela com cabeçalho; arquivos muito extensos podem ser truncados para manter desempenho.
- Para Office, se o LibreOffice estiver disponível no servidor, é usado preferencialmente; do contrário, aplica-se um fallback simplificado.

## 🛣️ Rotas e Endpoints

### Autenticação
- `GET/POST /login` - Autenticação de usuários
- `GET/POST /esqueci_senha` - Recuperação de senha
- `GET /logout` - Encerramento de sessão
- `GET /setup_admin` - Configuração inicial do administrador

### Gestão de Usuários
- `GET/POST /cadastro_alunos` - CRUD de alunos
- `GET/POST /cadastro_curso` - CRUD de cursos
- `GET /configuracao` - Configurações do usuário

### Publicações Acadêmicas
- `GET/POST /publicacao` - Listagem e submissão
- `GET /download_publicacao/<id>` - Download com auditoria
- `GET /preview_publicacao/<id>` - Preview HTML (localhost)
- `GET /preview_pdf_publicacao/<id>` - Preview PDF universal

### Avaliação e Relatórios
- `GET/POST /avaliacao` - Sistema de avaliação por pares
- `GET/POST /relatorio` - Relatórios e exportação
- `GET /api/publicacoes` - API de busca

### Assets Estáticos
- `GET /<asset>.css` - Folhas de estilo com cache busting
- `GET /<script>.js` - Scripts JavaScript
- `GET /img/<path>` - Imagens com cache público

## 📊 Sistema de Auditoria

### Log de Eventos
```
Formato: timestamp\tip\tuser=<id>\tevento\tdetalhes_json
Localização: logs/audit.log
```

### Eventos Auditados
- **Autenticação**: Login, logout, falhas
- **Cadastros**: Usuários, cursos, publicações
- **Downloads**: Arquivo, tamanho, tipo MIME
- **Avaliações**: Aprovações, reprovações
- **Relatórios**: Exportações e filtros aplicados

## 📧 Sistema de E-mail (SMTP)

### Configuração Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_SSL=0
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=senha_de_app_gerada
```

### Configuração Outlook/Office365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USE_SSL=0
```

### Funcionalidades
- **Recuperação de senha** - Envio de tokens temporários
- **Notificações** - Alertas de sistema (futuro)
- **Fallback local** - Exibe código no modal para desenvolvimento

### Dicas para Render / IPv4
- Em alguns provedores, conexões IPv6 podem estar indisponíveis e causar erro "Network is unreachable".
- Defina `SMTP_FORCE_IPV4=1` para obrigar a conexão via IPv4.
- Ajuste `SMTP_TIMEOUT` (ex.: `15`) para evitar travas e respostas 502.
- Para Gmail, prefira `SMTP_PORT=587` com STARTTLS e use senha de app.

## 🚀 Execução e Deploy

### Desenvolvimento Local
```bash
# Instalar dependências
pip install -r requirements.txt

# Configurar banco PostgreSQL
psql -U postgres -c "CREATE DATABASE inprolib_schema;"
psql -U postgres -d inprolib_schema -f banco.sql

# Executar aplicação
python app.py
# Acesso: http://127.0.0.1:5000
```

### Produção (Render)
```yaml
# render.yaml
services:
  - type: web
    name: inprolib
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: "gunicorn app:app --bind 0.0.0.0:$PORT --worker-class gthread --workers 2 --threads 20 --timeout 0 --graceful-timeout 60 --keep-alive 75"
    disk:
      name: uploads
      mountPath: /opt/render/project/src/static/uploads
      sizeGB: 1
```

Notas:
- `worker-class gthread` + `threads` garante concorrência adequada para SSE de notificações sem bloquear workers.
- `timeout 0` evita abortar streams longos; `keep-alive 75` mantém conexões HTTP ativas por mais tempo.
- O `mountPath` deve ser absoluto conforme a estrutura do Render.
- Defina `DATABASE_URL` no serviço para conectar ao Postgres gerenciado; o app usará automaticamente o pool de conexões quando disponível.

## 🔧 Funcionalidades Avançadas

### Rate Limiting
- **Implementação**: Simples por IP/rota
- **Proteção**: Força bruta em login e cadastros

### Cache de Assets
- **CSS/JS**: Versionamento automático para cache busting
- **Imagens**: Cache público com headers apropriados
- **PDFs**: Cache inteligente baseado em timestamp

### Validações
- **CPF**: Algoritmo completo de validação
- **E-mail**: Formato e unicidade

### Sincronização de Uploads
- **Objetivo**: Garantir que os arquivos de publicações existam em `static/uploads` no servidor.
- **Segurança**: Proteção por token via `UPLOAD_SYNC_TOKEN` (fallback `ADMIN_SETUP_TOKEN`).
- **Rotas**:
  - `GET /sync_list_missing` — Lista publicações cujo `nome_arquivo` não existe em `static/uploads`.
    - Cabeçalho: `X-Upload-Sync-Token: <seu_token>`
    - Query: `limit=<int>` para limitar resultados.
  - `POST /sync_uploads` — Recebe arquivos para gravar em `static/uploads`.
    - Cabeçalho: `X-Upload-Sync-Token: <seu_token>`
    - Form-data:
      - `file` (múltiplos) ou `zip` (um ZIP com os arquivos)
      - `overwrite=1|0` para permitir sobrescrita
- **Cliente**: `tools/sync_uploads_client.py`
  - Lista faltantes, monta um ZIP a partir do diretório local e envia para o servidor.
  - Requer `requests` (já incluído em `requirements.txt`).
  - Uso (Windows):
    - Dry-run: `python tools\sync_uploads_client.py --server https://SEU_DOMINIO --token SEU_TOKEN --dry-run`
    - Enviar: `python tools\sync_uploads_client.py --server https://SEU_DOMINIO --token SEU_TOKEN --src .\static\uploads`
    - Sobrescrever: `python tools\sync_uploads_client.py --server https://SEU_DOMINIO --token SEU_TOKEN --src .\static\uploads --overwrite`


## 📐 DER — Diagramas e Documentos

- Assets dos diagramas em `static/img`:
  - `der-conceitual.png` / `der-conceitual.svg`
  - `der-logico-plantuml.png` / `der-logico-plantuml.svg`
  - `der-logico.png` / `der-logico.svg`
- Documentos consolidados:
  - `docs/DER-Inprolib.pdf`
  - `docs/DER-Inprolib.docx`
- Scripts disponíveis:
  - `python scripts/generate_der_assets.py` — Regenera PNG/SVG a partir dos arquivos fonte e serviços remotos.
  - `python scripts/build_der_document.py` — Constrói PDF e DOCX com capa, sumário, cabeçalho/rodapé e legendas.
- Comportamentos implementados:
  - Validação de `Content-Type` para respostas do PlantUML (evita arquivos inválidos).
  - Fallback inteligente: re-renderização via **Kroki** (Mermaid/PlantUML) quando o PNG está ausente ou corrompido.
  - Ajuste de tamanho das imagens no PDF para evitar `LayoutError`.
  - Se o Word estiver com o arquivo aberto, o DOCX é salvo como `DER-Inprolib-fixed.docx`.
- Pré-requisitos:
  - `pip install -r requirements.txt` (inclui `requests`, `reportlab`, `python-docx`, `Pillow`).
- **Arquivos**: Tipo MIME e tamanho
- **Captcha**: Sistema simples matemático

### Tratamento de Erros
- **Conexão DB**: Reconexão automática
- **Uploads**: Validação e sanitização
- **Conversão PDF**: Fallbacks múltiplos
- **SMTP**: Logs detalhados de falhas

## 📈 Monitoramento e Logs

### Logs de Sistema
```python
print(f"[ENV] .env carregado de: {path}")
print(f"[DB] Conexão estabelecida: {status}")
print(f"[SMTP] Configuração: {host}:{port}")
```

### Métricas de Performance
- **Upload**: Tempo de processamento
- **Conversão PDF**: Cache hit/miss ratio
- **Queries**: Tempo de execução (desenvolvimento)

## 🔄 Atualizações Recentes

### v2.0 - Sistema de Preview Universal
- Conversão automática Office → PDF
- Cache inteligente de documentos convertidos
- Suporte a LibreOffice para conversões avançadas

### v1.9 - Auditoria e Download
- Log completo de downloads com metadados
- Barra de progresso com Content-Length
- Sistema de auditoria estruturado

### v1.8 - Melhorias de UX
- Validação em tempo real de formulários
- Sistema de notificações flash aprimorado
- Tema escuro/claro persistente

## 🛡️ Segurança

### Boas Práticas Implementadas
- **Sanitização**: Todos os inputs são validados
- **CSRF**: Proteção via Flask-WTF (implícito)
- **SQL Injection**: Queries parametrizadas
- **XSS**: Templates Jinja2 com escape automático
- **Uploads**: Validação de tipo e nome seguro

### Recomendações de Produção
- Usar HTTPS obrigatório
- Configurar firewall para PostgreSQL
- Implementar backup automático
- Monitorar logs de auditoria
- Rotacionar chaves secretas regularmente

## 🧭 Diagrama de Arquitetura do Backend

O diagrama abaixo apresenta uma visão de alto nível das rotas, serviços e integração com o banco de dados do INPROLIB.

```mermaid
flowchart LR
    subgraph Client
        Browser[Browser]
    end

    Browser -->|HTTP| Flask[Flask App]

    subgraph Routes
        r_root[GET /]
        r_setup[GET/POST /setup_admin]
        r_home[GET /home]
        r_cad_alunos[GET/POST /cadastro_alunos]
        r_cad_curso[GET/POST /cadastro_curso]
        r_publicacao[GET/POST /publicacao]
        r_avaliacao[GET/POST /avaliacao]
        r_relatorio[GET/POST /relatorio]
        r_api_pub[GET /api/publicacoes]
        r_login[GET/POST /login]
        r_reset[GET/POST /esqueci_senha | /resetar_senha]
    end

    subgraph Services
        AuthService[Autenticação & Sessão]
        UserService[Gestão de Usuários]
        CourseService[Gestão de Cursos]
        PublicationService[Gestão de Publicações]
        EvaluationService[Avaliações]
        ReportService[Relatórios & Exportação]
        FileService[Upload/Download & Preview]
        EmailService[SMTP / Tokens de recuperação]
        Templates[Jinja2 Templates]
        DBLayer[get_db_connection() & SQL]
    end

    subgraph Storage
        Postgres[(PostgreSQL)]
        Uploads[(static/uploads)]
        Previews[(static/previews)]
    end

    %% Rotas -> Serviços
    Flask --> r_root
    Flask --> r_setup
    Flask --> r_home
    Flask --> r_cad_alunos
    Flask --> r_cad_curso
    Flask --> r_publicacao
    Flask --> r_avaliacao
    Flask --> r_relatorio
    Flask --> r_api_pub
    Flask --> r_login
    Flask --> r_reset

    r_root --> Templates
    r_home --> Templates
    r_setup --> AuthService
    r_login --> AuthService
    r_reset --> EmailService
    r_cad_alunos --> UserService
    r_cad_curso --> CourseService
    r_publicacao --> PublicationService
    r_avaliacao --> EvaluationService
    r_relatorio --> ReportService
    r_api_pub --> ReportService

    %% Serviços -> DB/Storage
    AuthService --> DBLayer
    UserService --> DBLayer
    CourseService --> DBLayer
    PublicationService --> DBLayer
    EvaluationService --> DBLayer
    ReportService --> DBLayer
    DBLayer -->|psycopg| Postgres
    FileService --> Uploads
    FileService --> Previews
    Templates --> Browser
```

### Fallback ASCII

```
Browser -> Flask -> Rotas
  /, /home                 -> Templates -> Browser
  /setup_admin, /login     -> AuthService -> DB (PostgreSQL)
  /esqueci_senha,/resetar  -> EmailService (SMTP) -> DB
  /cadastro_alunos         -> UserService -> DB
  /cadastro_curso          -> CourseService -> DB
  /publicacao              -> PublicationService -> DB + Uploads/Previews
  /avaliacao               -> EvaluationService -> DB
  /relatorio, /api/publicacoes -> ReportService -> DB

Storage:
  - static/uploads: arquivos enviados
  - static/previews: PDFs cacheados para preview
```

Notas:
- `get_db_connection()` gerencia conexão PostgreSQL, schema (`DB_SCHEMA`) e auto-criação do banco quando necessário.
- Previews de documentos utilizam conversão Office→PDF (opcional via LibreOffice) e fallback com ReportLab.
- Todas as queries são parametrizadas via psycopg e utilizam índices estratégicos para performance.

### Versão SVG

Para uso em apresentações e leitura rápida, o diagrama está disponível em SVG:

![Arquitetura Backend — INPROLIB](static/img/backend-architecture.svg)

### Versão PNG (fallback)

Se houver qualquer problema de visualização com o SVG no seu ambiente, utilize a versão em PNG (compatibilidade ampla):

![Arquitetura Backend — INPROLIB (PNG)](static/img/backend-architecture.png)