# Frontend — INPROLIB

Interface moderna e responsiva para o sistema de repositório institucional, desenvolvida com HTML5, CSS3 e JavaScript vanilla, oferecendo experiência de usuário otimizada e acessibilidade completa.

## 🎨 Stack Tecnológica

### Core Technologies
- **HTML5** - Estrutura semântica e acessível
- **CSS3** - Estilização moderna com CSS Variables e Grid/Flexbox
- **JavaScript ES6+** - Funcionalidades interativas sem frameworks
- **Material Symbols** - Iconografia consistente do Google

### Arquitetura CSS
- **CSS Variables** - Sistema de design tokens para temas
- **CSS Grid & Flexbox** - Layout responsivo e flexível
- **CSS Modules** - Organização modular por página/componente
- **Media Queries** - Design responsivo mobile-first

### Funcionalidades JavaScript
- **Vanilla JS** - Zero dependências externas
- **ES6 Modules** - Organização modular do código
- **LocalStorage API** - Persistência de preferências
- **Fetch API** - Comunicação assíncrona com backend
- **FormData API** - Upload de arquivos e formulários

## 📁 Estrutura de Arquivos

### Organização de Diretórios
```
static/
├── css/                    # Folhas de estilo modulares
│   ├── home.css           # Dashboard principal
│   ├── cadastro_*.css     # Formulários de cadastro
│   ├── publicacao.css     # Sistema de publicações
│   ├── avaliacao.css      # Interface de avaliação
│   ├── relatorio.css      # Relatórios e exportação
│   ├── configuracao.css   # Configurações do usuário
│   ├── suporte.css        # Central de ajuda
│   ├── theme-dark.css     # Tema escuro
│   ├── topbar.css         # Barra superior
│   └── notifications.css  # Sistema de notificações
├── javascript/            # Scripts modulares
│   ├── home.js           # Navegação e menu lateral
│   ├── login.js          # Autenticação e validação
│   ├── publicacao.js     # Gestão de publicações
│   ├── avaliacao.js      # Sistema de avaliação
│   ├── theme.js          # Controle de temas
│   ├── notifications.js  # Notificações toast
│   └── calendar-ptbr.js  # Calendário localizado
├── img/                  # Assets visuais
│   ├── logo.png         # Logotipo principal
│   ├── INPROLIB_em_azul.png
│   ├── Repositoriofisico.png
│   ├── der-conceitual.png / der-conceitual.svg
│   ├── der-logico-plantuml.png / der-logico-plantuml.svg
│   └── der-logico.png / der-logico.svg
└── previews/            # Cache de PDFs gerados
```

### Templates Jinja2
```
templates/
├── login.html           # Autenticação e cadastro
├── home.html           # Dashboard principal
├── cadastro_curso.html # Gestão de cursos
├── cadastro_alunos.html # Gestão de usuários
├── publicacao.html     # Sistema de publicações
├── avaliacao.html      # Avaliação por pares
├── relatorio.html      # Relatórios e analytics
├── configuracao.html   # Configurações pessoais
└── suporte.html        # Central de ajuda
```

## 🎯 Sistema de Design

### Paleta de Cores (CSS Variables)
```css
:root {
  /* Cores primárias */
  --bs-primary: #3b82f6;        /* Azul principal */
  --bs-primary-light: #60a5fa;  /* Azul claro */
  --bs-success: #22c55e;        /* Verde sucesso */
  --bs-danger: #ef4444;         /* Vermelho erro */
  --bs-warning: #f59e0b;        /* Amarelo aviso */
  
  /* Cores neutras */
  --bs-body-bg: #ffffff;        /* Fundo principal */
  --bs-body-color: #0f172a;     /* Texto principal */
  --card-bg: #ffffff;           /* Fundo de cartões */
  --page-bg: #f8fafc;           /* Fundo da página */
  
  /* Bordas e sombras */
  --border-color: #e5e7eb;
  --card-shadow: 0 6px 24px rgba(2,6,23,0.06);
}
```

### Tema Escuro
```css
:root.theme-dark {
  --bs-body-bg: #0f172a;       /* Slate 900 */
  --bs-body-color: #e5e7eb;    /* Gray 200 */
  --card-bg: #111827;          /* Gray 900 */
  --page-bg: #0b1220;          /* Slate 950 */
  --border-color: #334155;     /* Slate 700 */
}
```

### Tipografia
- **Fonte principal**: Inter, system-ui, -apple-system, "Segoe UI"
- **Fonte monospace**: SFMono-Regular, Menlo, Monaco, Consolas
- **Escala tipográfica**: 12px, 14px, 16px, 18px, 24px, 32px
- **Peso das fontes**: 400 (regular), 500 (medium), 600 (semibold)

## 🧩 Componentes Principais

### 1. Menu Lateral (Side Menu)
```javascript
// Funcionalidades:
- Navegação baseada em roles de usuário
- Animações suaves com CSS transitions
- Controle de foco para acessibilidade
- Persistência da rota ativa no localStorage
- Suporte a teclado (ESC para fechar)
```

