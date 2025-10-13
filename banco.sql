-- --------------------------------------------------------
-- Script de Criação de Banco de Dados INPROLIB para PostgreSQL
-- Conversão do script MariaDB original.
-- --------------------------------------------------------

-- Recomenda-se criar o banco de dados 'inprolib_schema' no seu ambiente PostgreSQL
-- antes de executar este script, e então conectar a ele.
-- Exemplo para psql:
-- CREATE DATABASE inprolib_schema WITH ENCODING 'UTF8' LC_COLLATE 'pt_BR.UTF-8' LC_CTYPE 'pt_BR.UTF-8';
-- \c inprolib_schema;


-- 1. CRIAÇÃO DE TIPOS ENUM (Substituem os ENUMs do MariaDB)

CREATE TYPE status_esqueci_senha AS ENUM ('Ativo', 'Expirado');
CREATE TYPE status_publicacao AS ENUM ('Publicado', 'Desativado');
CREATE TYPE tipo_relatorio AS ENUM ('Por Curso', 'Por Data', 'Por Pessoa');
CREATE TYPE tipo_usuario AS ENUM ('Funcionário', 'Professor', 'Coordenador', 'Secretaria', 'Bibliotecaria', 'Aluno');


-- 2. CRIAÇÃO DE TABELAS

-- Tabela "usuario" (Criada primeiro devido às chaves estrangeiras)
CREATE TABLE "usuario" (
  "id_usuario" SERIAL PRIMARY KEY,
  "nome" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "cpf" VARCHAR(255) NOT NULL,
  "senha" VARCHAR(255) NOT NULL,
  "tipo" tipo_usuario NOT NULL,
  "foto_perfil" VARCHAR(255) DEFAULT NULL,
  "curso_usuario" VARCHAR(255) DEFAULT NULL,
  "tokenRecuperarSenha" VARCHAR(50) DEFAULT NULL
);

