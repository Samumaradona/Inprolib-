# Banco de Dados — INPROLIB

Este documento descreve a estrutura do banco, os dados iniciais e como preparar o PostgreSQL para o projeto.

## Visão Geral
- Banco: `PostgreSQL`
- Schema: `inprolib_schema`
- Script: `banco.sql` (na raiz do projeto)

Principais entidades:
- `usuario` com campos como `nome`, `cpf`, `email`, `senha` (armazenada com hash pela aplicação).
- `curso` com `nome_curso`, `descricao`, `codigo_curso`, `autorizacao`, `id_coordenador`.
- `publicacao` com `titulo`, `data_publicacao`, `id_autor`, `id_curso`, `tipo`, `status`, `arquivo`, `nome_arquivo`.
- `usuario_curso` (N:N) entre `usuario` e `curso`.
- `tipos_de_publicacao` (lista de tipos usados na UI, ex.: TCC, Dissertação, Monografia, Tese).

Tipos/Enums:
- `status_publicacao` para status de publicação (ex.: `Publicado`).

## O que foi feito (alterações relevantes)
- A aplicação passou a gerar hash de senhas (`pbkdf2:sha256`) em novos cadastros de alunos.
- Adicionada rotina de migração para converter senhas em texto puro para hash.
  - O script do banco pode conter senhas já no formato Argon2 em alguns usuários; a migração ignora entradas que já estão com hash.

## Preparação do Banco
1. Crie o banco e schema (ajuste conforme sua instalação):
   - Crie um banco chamado `inprolib_schema` (ou ajuste `DB_CONFIG` na aplicação).
2. Execute o script:
   - Via `psql`:
     - `psql -U postgres -h localhost -p 5432 -d inprolib_schema -f banco.sql`
   - Verifique se as tabelas e sequências foram criadas corretamente.
3. Dados iniciais:
   - `tipos_de_publicacao` é populada no fim do `banco.sql`.
   - Outras tabelas podem iniciar vazias.

## Integração com a Aplicação
- Configuração de conexão está em `app.py` (`DB_CONFIG`).
- Pasta de uploads: `static/uploads` para arquivos anexados em publicações.
- A aplicação valida tipos de arquivos permitidos (PDF, DOC/DOCX, XLS/XLSX, CSV, TXT, PNG, JPG/JPEG, WEBP).

## Migração de Senhas (Hash)
- Com o servidor parado, execute:
  - `python app.py --hash-migrate`
- A rotina:
  - Conecta ao banco e converte senhas que não parecem ser hash.
  - Usa `pbkdf2:sha256` com salt aleatório gerenciado pelo Werkzeug.