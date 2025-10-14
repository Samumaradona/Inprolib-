# Frontend — INPROLIB

Guia dos templates, estilos e JavaScript, incluindo UX/acessibilidade e as atualizações mais recentes.

## Estrutura
- Templates: `templates/`
  - `home.html`, `cadastro_alunos.html`, `cadastro_curso.html`, `publicacao.html`, `avaliacao.html`, `vinculacao_curso.html`, `suporte.html`, `relatorio.html`, `configuracao.html`, `login.html`, etc.
- Estilos: `static/css/`
  - `home.css`, `cadastro_alunos.css`, `cadastro_curso.css`, `publicacao.css`, `avaliacao.css`, `relatorio.css`, `suporte.css`, `vinculacao_curso.css`, `cadastro_login.css`.
- JavaScript: `static/javascript/`
  - `home.js`: menu lateral, perfil, notificações, máscaras/validações de formulários.
  - `publicacao.js`: modal de visualização de publicações.

## Cabeçalho e Sessão
- Exibe o nome do usuário via `session.user_name` quando autenticado.
- Rotas internas usam `@login_required`, redirecionando não autenticados para `/login`.

## Menu Lateral e Rotas (Atualizado)
- Correção de exibição do item “Avaliação” para perfis `Administrador` e `Docente`.
- Reordenamos o menu para consistência.
- Para garantir que o navegador carregue a versão atualizada do menu, adicionamos versionamento ao script: `home.js?v=aval-fix-1` em todos os templates que o importam.

## Mensagens de Sucesso/Erro (Atualizado)
- Adicionamos em `home.html` o bloco de exibição de mensagens `get_flashed_messages(with_categories=True)`.
- Após cadastrar aluno com sucesso, o backend redireciona para Home e a mensagem verde de sucesso aparece no topo.

## Publicação: Visualização via Modal
- Em “Publicação”, ao clicar em uma linha da lista, abre um modal com:
  - Título, Tipo, Curso, Data da publicação.
  - Preview quando possível:
    - Imagens (`.png`, `.jpg`, `.jpeg`, `.webp`): exibem no modal.
    - PDF: abre em `<iframe>`.
    - Outros tipos (DOC, XLS, CSV, etc.): mostram aviso e botão “Abrir/baixar conteúdo”.
- JavaScript dedicado: `publicacao.js`.

## Validações e Máscaras
- CPF: máscara `000.000.000-00`, `pattern` e validação de dígitos.
- Portaria: apenas dígitos (`inputmode=numeric`).
- Captcha: apenas dígitos (`pattern=\d+`).
- Código do curso: maiúsculas sem espaços; `pattern` `[A-Z0-9-]+`.
- Publicação: bloqueia envio sem título, tipo e arquivo; valida extensões permitidas.

## Estilos e UX
- Ícone de notificações visível; badge oculto por padrão.
- Atributos ARIA nos menus, modais e breadcrumbs.
- Modais e menus fecham com clique fora ou tecla `Esc`.

## Dicas de Cache
- Durante desenvolvimento, o backend desativa cache para CSS/JS.
- Mesmo assim, após alterar scripts, use `Ctrl+F5` (hard refresh) para garantir atualização.

## Como Usar
- Inicie o backend e acesse `http://127.0.0.1:5000/`.
- Formulários:
  - Cadastro de alunos: preencha nome, CPF, e-mail, senha (mín. 8) e captcha.
  - Cadastro de cursos: nome, código e portaria.
  - Publicação: selecione curso (opcional), informe título, tipo, anexe arquivo permitido e resolva o captcha.

## Atualizações Recentes
- Correção do menu “Avaliação” para Administrador/Docente em `home.js`.
- Versionamento `home.js?v=aval-fix-1` em templates para forçar atualização.
- Bloco de mensagens adicionado à Home para mostrar sucesso/erro.