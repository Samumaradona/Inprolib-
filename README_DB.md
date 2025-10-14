# Banco de Dados — INPROLIB

Estrutura do banco, dados iniciais e integração com a aplicação.

## Visão Geral
- Banco: `PostgreSQL`
- Schema: `inprolib_schema`
- Script: `banco.sql` (raiz do projeto)

Principais entidades:
- `usuario`: `nome`, `cpf`, `email`, `senha` (hash via aplicação), `tipo`, `curso_usuario`.
- `curso`: `id_curso`, `nome_curso`, `descricao`, `codigo_curso`, `autorizacao`, `id_coordenador`.
- `publicacao`: `id_publicacao`, `titulo`, `data_publicacao`, `id_autor`, `id_curso`, `tipo`, `status`, `arquivo`, `nome_arquivo`, `assuntos_relacionados`, `data_autoria`.
- `usuario_curso`: relação N:N entre `usuario` e `curso`.
- `tipos_de_publicacao`: lista de tipos (TCC, Dissertação, Monografia, Tese, etc.).

Tipos/Enums:
- `status_publicacao` contendo status como `Publicado`.

## O que está em uso pela aplicação
- Senhas de novos cadastros são armazenadas com hash `pbkdf2:sha256`.
- Uploads de publicações são gravados com caminho completo e `nome_arquivo` sanitizado.
- Consultas em “Publicação” usam `nome_arquivo` e `data_publicacao` para preview no frontend.
- Nenhuma mudança de schema foi necessária nas últimas atualizações.

## Preparação do Banco
1. Crie o banco/schema (ajuste conforme ambiente):
   - Banco `inprolib_schema` (ou ajuste `DB_CONFIG` na aplicação).
2. Execute o script:
   - `psql -U postgres -h localhost -p 5432 -d inprolib_schema -f banco.sql`
   - Verifique tabelas e sequências.
3. Dados iniciais:
   - `tipos_de_publicacao` é populada no fim do `banco.sql`.
   - Outras tabelas podem iniciar vazias.

## Integração com a Aplicação
- Configuração de conexão e credenciais em `app.py` (`DB_CONFIG`).
- Pasta de uploads: `static/uploads`.
- Extensões permitidas: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`.

## Migração de Senhas (Hash)
- Com o servidor parado:
  - `python app.py --hash-migrate`
- A rotina converte senhas que não parecem ser hash e ignora entradas já com hash.

## Dica para Admin
- Crie/atualize o admin em `GET /setup_admin` usando o token configurado em `ADMIN_SETUP_TOKEN`.
- Exemplo: `http://127.0.0.1:5000/setup_admin?token=setup_admin_2024&senha=Adm@2025!`