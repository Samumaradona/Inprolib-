# Frontend — INPROLIB

Este documento cobre templates, estilos e JavaScript (home.js), incluindo máscaras/validações e como usar.

## Estrutura
- Templates (Jinja/HTML): `templates/`
  - `home.html`, `cadastro_alunos.html`, `cadastro_curso.html`, `publicacao.html`, `avaliacao.html`, `vinculacao_curso.html`, etc.
- Estilos: `static/css/`
  - `home.css`, `cadastro_alunos.css`, `cadastro_curso.css`, `publicacao.css`, etc.
- JavaScript: `static/javascript/home.js`
  - Controle de menu lateral, perfil, notificações, carrossel e validações/máscaras.

## O que foi feito
- Máscaras e validações:
  - CPF (cadastro de alunos): máscara `000.000.000-00`, `pattern` e validação de dígitos.
  - Portaria: apenas dígitos (com `inputmode=numeric`).
  - Captcha: apenas dígitos (com `pattern=\d+`).
  - Código do curso: normaliza para maiúsculas e remove espaços; `pattern` `[A-Z0-9-]+`.
  - Publicação: bloqueia envio sem título, tipo e arquivo; valida extensões permitidas.
- `tipo_publicacao` virou `select` preenchido pelo backend (`tipos_de_publicacao`).
- Notificações: ícone sempre visível; badge aparece somente com contagem real (via `data-notif-count` ou `window.NOTIF_COUNT`).

## Como usar (Frontend)
1. Abrir o app em `http://127.0.0.1:5000/` após iniciar o backend.
2. Formulários:
   - Cadastro de alunos: preencha nome, CPF, e-mail, senha (mín. 8) e captcha. A UI mostra força de senha e validações em tempo real.
   - Cadastro de cursos: preencha nome, código (formato) e portaria (numérica). Campos têm máscaras.
   - Publicação: selecione curso, informe título e tipo pelo select, anexe arquivo permitido e resolva o captcha.
3. Notificações:
   - Para exibir o badge, defina `data-notif-count` no botão `#btnNotifications` ou uma variável global `window.NOTIF_COUNT`. Ex.: `data-notif-count="3"`.

## Acessibilidade e UX
- Atributos ARIA nos menus, modais e breadcrumbs.
- Navegação por teclado com trap no menu lateral.
- Dropdowns/Modais fecham com clique fora ou tecla `Esc`.