-- Tabela "audit_login"
CREATE TABLE "audit_login" (
  "id_audit" SERIAL PRIMARY KEY,
  "nome_usuario" VARCHAR(255) DEFAULT NULL,
  "imagem_usuario" VARCHAR(255) DEFAULT NULL,
  "ultimo_login" TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

-- Tabela "curso"
CREATE TABLE "curso" (
  "id_curso" SERIAL PRIMARY KEY,
  "nome_curso" VARCHAR(255) NOT NULL,
  "id_coordenador" INTEGER DEFAULT NULL,
  "descricao_curso" VARCHAR(50) DEFAULT NULL,
  "codigo_curso" VARCHAR(50) DEFAULT NULL,
  "autorizacao" VARCHAR(255) DEFAULT NULL,
  CONSTRAINT "curso_id_coordenador_fkey" FOREIGN KEY ("id_coordenador") REFERENCES "usuario" ("id_usuario") ON DELETE SET NULL
);

-- Tabela "esqueci_senha"
CREATE TABLE "esqueci_senha" (
  "id_solicitacao" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL,
  "data_solicitacao" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "status" status_esqueci_senha NOT NULL
);

-- Tabela "funcao"
CREATE TABLE "funcao" (
  "id_funcao" SERIAL PRIMARY KEY,
  "descricao" VARCHAR(255) NOT NULL
);

-- Tabela "logs"
CREATE TABLE "logs" (
  "id_log" SERIAL PRIMARY KEY,
  "id_usuario" INTEGER DEFAULT NULL,
  "atividade" VARCHAR(255) NOT NULL,
  "data_hora" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  CONSTRAINT "logs_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE
);

-- Tabela "publicacao"
-- Nota: O campo "tipo" foi mantido como VARCHAR(255) para flexibilidade, já que o DDL original não o tratava como ENUM, apesar de haver uma tabela 'tipos_de_publicacao'.
CREATE TABLE "publicacao" (
  "id_publicacao" SERIAL PRIMARY KEY,
  "titulo" VARCHAR(255) NOT NULL,
  "data_publicacao" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "id_autor" INTEGER DEFAULT NULL,
  "id_curso" INTEGER DEFAULT NULL,
  "tipo" VARCHAR(255) NOT NULL DEFAULT '',
  "status" status_publicacao NOT NULL,
  "arquivo" VARCHAR(255) DEFAULT NULL,
  "nome_arquivo" VARCHAR(255) DEFAULT NULL,
  "assuntos_relacionados" VARCHAR(255) DEFAULT NULL,
  "data_autoria" DATE DEFAULT NULL,
  CONSTRAINT "publicacao_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE,
  CONSTRAINT "publicacao_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso" ("id_curso") ON DELETE CASCADE
);

-- Tabela "relatorio"
CREATE TABLE "relatorio" (
  "id_relatorio" SERIAL PRIMARY KEY,
  "tipo" tipo_relatorio NOT NULL,
  "data_geracao" DATE NOT NULL
);

-- Tabela "tipos_de_publicacao"
CREATE TABLE "tipos_de_publicacao" (
  "id" SERIAL PRIMARY KEY,
  "nome_tipo" VARCHAR(255) NOT NULL
);

-- Tabela "usuario_curso" (Tabela de relacionamento N:N)
CREATE TABLE "usuario_curso" (
  "id" SERIAL PRIMARY KEY,
  "id_usuario" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  CONSTRAINT "usuario_curso_unique_pair" UNIQUE ("id_usuario", "id_curso"),
  CONSTRAINT "usuario_curso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE,
  CONSTRAINT "usuario_curso_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso" ("id_curso") ON DELETE CASCADE
);

-- Tabela "usuario_funcao" (Tabela de relacionamento N:N)
CREATE TABLE "usuario_funcao" (
  "id_usuario" INTEGER NOT NULL,
  "id_funcao" INTEGER NOT NULL,
  PRIMARY KEY ("id_usuario", "id_funcao"),
  CONSTRAINT "usuario_funcao_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE,
  CONSTRAINT "usuario_funcao_id_funcao_fkey" FOREIGN KEY ("id_funcao") REFERENCES "funcao" ("id_funcao") ON DELETE CASCADE
);

-- 3. INSERÇÃO DE DADOS

-- DADOS: "usuario"
-- Os IDs existentes são inseridos para manter a integridade referencial.
INSERT INTO "usuario" ("id_usuario", "nome", "email", "cpf", "senha", "tipo", "foto_perfil", "curso_usuario", "tokenRecuperarSenha") VALUES
  (11, 'Lívio Lucas', 'liviool123@gmail.com', '702.121.941-51', '$argon2id$v=19$m=65536,t=3,p=4$uhPG3V16xVrmOewlj/Z3Jw$PHKo4R8iqNtkaEELr5UhRCVV4avAsSAHlt7nWhzvT1E', 'Professor', '..\\static\\img\\fotoLivio.png', 'Curso de Acupuntura', '3D6DD0'),
  (13, 'Leonardo Santos Henrique Melo', 'leoshmello@gmail.com', '810.301.940-25', '794613', 'Professor', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\fotoperfil\\Screenshot_1.png', 'Psicologia', NULL),
  (14, 'teste', 'teste@gmail.com', '686.013.600-68', '123', 'Aluno', '..\\static\\img\\pentagono.png', 'Administração', NULL),
  (15, 'TCHÊRERE', 'gustavoteste@gmail.com', '113.233.720-83', '123123', 'Professor', '..\\static\\img\\tcherere.png', 'Administração', NULL),
  (16, 'Gustavo Henrique Suriane', 'gusSuriane@gmail.com', '984.864.811-21', '159159', 'Funcionário', '..\\static\\img\\wppLIVIO.jpg', NULL, NULL),
  (17, 'Lucas Rodrigues Vargas', 'Lucas@gmail.com', '662.181.111-23', '321321', 'Aluno', '..\\static\\img\\wppLIVIO.jpg', 'Curso de Logística', NULL),
  (18, 'Usuário com hash', 'test1e@gmail.com', '965.046.870-64', '$argon2id$v=19$m=65536,t=3,p=4$QjhuF8a2OY7jAG0g59RV/A$FAgUmlCmFUsTUJGLER9lV52Yd9hh+dm5m790tIEn/TQ', 'Funcionário', NULL, NULL, NULL);

-- Ajusta a sequência SERIAL para o próximo ID a ser inserido, mantendo a numeração.
SELECT setval('usuario_id_usuario_seq', (SELECT MAX("id_usuario") FROM "usuario"));

-- DADOS: "audit_login"
INSERT INTO "audit_login" ("id_audit", "nome_usuario", "imagem_usuario", "ultimo_login") VALUES
  (2, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 16:33:18'),
  (3, 'Leonardo Santos Henrique Melo', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\fotoperfil\\Screenshot_1.png', '2024-12-04 16:34:26'),
  (4, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 21:46:28'),
  (5, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:12:47'),
  (6, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:19:17'),
  (7, 'teste', '..\\static\\img\\pentagono.png', '2024-12-04 22:23:02'),
  (8, 'teste', '..\\static\\img\\pentagono.png', '2024-12-04 22:23:33'),
  (9, 'teste', '..\\static\\img\\pentagono.png', '2024-12-04 22:26:53'),
  (10, 'TCHÊRERE', '..\\static\\img\\tcherere.png', '2024-12-04 22:35:09'),
  (11, 'TCHÊRERE', '..\\static\\img\\tcherere.png', '2024-12-04 22:35:39'),
  (12, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:35:48'),
  (13, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:38:56'),
  (14, 'TCHÊRERE', '..\\static\\img\\tcherere.png', '2024-12-04 22:39:04'),
  (15, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:42:02'),
  (16, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:46:08'),
  (17, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:53:08'),
  (18, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-10 15:49:46'),
  (19, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-10 15:50:15'),
  (20, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-16 16:22:09'),
  (21, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-16 16:22:26'),
  (22, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-16 23:42:56'),
  (23, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:32:10'),
  (24, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:32:27'),
  (25, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:34:37'),
  (26, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:37:01'),
  (27, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:54:12'),
  (28, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:56:11'),
  (29, 'Gustavo Henrique Suriane', '..\\static\\img\\wppLIVIO.jpg', '2024-12-17 01:00:01'),
  (30, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 01:07:53'),
  (31, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 16:01:50'),
  (32, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 16:18:14'),
  (33, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 16:51:00'),
  (34, 'Lucas Rodrigues Vargas', '..\\static\\img\\wppLIVIO.jpg', '2024-12-17 16:52:09'),
  (35, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 17:08:35');

SELECT setval('audit_login_id_audit_seq', (SELECT MAX("id_audit") FROM "audit_login"));

-- DADOS: "curso"
INSERT INTO "curso" ("id_curso", "nome_curso", "id_coordenador", "descricao_curso", "codigo_curso", "autorizacao") VALUES
  (4, 'Psicologia', NULL, 'Curso de Bacharelado em Psicologia', 'PSI2024/2', 'teste do livio'),
  (5, 'Administração', 13, 'Curso de Administração', 'ADM 2024.2', 'teste do livio'),
  (6, 'Enfermagem', 15, 'Curso de Enfermagem 2024.2', 'ENF 2024.2', 'TESTE TCHERERE'),
  (7, 'teste', 13, 'teste', 'teste', 'TESTE TCHERERE'),
  (8, 'Curso de Acupuntura', 13, 'Pós Graduação em Acupuntura', 'ACUP2024.2', '1095'),
  (9, 'Curso de Logística', 11, 'Graduação em Logistica', 'LOG.2024-2', '6474/24');

SELECT setval('curso_id_curso_seq', (SELECT MAX("id_curso") FROM "curso"));

-- DADOS: "publicacao"
INSERT INTO "publicacao" ("id_publicacao", "titulo", "data_publicacao", "id_autor", "id_curso", "tipo", "status", "arquivo", "nome_arquivo", "assuntos_relacionados", "data_autoria") VALUES
  (14, '1732719355852.pdf', '2024-11-27 17:28:36', 15, 5, 'Tese', 'Publicado', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\arquivos\\upload\\1732719355852.pdf', 'Testando commit', 'teste', '2024-11-12'),
  (15, '1734379903304.pdf', '2024-12-17 00:58:17', 11, 8, 'Dissertações', 'Publicado', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\arquivos\\upload\\1734379903304.pdf', 'Acupuntura e os benefícios da Saúde ', 'Saúde', '2024-12-16'),
  (16, '24100757.58_-_José_Guilherme_Paciléo_Zanardo_-_17122024112354208.pdf', '2024-12-17 16:54:00', 17, 9, 'Monografia', 'Publicado', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\arquivos\\upload\\24100757.58_-_José_Guilherme_Paciléo_Zanardo_-_17122024112354208.pdf', 'Cargas Orgânicas ', 'Logistica', '2024-12-17');

SELECT setval('publicacao_id_publicacao_seq', (SELECT MAX("id_publicacao") FROM "publicacao"));

-- DADOS: "tipos_de_publicacao"
INSERT INTO "tipos_de_publicacao" ("id", "nome_tipo") VALUES
  (1, 'TCC'),
  (2, 'Dissertação'),
  (3, 'Monografia'),
  (4, 'Tese');

SELECT setval('tipos_de_publicacao_id_seq', (SELECT MAX("id") FROM "tipos_de_publicacao"));

-- As tabelas "esqueci_senha", "funcao", "logs", "relatorio", "usuario_curso" e "usuario_funcao" não possuem dados de INSERT no script original, portanto, ficam vazias.

-- --------------------------------------------------------
-- FIM DO SCRIPT
-- --------------------------------------------------------