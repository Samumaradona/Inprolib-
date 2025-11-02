-- Estrutura do banco de dados para o projeto INPROLIB
-- PostgreSQL

-- Drop existing tables to start clean
DROP TABLE IF EXISTS "public"."usuario_curso" CASCADE;
DROP TABLE IF EXISTS "public"."avaliacao" CASCADE;
DROP TABLE IF EXISTS "public"."publicacao" CASCADE;
DROP TABLE IF EXISTS "public"."curso" CASCADE;
DROP TABLE IF EXISTS "public"."usuario" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_de_publicacao" CASCADE;
DROP TABLE IF EXISTS "public"."esqueci_senha" CASCADE;

-- ENUMs para tipos e status
CREATE TYPE "public"."tipo_usuario" AS ENUM ('Aluno', 'Professor', 'Funcionário');
CREATE TYPE "public"."status_publicacao" AS ENUM ('Publicado', 'Pendente', 'Reprovado');

-- Tabela de Usuários
CREATE TABLE "public"."usuario" (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo tipo_usuario NOT NULL,
    curso_usuario VARCHAR(255),
    foto_perfil VARCHAR(255), -- Caminho para a foto
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    cep VARCHAR(9),
    logradouro VARCHAR(255),
    complemento VARCHAR(255),
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    estado VARCHAR(2)
);

-- Tabela de Cursos
CREATE TABLE "public"."curso" (
    id_curso SERIAL PRIMARY KEY,
    nome_curso VARCHAR(255) NOT NULL,
    descricao TEXT,
    codigo_curso VARCHAR(50) UNIQUE,
    autorizacao VARCHAR(100),
    id_coordenador INTEGER REFERENCES "public"."usuario"(id_usuario),
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabela de Tipos de Publicação
CREATE TABLE "public"."tipos_de_publicacao" (
    id_tipo SERIAL PRIMARY KEY,
    nome_tipo VARCHAR(100) NOT NULL UNIQUE
);

-- Tabela de Publicações
CREATE TABLE "public"."publicacao" (
    id_publicacao SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    data_publicacao DATE NOT NULL,
    id_autor INTEGER NOT NULL REFERENCES "public"."usuario"(id_usuario),
    id_curso INTEGER REFERENCES "public"."curso"(id_curso),
    tipo VARCHAR(100) REFERENCES "public"."tipos_de_publicacao"(nome_tipo),
    status status_publicacao NOT NULL,
    arquivo VARCHAR(255), -- Caminho para o arquivo
    nome_arquivo VARCHAR(255),
    assuntos_relacionados TEXT,
    data_autoria DATE
);

-- Tabela de Avaliações
CREATE TABLE "public"."avaliacao" (
    id_avaliacao SERIAL PRIMARY KEY,
    id_publicacao INTEGER NOT NULL REFERENCES "public"."publicacao"(id_publicacao),
    id_avaliador INTEGER NOT NULL REFERENCES "public"."usuario"(id_usuario),
    nota DECIMAL(3, 1),
    comentario TEXT,
    data_avaliacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Vínculo entre Usuário e Curso (N-N)
CREATE TABLE "public"."usuario_curso" (
    id_usuario INTEGER NOT NULL REFERENCES "public"."usuario"(id_usuario),
    id_curso INTEGER NOT NULL REFERENCES "public"."curso"(id_curso),
    PRIMARY KEY (id_usuario, id_curso)
);

-- Tabela para recuperação de senha
CREATE TABLE "public"."esqueci_senha" (
    id_solicitacao SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    data_solicitacao TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL -- Ex: 'Ativo', 'Utilizado', 'Expirado'
);

-- Dados iniciais para tipos de publicação
INSERT INTO "public"."tipos_de_publicacao" (nome_tipo) VALUES
('TCC'),
('Dissertação'),
('Monografia'),
('Tese'),
('Artigo Científico'),
('Relatório Técnico'),
('Outro');

-- Índices para otimização de consultas
CREATE INDEX idx_usuario_email ON "public"."usuario"(email);
CREATE INDEX idx_publicacao_autor ON "public"."publicacao"(id_autor);
CREATE INDEX idx_publicacao_curso ON "public"."publicacao"(id_curso);