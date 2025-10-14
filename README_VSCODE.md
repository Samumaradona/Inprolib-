# Guia Simples — Usando no VSCode (Windows)

Este passo a passo foi feito para quem é leigo e quer abrir e rodar o INPROLIB no VSCode de forma simples.

## 1) Instalar o que é necessário
- Python: baixe em `https://www.python.org/downloads/` (recomendado 3.11). Marque a opção "Add Python to PATH" na instalação.
- PostgreSQL: baixe em `https://www.postgresql.org/download/windows/`. Anote usuário e senha (ex.: `postgres` / `postgres`).
- VSCode: baixe em `https://code.visualstudio.com/`.

## 2) Abrir o projeto no VSCode
- Abra o VSCode.
- Menu `File` → `Open Folder...` → escolha a pasta do projeto: `Tela test ADM`.
- Instale a extensão "Python" (aparece um aviso sugestivo ao abrir o projeto; clique em Install).

## 3) Criar ambiente virtual e instalar dependências
No VSCode, abra o Terminal integrado:
- Menu `Terminal` → `New Terminal`.
- No terminal, rode:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Se aparecer aviso de executáveis bloqueados, confirme a execução do `.venv\Scripts\activate`.

## 4) Configurar o banco (simples)
- Crie um banco chamado `inprolib_schema` no PostgreSQL (use o pgAdmin ou psql).
- Importe o arquivo `banco.sql` no banco (em pgAdmin: botão direito no banco → Query Tool → cole o conteúdo e execute).

## 5) Configurar variáveis (opcional)
- Crie um arquivo `.env` na raiz do projeto com conteúdo básico:

```
SECRET_KEY=inprolib_secret_key_2024
DB_NAME=inprolib_schema
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
ADMIN_SETUP_TOKEN=setup_admin_2024
ADMIN_TEMP_PASSWORD=Adm@2025!
```

Se não criar `.env`, o projeto usa valores padrão para desenvolvimento.

## 6) Rodar o servidor
No terminal do VSCode (com o `.venv` ativado):

```
python app.py
```

Abra o navegador e acesse:
- `http://127.0.0.1:5000/home`

Para parar o servidor: no terminal, pressione `Ctrl+C`.

## 7) Criar o usuário Administrador (opcional, rápido)
Abra no navegador:
- `http://127.0.0.1:5000/setup_admin?token=setup_admin_2024&senha=Adm@2025!`

Isso cria/atualiza um admin com a senha fornecida. Você pode informar `nome`, `email` e `cpf` via querystring se quiser.

## 8) Testar Cadastro de Alunos
- No menu, abra `Cadastro de Alunos`.
- Preencha nome, CPF, e-mail e senha (confirme a senha) e resolva o captcha.
- Clique em Salvar.
- Você será redirecionado para a Home e verá a mensagem verde de sucesso.

## 9) Verificar o menu "Avaliação"
- O item “Avaliação” aparece para perfis `Administrador` e `Docente`.
- Se não aparecer, faça um hard refresh no navegador: `Ctrl+F5`.

## 10) Dicas úteis
- Após mudanças em arquivos `.js` ou `.css`, use `Ctrl+F5` para forçar recarregamento.
- Se algo não abrir, confirme que o servidor está ativo no terminal do VSCode.
- Para reiniciar o servidor: `Ctrl+C` e depois `python app.py` novamente.

Pronto! Com esses passos você abre, roda e testa a aplicação pelo VSCode sem complicações.