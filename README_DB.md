# Banco de Dados — INPROLIB

Sistema de banco de dados PostgreSQL robusto e otimizado para gerenciamento de repositório institucional acadêmico, com suporte completo a relacionamentos complexos, auditoria e performance.

## 🗄️ Tecnologia e Arquitetura

### Stack de Banco de Dados
- **PostgreSQL** - SGBD relacional principal
- **psycopg[binary] 3.2.10** - Driver Python com suporte nativo
- **Schema Público** - Organização padrão com flexibilidade para múltiplos schemas
- **ENUMs Customizados** - Tipos de dados específicos do domínio
- **Índices Otimizados** - Performance para consultas frequentes

### Características Técnicas
- **ACID Compliance** - Transações seguras e consistentes
- **Foreign Keys** - Integridade referencial garantida
- **Cascade Operations** - Operações em cascata controladas
- **Auto-increment** - Chaves primárias com SERIAL
- **UTF-8 Encoding** - Suporte completo a caracteres especiais

## 📊 Schema Completo

### Tipos Enumerados (ENUMs)

#### tipo_usuario
```sql
CREATE TYPE "public"."tipo_usuario" AS ENUM (
    'Aluno', 
    'Professor', 
    'Funcionário'
);
```

#### status_publicacao
```sql
CREATE TYPE "public"."status_publicacao" AS ENUM (
    'Publicado', 
    'Pendente', 
    'Reprovado'
);
```

### Tabelas Principais

#### 👤 usuario
**Gerenciamento completo de usuários com dados pessoais e endereço**
```sql
CREATE TABLE "public"."usuario" (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo tipo_usuario NOT NULL,
    curso_usuario VARCHAR(255),
    foto_perfil VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    -- Dados de Endereço
    cep VARCHAR(9),
    logradouro VARCHAR(255),
    complemento VARCHAR(255),
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    estado VARCHAR(2)
);
```

**Características:**
- **Chave Primária**: `id_usuario` (SERIAL)
- **Constraints Únicos**: `cpf`, `email`
- **Validações**: Tipo de usuário via ENUM
- **Soft Delete**: Campo `ativo` para desativação lógica
- **Endereço Completo**: Suporte a CEP e dados de localização

#### 🎓 curso
**Gestão de cursos acadêmicos com coordenação**
```sql
CREATE TABLE "public"."curso" (
    id_curso SERIAL PRIMARY KEY,
    nome_curso VARCHAR(255) NOT NULL,
    descricao TEXT,
    codigo_curso VARCHAR(50) UNIQUE,
    autorizacao VARCHAR(100),
    id_coordenador INTEGER REFERENCES "public"."usuario"(id_usuario),
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);
```

**Características:**
- **Relacionamento**: Coordenador → `usuario.id_usuario`
- **Código Único**: Identificação institucional
- **Autorização**: Número de autorização MEC
- **Soft Delete**: Campo `ativo`

#### 📚 publicacao
**Repositório de publicações acadêmicas**
```sql
CREATE TABLE "public"."publicacao" (
    id_publicacao SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    data_publicacao DATE NOT NULL,
    id_autor INTEGER NOT NULL REFERENCES "public"."usuario"(id_usuario),
    id_curso INTEGER REFERENCES "public"."curso"(id_curso),
    tipo VARCHAR(100) REFERENCES "public"."tipos_de_publicacao"(nome_tipo),
    status status_publicacao NOT NULL,
    arquivo VARCHAR(255),
    nome_arquivo VARCHAR(255),
    assuntos_relacionados TEXT,
    data_autoria DATE
);
```

**Características:**
- **Relacionamentos**: Autor → `usuario`, Curso → `curso`, Tipo → `tipos_de_publicacao`
- **Status Controlado**: Via ENUM `status_publicacao`
- **Metadados**: Assuntos relacionados, datas de publicação e autoria
- **Arquivos**: Suporte a upload com nome original preservado