### 2. Sistema de Notificações (Toast)
```javascript
// Tipos de notificação:
window.showToast(message, type); // 'success', 'error', 'warning', 'info'

// Características:
- Auto-dismiss configurável
- Posicionamento fixo no topo
- Animações de entrada/saída
- Suporte a HTML no conteúdo
```

### 3. Modais Responsivos
```css
.modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2,6,23,0.55);
  z-index: 200;
}
```

### 4. Formulários Inteligentes
- **Validação em tempo real** - CPF, e-mail, senhas
- **Upload com preview** - Imagens e documentos
- **Campos condicionais** - Mostrar/ocultar baseado em seleções
- **Sanitização automática** - Prevenção XSS

### 5. Tabelas Responsivas
```css
.table-container {
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
}

@media (max-width: 768px) {
  .table-responsive {
    font-size: 14px;
  }
}
```

## 🔧 Funcionalidades JavaScript

### 1. Sistema de Roteamento (home.js)
```javascript
// Controle de rotas baseado em perfil
const ALLOWED_BY_ROLE = {
  'Administrador': new Set(['/home','/cadastro_curso','/cadastro_alunos',...]),
  'Docente': new Set(['/home','/publicacao','/avaliacao',...]),
  'Aluno': new Set(['/home','/publicacao','/suporte'])
};

// Navegação simulada com persistência
function navigateTo(path) {
  window.location.href = path;
}
```

### 2. Gerenciamento de Temas (theme.js)
```javascript
window.applyTheme = function(theme) {
  const root = document.documentElement;
  if (theme === 'escuro') {
    root.classList.add('theme-dark');
    localStorage.setItem('preferred_theme', 'escuro');
  } else {
    root.classList.remove('theme-dark');
    localStorage.setItem('preferred_theme', 'claro');
  }
};
```

### 3. Upload de Arquivos (publicacao.js)
```javascript
// Preview de imagens antes do upload
function previewImage(file, previewElement) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewElement.src = e.target.result;
    previewElement.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// Validação de tipos de arquivo
const ALLOWED_TYPES = ['.pdf', '.docx', '.xlsx', '.png', '.jpg'];
```

### 4. Validação de Formulários (login.js)
```javascript
// Validação de CPF com algoritmo completo
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  
  // Algoritmo de validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  // ... resto da validação
}

// Validação de e-mail
function emailValido(email) {
  return /.+@.+\..+/.test(email);
}
```

## 📱 Design Responsivo

### Breakpoints
```css
/* Mobile First Approach */
@media (max-width: 640px) {  /* Mobile */
  .container { padding: 10px 12px; }
  .btn-group { width: 100%; }
}

@media (max-width: 768px) {  /* Tablet */
  .table-responsive { font-size: 14px; }
  .modal .panel { margin: 16px; }
}

@media (max-width: 1024px) { /* Desktop pequeno */
  .sidebar { width: 240px; }
}
```

## 📐 Documentação DER

- Documentos consolidados:
  - `docs/DER-Inprolib.pdf`
  - `docs/DER-Inprolib.docx`
- Dica de link no Frontend:
  - Exemplo de âncora para o PDF: `href="/docs/DER-Inprolib.pdf" target="_blank"`.
- Regeneração dos assets:
  - `python scripts/generate_der_assets.py` para imagens.
  - `python scripts/build_der_document.py` para PDF/DOCX.
### Componentes Adaptativos
- **Menu lateral**: Overlay em mobile, sidebar em desktop
- **Tabelas**: Scroll horizontal em telas pequenas
- **Formulários**: Layout de coluna única em mobile
- **Modais**: Fullscreen em mobile, centrados em desktop

## 🎭 Sistema de Temas

### Implementação
```javascript
// Detecção automática de preferência do sistema
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Aplicação de tema com persistência
function applyTheme(theme) {
  document.documentElement.classList.toggle('theme-dark', theme === 'escuro');
  localStorage.setItem('preferred_theme', theme);
}

// Sincronização com backend
async function updateThemeOnServer(theme) {
  const formData = new FormData();
  formData.append('tema', theme);
  
  const response = await fetch('/configuracao/tema', {
    method: 'POST',
    body: formData,
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
}
```

### Variáveis Dinâmicas
- **Cores**: Automática inversão para tema escuro
- **Sombras**: Ajuste de opacidade e blur
- **Bordas**: Contraste apropriado para cada tema
- **Ícones**: Adaptação de cor automática

## 🔍 Acessibilidade (A11y)

### Implementações
- **ARIA Labels**: Todos os elementos interativos
- **Roles semânticos**: `navigation`, `main`, `dialog`
- **Controle por teclado**: Tab, Enter, ESC
- **Foco visível**: Outline customizado
- **Contraste**: WCAG AA compliant

