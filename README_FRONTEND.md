# Frontend — INPROLIB

Este documento cobre templates (Jinja/HTML), estilos e JavaScript, incluindo validações, acessibilidade e as mudanças implementadas nesta entrega.

## Estrutura
- Templates: `templates/`
  - `home.html`, `cadastro_alunos.html`, `cadastro_curso.html`, `publicacao.html`, `avaliacao.html`, `vinculacao_curso.html`, `suporte.html`, `relatorio.html`, `configuracao.html`, `login.html`, etc.
- Estilos: `static/css/`
  - `home.css`, `cadastro_alunos.css`, `cadastro_curso.css`, `publicacao.css`, `avaliacao.css`, `relatorio.css`, `suporte.css`, `vinculacao_curso.css`, `cadastro_login.css`.
- JavaScript: `static/javascript/`
  - `home.js`: menu lateral, perfil, notificações, validador/máscaras e regras de formulários.
  - `publicacao.js`: modal de visualização de publicações (novo).

## Cabeçalhos e Sessão
- Padronização do cabeçalho para exibir o nome do usuário a partir de `session.user_name` quando logado.
- Ao não estar autenticado, elementos de perfil/notificações não exibem nome e rotas internas redirecionam para login.

## Publicação: Visualização via Modal (Novo)
- Na lista “Últimas publicações” (`publicacao.html`), as linhas da tabela ficaram clicáveis.
- Ao clicar, abre um modal com:
  - Título, Tipo, Curso, Data da publicação.
  - Pré-visualização do conteúdo quando possível:
    - Imagens (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`): exibem no modal.
    - PDF: abre em `<iframe>` dentro do modal.
    - Outros tipos (DOC, XLS, CSV, etc.): exibem aviso e botão “Abrir/baixar conteúdo”.
- JavaScript dedicado: `publicacao.js` (adicionado ao template como `publicacao.js?v=1` para cache busting).

## Validações e Máscaras
- CPF (cadastro de alunos): máscara `000.000.000-00`, `pattern` e validação de dígitos.
- Portaria (curso): apenas dígitos (`inputmode=numeric`).
- Captcha: apenas dígitos (`pattern=\d+`).
- Código do curso: normaliza para maiúsculas e remove espaços; `pattern` `[A-Z0-9-]+`.
- Publicação: bloqueia envio sem título, tipo e arquivo; valida extensões permitidas.
- `tipo_publicacao`: `select` preenchido pelo backend a partir de `tipos_de_publicacao`.

## Estilos e UX
- `cadastro_login.css`: adicionado efeito sutil de sombra em placeholders dos inputs de login.
- Ícone de notificações visível; badge oculto por padrão e só aparece com contagem real.
- Atributos ARIA nos menus, modais e breadcrumbs.
- Modais e menus fecham com clique fora ou tecla `Esc`.

## Como Usar
- Inicie o backend e acesse `http://127.0.0.1:5000/`.
- Formulários:
  - Cadastro de alunos: preencha nome, CPF, e-mail, senha (mín. 8) e captcha.
  - Cadastro de cursos: nome, código e portaria (com máscaras/validações em tempo real).
  - Publicação: selecione curso (opcional), informe título, tipo, anexe arquivo permitido e resolva o captcha.

## Mudanças Implementadas nesta Entrega
- Padronização do cabeçalho para mostrar nome do usuário via sessão.
- Criação do modal de visualização em “Publicação” com suporte a preview de imagens/PDF.
- Inclusão do script `publicacao.js` e data-atributos na tabela para abrir o modal.
- Ajuste visual nos placeholders da página de login.
- Badge de notificações oculto por padrão (aparece apenas com contagem real).