#### ⭐ avaliacao
**Sistema de avaliação peer-review**
```sql
CREATE TABLE "public"."avaliacao" (
    id_avaliacao SERIAL PRIMARY KEY,
    id_publicacao INTEGER NOT NULL REFERENCES "public"."publicacao"(id_publicacao),
    id_avaliador INTEGER NOT NULL REFERENCES "public"."usuario"(id_usuario),
    nota DECIMAL(3, 1),
    comentario TEXT,
    data_avaliacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Características:**
- **Relacionamentos**: Publicação → `publicacao`, Avaliador → `usuario`
- **Nota Decimal**: Precisão de 1 casa decimal (0.0 a 99.9)
- **Timestamp Automático**: Data/hora da avaliação
- **Comentários**: Feedback textual ilimitado

#### 🔗 usuario_curso (Tabela de Relacionamento N:N)
**Vínculo entre usuários e cursos**
```sql
CREATE TABLE "public"."usuario_curso" (
    id_usuario INTEGER NOT NULL REFERENCES "public"."usuario"(id_usuario),
    id_curso INTEGER NOT NULL REFERENCES "public"."curso"(id_curso),
    PRIMARY KEY (id_usuario, id_curso)
);
```

**Características:**
- **Chave Composta**: Combinação única usuário-curso
- **Relacionamento N:N**: Um usuário pode estar em múltiplos cursos

#### 📝 tipos_de_publicacao
**Categorização de tipos de trabalhos acadêmicos**
```sql
CREATE TABLE "public"."tipos_de_publicacao" (
    id_tipo SERIAL PRIMARY KEY,
    nome_tipo VARCHAR(100) NOT NULL UNIQUE
);
```

**Dados Pré-carregados:**
- TCC
- Dissertação
- Monografia
- Tese
- Artigo Científico
- Relatório Técnico
- Outro

#### 🔐 esqueci_senha
**Sistema de recuperação de senha**
```sql
CREATE TABLE "public"."esqueci_senha" (
    id_solicitacao SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    data_solicitacao TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL
);
```

**Status Possíveis:**
- `Ativo` - Token válido e não utilizado
- `Utilizado` - Token já foi usado
- `Expirado` - Token vencido

## 🚀 Otimizações e Performance

### Índices Estratégicos
```sql
-- Otimização para login e busca de usuários
CREATE INDEX idx_usuario_email ON "public"."usuario"(email);

-- Performance para consultas de publicações por autor
CREATE INDEX idx_publicacao_autor ON "public"."publicacao"(id_autor);

-- Otimização para filtros por curso
CREATE INDEX idx_publicacao_curso ON "public"."publicacao"(id_curso);
```

### Estratégias de Performance
- **Índices Compostos**: Para consultas multi-campo frequentes
- **EXPLAIN ANALYZE**: Monitoramento de queries lentas
- **Connection Pooling**: Via psycopg com timeout configurável
- **Prepared Statements**: Todas as queries são parametrizadas

## 🔧 Configuração e Instalação

### Variáveis de Ambiente
```env
# Configuração Principal
DB_NAME=inprolib_schema
DB_USER=postgres
DB_PASSWORD=sua_senha_segura
DB_HOST=localhost
DB_PORT=5432
DB_SCHEMA=public