### Exemplos
```html
<!-- Menu lateral acessível -->
<aside role="dialog" aria-modal="true" aria-labelledby="sideMenuTitle">
  <nav role="navigation">
    <button role="menuitem" aria-current="page">Home</button>
  </nav>
</aside>

<!-- Formulários com labels -->
<label for="nomeUsuario">Nome completo</label>
<input id="nomeUsuario" required aria-describedby="nomeHelp">
<div id="nomeHelp">Digite seu nome completo</div>
```

## 🚀 Performance e Otimização

### Estratégias Implementadas
- **CSS Critical Path**: Estilos inline para above-the-fold
- **Lazy Loading**: Imagens e componentes não críticos
- **Cache Busting**: Versionamento automático de assets
- **Minificação**: CSS e JS comprimidos em produção
- **Prefetch**: Recursos da próxima navegação

### Métricas de Performance
```javascript
// Medição de tempo de carregamento
window.addEventListener('load', () => {
  const loadTime = performance.now();
  console.log(`Página carregada em ${loadTime}ms`);
});

// Lazy loading de imagens
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      imageObserver.unobserve(img);
    }
  });
});
```

## 🔒 Segurança Frontend

### Medidas Implementadas
- **CSP Headers**: Content Security Policy
- **XSS Prevention**: Sanitização de inputs
- **CSRF Protection**: Tokens em formulários
- **Input Validation**: Cliente e servidor
- **Secure Headers**: X-Frame-Options, X-Content-Type-Options

### Validação de Entrada
```javascript
// Sanitização de HTML
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Validação de upload
function validateFile(file) {
  const maxSize = 16 * 1024 * 1024; // 16MB
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  
  return file.size <= maxSize && allowedTypes.includes(file.type);
}
```

## 📊 Analytics e Monitoramento

### Eventos Rastreados
```javascript
// Interações do usuário
function trackEvent(category, action, label) {
  if (window.gtag) {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}

// Exemplos de uso
trackEvent('Navigation', 'menu_click', 'publicacao');
trackEvent('Form', 'submit', 'cadastro_usuario');
trackEvent('Download', 'file_download', 'publicacao_123');
```

## 🔄 Atualizações Recentes

### v2.1 - Sistema de Temas Avançado
- Tema escuro/claro com persistência
- Sincronização com preferências do sistema
- Transições suaves entre temas
- Suporte a temas personalizados

### v2.0 - Interface Responsiva
- Design mobile-first completo
- Menu lateral adaptativo
- Tabelas responsivas com scroll
- Modais otimizados para mobile

### v1.9 - Melhorias de UX
- Notificações toast não-intrusivas
- Validação em tempo real
- Upload com preview
- Feedback visual aprimorado

### v1.8 - Acessibilidade
- Suporte completo a leitores de tela
- Navegação por teclado
- Contraste WCAG AA
- ARIA labels e roles

## 🛠️ Ferramentas de Desenvolvimento

### Build Process
```bash
# Desenvolvimento local
python -m http.server 8000  # Servidor estático para testes

# Minificação CSS (produção)
cssnano input.css output.min.css

# Otimização de imagens
imagemin src/img/* --out-dir=dist/img
```

### Debugging
```javascript
// Debug mode para desenvolvimento
if (window.location.hostname === 'localhost') {
  window.DEBUG = true;
  console.log('Debug mode ativado');
}

// Performance monitoring
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
observer.observe({entryTypes: ['measure', 'navigation']});
```

## 📚 Padrões e Convenções

### Nomenclatura
- **CSS Classes**: kebab-case (`.btn-primary`)
- **IDs**: camelCase (`#userProfile`)
- **JavaScript**: camelCase para variáveis, PascalCase para construtores
- **Arquivos**: kebab-case (`user-profile.js`)

### Estrutura de Código
```javascript
// Padrão de módulo IIFE
(function() {
  'use strict';
  
  // Variáveis privadas
  const CONSTANTS = {};
  
  // Funções privadas
  function privateFunction() {}
  
  // API pública
  window.MyModule = {
    publicMethod: function() {}
  };
})();
```

### Comentários e Documentação
```javascript
/**
 * Aplica tema ao documento
 * @param {string} theme - 'claro' ou 'escuro'
 * @param {boolean} persist - Salvar no localStorage
 * @returns {boolean} Sucesso da operação
 */
function applyTheme(theme, persist = true) {
  // Implementação...
}
```

## 🔮 Roadmap Futuro

### Funcionalidades Planejadas
- **PWA Support** - Service Workers e offline mode
- **Dark Mode Auto** - Detecção automática de horário
- **Micro-interactions** - Animações sutis de feedback
- **Component Library** - Sistema de design reutilizável
- **TypeScript** - Migração gradual para type safety

### Melhorias de Performance
- **Code Splitting** - Carregamento sob demanda
- **Image Optimization** - WebP e lazy loading avançado
- **Bundle Analysis** - Otimização de tamanho de arquivos
- **Critical CSS** - Inlining automático de estilos críticos