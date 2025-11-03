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

### Produção (Render/Heroku)
```yaml
# render.yaml
services:
  - type: web
    name: inprolib
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    disk:
      name: uploads
      mountPath: /opt/render/project/src/static/uploads
      sizeGB: 1
```

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