# Configuração Avançada
DATABASE_URL=postgresql://user:pass@host:port/dbname
DB_CONNECT_TIMEOUT=5
DB_POOL_SIZE=10
```

### Scripts de Automação

#### Criação do Banco
```bash
python scripts/create_db.py
```

#### Aplicação do Schema
```bash
python scripts/apply_sql.py
```

### Inicialização Automática
O sistema possui **auto-criação** do banco de dados:
- Detecta se o banco não existe
- Conecta no banco administrativo `postgres`
- Cria o banco automaticamente
- Aplica o schema inicial

## 🔄 Relacionamentos e Integridade

### Diagrama de Relacionamentos
```
usuario (1) ←→ (N) publicacao
usuario (1) ←→ (N) avaliacao
usuario (N) ←→ (N) curso [via usuario_curso]
curso (1) ←→ (N) publicacao
publicacao (1) ←→ (N) avaliacao
tipos_de_publicacao (1) ←→ (N) publicacao
```

### Regras de Integridade
- **Cascade Delete**: Configurado para relacionamentos críticos
- **Foreign Key Constraints**: Todas as referências são validadas
- **Unique Constraints**: CPF e email únicos por usuário
- **Not Null**: Campos obrigatórios protegidos
- **Check Constraints**: Validações de domínio via ENUMs

## 📈 Funcionalidades Avançadas

### Sistema de Auditoria
- **Logs de Acesso**: Rastreamento de downloads
- **Histórico de Alterações**: Metadados de modificação
- **Controle de Versão**: Suporte a versionamento de publicações

### Busca e Filtros
- **Full-Text Search**: Busca em títulos, autores e assuntos
- **Filtros Combinados**: Por curso, tipo, status, data
- **Ordenação Flexível**: Por relevância, data, autor
- **Paginação**: Performance otimizada para grandes volumes

### Relatórios e Analytics
- **Consultas Agregadas**: Estatísticas por curso, período, tipo
- **Exportação**: Suporte a Excel, PDF, CSV
- **Dashboards**: Métricas de uso e performance

## 🛡️ Segurança e Backup

### Medidas de Segurança
- **Conexões Criptografadas**: SSL/TLS obrigatório em produção
- **Usuários Limitados**: Princípio do menor privilégio
- **Sanitização**: Todas as queries são parametrizadas
- **Timeout de Conexão**: Prevenção de ataques de negação

### Estratégia de Backup
```bash
# Backup Completo
pg_dump -h localhost -U postgres -d inprolib_schema > backup_$(date +%Y%m%d).sql

# Backup Incremental
pg_basebackup -h localhost -U postgres -D backup_incremental/

# Restauração
psql -h localhost -U postgres -d inprolib_schema < backup_20240101.sql
```

### Monitoramento
- **Logs de Conexão**: Auditoria de acessos
- **Performance Metrics**: Tempo de resposta das queries
- **Espaço em Disco**: Monitoramento de crescimento
- **Índices Não Utilizados**: Otimização contínua

## 🔄 Manutenção e Evolução

### Rotinas de Manutenção
```sql
-- Análise de estatísticas
ANALYZE;

-- Limpeza de espaço
VACUUM FULL;

-- Reindexação
REINDEX DATABASE inprolib_schema;
```

### Versionamento do Schema
- **Migrations**: Scripts de evolução controlada
- **Rollback**: Capacidade de reverter alterações
- **Testes**: Validação em ambiente de desenvolvimento
- **Documentação**: Changelog detalhado de alterações

### Escalabilidade
- **Particionamento**: Para tabelas com grande volume
- **Read Replicas**: Distribuição de carga de leitura
- **Connection Pooling**: Otimização de recursos
- **Caching**: Redis para consultas frequentes

## 📋 Troubleshooting

### Problemas Comuns

#### Erro de Conexão
```bash
# Verificar status do PostgreSQL
systemctl status postgresql

# Testar conexão
psql -h localhost -U postgres -d inprolib_schema
```

#### Performance Lenta
```sql
-- Identificar queries lentas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Analisar índices não utilizados
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

#### Espaço em Disco
```sql
-- Verificar tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🎯 Próximas Evoluções

### Funcionalidades Planejadas
- **Versionamento de Documentos**: Controle de versões de publicações
- **Workflow de Aprovação**: Fluxo multi-etapas para publicações
- **Integração com ORCID**: Identificação única de pesquisadores
- **API GraphQL**: Interface moderna para consultas complexas
- **Elasticsearch**: Busca full-text avançada
- **Data Warehouse**: Analytics e Business Intelligence