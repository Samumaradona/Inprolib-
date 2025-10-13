/* home.js
 *
 * Arquivo principal de interação do menu lateral, navegação simulada,
 * controle do botão hambúrguer, notificações e avatar do usuário.
 *
 * Comentários explicam a intenção de cada bloco / função.
 */

/* =====================
   Configuração inicial
   ===================== */

/* Lista de rotas — cada objeto pode ter:
   - name: texto exibido
   - path: identificador / caminho (usado para persistência)
   - icon: nome do Material Symbol (opcional)
*/
const ROUTES = [
  { name: 'Repositório', path: '/home', icon: 'folder' },
  { name: 'Cadastro de Cursos', path: '/cadastro_curso', icon: 'school' },
  { name: 'Cadastro de Alunos', path: '/cadastro_alunos', icon: 'people' },
  { name: 'Publicar Conteúdo', path: '/publicacao', icon: 'publish' },
  { name: 'Relatórios', path: '/relatorio', icon: 'bar_chart' },
  { name: 'Suporte', path: '/suporte', icon: 'support_agent' },
  { name: 'Configurações', path: '/configuracao', icon: 'settings' }
];

/* Elementos DOM principais (pega pelo ID).
   Observação: guard checks são aplicados antes de usar os elementos. */
const btnHamburger = document.getElementById('btnHamburger');
const sideMenu = document.getElementById('sideMenu');
const backdrop = document.getElementById('backdrop');
const btnClose = document.getElementById('btnClose');
const routesList = document.getElementById('routesList');
const logoutBtn = document.getElementById('logoutBtn');
const btnBack = document.getElementById('btnBack');

/* variável usada para restaurar foco quando o menu for fechado */
let lastFocused = null;

/* =====================
   Controle do slide-over
   ===================== */

/**
 * openMenu()
 * - Abre o menu lateral (slide-over)
 * - Salva o elemento que estava focado para restaurar depois
 * - Bloqueia o scroll do body (document.body.style.overflow = 'hidden')
 * - Define atributos ARIA para acessibilidade
 * - Foca o primeiro item (se existir) para navegação por teclado
 * - Instala listener global de teclado (Escape e trap de Tab)
 */
function openMenu(){
  lastFocused = document.activeElement;
  if (sideMenu) sideMenu.classList.add('open');
  if (backdrop) backdrop.classList.add('visible');

  if (sideMenu) sideMenu.setAttribute('aria-hidden','false');
  if (btnHamburger) btnHamburger.setAttribute('aria-expanded','true');
  if (backdrop) backdrop.setAttribute('aria-hidden','false');

  document.body.style.overflow = 'hidden'; // impede scroll por baixo do overlay

  // foco inicial no primeiro item para melhor acessibilidade
  const first = document.getElementById('firstRoute');
  if(first) first.focus();

  // listener para teclado (Esc e trap de foco)
  document.addEventListener('keydown', onKeyDown);
}

/**
 * closeMenu()
 * - Fecha o menu lateral
 * - Restaura o foco para o elemento anteriormente ativo
 * - Remove listeners e desbloqueia scroll
 */
function closeMenu(){
  if (sideMenu) sideMenu.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');

  if (sideMenu) sideMenu.setAttribute('aria-hidden','true');
  if (btnHamburger) btnHamburger.setAttribute('aria-expanded','false');
  if (backdrop) backdrop.setAttribute('aria-hidden','true');

  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeyDown);

  if(lastFocused) lastFocused.focus();
}

/**
 * toggleMenu()
 * - Alterna entre open/close
 * - Usa short-circuit guards para evitar erros se sideMenu não existir
 */
function toggleMenu(){
  sideMenu && sideMenu.classList.contains('open') ? closeMenu() : openMenu();
}

/**
 * onKeyDown(e)
 * - Handler de teclado global enquanto o menu está aberto
 * - Fecha com Escape
 * - Implementa um "trap" simples de foco (Shift+Tab / Tab) entre primeiro/último item
 */
function onKeyDown(e){
  if(e.key === 'Escape') closeMenu();

  // busca elementos focusable dentro do sideMenu
  const focusable = sideMenu ? sideMenu.querySelectorAll('button, a') : [];
  if(!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length -1];

  if(e.key === 'Tab'){
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus(); // se Shift+Tab no primeiro => vai pro último
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus(); // se Tab no último => volta pro primeiro
    }
  }
}

/* =====================
   Persistência + rota atual
   ===================== */

/* chave usada no localStorage para guardar qual rota está ativa */
const ROUTE_STORAGE_KEY = 'meuapp_current_route';

/* lê a rota atual do localStorage com fallback para a primeira rota */
let currentRoute = (function(){
  try {
    return localStorage.getItem(ROUTE_STORAGE_KEY) || (ROUTES[0] && ROUTES[0].path) || '/';
  } catch(e) {
    // se localStorage inacessível (ex: modo privado restrito), usa fallback
    return (ROUTES[0] && ROUTES[0].path) || '/';
  }
})();

/* =====================
   Renderização das rotas
   ===================== */

/**
 * renderRoutes()
 * - Cria botões para cada rota dinamicamente
 * - Insere ícone (Material Symbols) se existir propriedade `icon`
 * - Adiciona role="menuitem" para acessibilidade
 * - Marca como ativo (classe .active e aria-current) a rota corrente
 * - Define id 'firstRoute' no primeiro botão para foco inicial
 */
function renderRoutes(){
  if(!routesList) { console.warn('routesList não encontrado.'); return; }

  // limpa antes de renderizar
  routesList.innerHTML = '';

  ROUTES.forEach((r, idx) => {
    const btn = document.createElement('button');
    btn.className = 'route';
    btn.type = 'button';
    btn.setAttribute('data-path', r.path);
    btn.setAttribute('role', 'menuitem');

    // clique -> atualiza a rota e navega (simulate)
    btn.addEventListener('click', () => {
      setCurrentRoute(r.path);
      navigateTo(r.path);
    });

    // ícone: usa Material Symbols (texto do span = nome do ícone)
    if (r.icon) {
      const span = document.createElement('span');
      span.className = 'material-symbols-outlined span-symbol';
      span.setAttribute('aria-hidden', 'true'); // ícone é decorativo aqui
      span.textContent = r.icon;
      btn.appendChild(span);
    } else {
      // placeholder para preservar alinhamento quando não há ícone
      const placeholder = document.createElement('span');
      placeholder.className = 'span-symbol';
      placeholder.style.width = '22px';
      btn.appendChild(placeholder);
    }

    // label (texto da rota)
    const label = document.createElement('span');
    label.className = 'route-label';
    label.textContent = r.name;
    btn.appendChild(label);

    // se esta rota for a rota ativa -> marca visualmente e para leitores de tela
    if (r.path === currentRoute) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
    }

    // id do primeiro botão (para foco inicial ao abrir o menu)
    if(idx === 0) btn.id = 'firstRoute';

    // adiciona ao container
    routesList.appendChild(btn);
  });
}

/* =====================
   Atualização do estado da rota
   ===================== */

/**
 * setCurrentRoute(path)
 * - Atualiza `currentRoute` em memória e localStorage
 * - Atualiza classes visuais (.active) e atributo aria-current nas opções existentes
 * - Não re-renderiza tudo; apenas atualiza as classes para performance
 */
function setCurrentRoute(path){
  currentRoute = path;
  try { localStorage.setItem(ROUTE_STORAGE_KEY, path); } catch(e){ /* ignore se storage bloqueado */ }

  if(!routesList) return;
  routesList.querySelectorAll('.route').forEach(btn => {
    const p = btn.getAttribute('data-path');
    if (p === path) {
      btn.classList.add('active');
      btn.setAttribute('aria-current','page');
    } else {
      btn.classList.remove('active');
      btn.removeAttribute('aria-current');
    }
  });
}

/**
 * navigateTo(path)
 * - Ponto central para integrar comportamento de navegação real
 * - No momento faz apenas console.log e fecha o menu
 * - Sugestão: substituir console.log por history.pushState(...) / router.navigate(...)
 */
function navigateTo(path){
  try {
    window.location.href = path;
  } catch(e){
    console.log('Navegar para', path);
  }
  closeMenu();
}

/* =====================
   Event listeners (guards)
   ===================== */

/* Adiciona listeners somente se os elementos existirem (proteção) */
if (btnHamburger) btnHamburger.addEventListener('click', toggleMenu);
if (btnClose) btnClose.addEventListener('click', closeMenu);
if (backdrop) backdrop.addEventListener('click', closeMenu);
if (logoutBtn) logoutBtn.addEventListener('click', () => { console.log('logout'); closeMenu(); });
if (btnBack) btnBack.addEventListener('click', () => {
  try {
    if (window.history && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/home';
    }
  } catch(e){
    window.location.href = '/home';
  }
});

/* Liga os links da nav horizontal (se houver) — atualiza rota e navega */
document.querySelectorAll('nav.primary a').forEach(a => {
  a.addEventListener('click', (ev) => {
    ev.preventDefault();
    const path = a.getAttribute('data-path');
    if(path) {
      setCurrentRoute(path);
      navigateTo(path);
    }
  });
});

/* =====================
   Inicialização
   ===================== */

/* Renderiza menu lateral (rotas) na inicialização */
renderRoutes();

/* =====================
   Profile + Notifications (módulo auto-executável)
   - Isolado para manter escopo local e documentação
   ===================== */
(function () {
  // URL padrão do avatar (sem backend)
  const DEFAULT_AVATAR = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqf7MJNlh6GfxfrjCep_dnXOBm0EwGc0X12A&s';
  const STORAGE_KEY = 'meuapp_avatar_dataurl';

  // elementos do perfil / notificações
  const btnNotifications = document.getElementById('btnNotifications');
  const notifDropdown = document.getElementById('notificationsDropdown');
  const notifBadge = document.getElementById('notifBadge');

  const btnProfile = document.getElementById('btnProfile');
  const profileDropdown = document.getElementById('profileDropdown');
  const avatarImg = document.getElementById('profileAvatar');
  const fileInput = document.getElementById('fileAvatarInput');
  const viewPhoto = document.getElementById('viewPhoto');
  const changePhoto = document.getElementById('changePhoto');

  const avatarModal = document.getElementById('avatarModal');
  const modalImg = document.getElementById('modalAvatarImg');
  const closeModal = document.getElementById('closeModal');

  /**
   * closeAllMenus()
   * - Fecha dropdown de notificações e dropdown de perfil (seabertos)
   * - Atualiza atributos ARIA correspondentes
   */
  function closeAllMenus() {
    if (notifDropdown) {
      notifDropdown.setAttribute('aria-hidden','true');
      btnNotifications && btnNotifications.setAttribute('aria-expanded','false');
    }
    if (profileDropdown) {
      profileDropdown.setAttribute('aria-hidden','true');
      btnProfile && btnProfile.setAttribute('aria-expanded','false');
    }
  }

  /**
   * loadAvatar()
   * - Tenta carregar avatar salvo no localStorage (persistência no cliente)
   * - Fallback para DEFAULT_AVATAR se storage vazio / bloqueado
   */
  function loadAvatar(){
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if(stored){
        if (avatarImg) avatarImg.src = stored;
      } else {
        if (avatarImg) avatarImg.src = DEFAULT_AVATAR;
      }
    } catch(e){
      if (avatarImg) avatarImg.src = DEFAULT_AVATAR;
    }
  }

  /**
   * handleFile(e)
   * - Lê arquivo selecionado (image/*) e transforma em dataURL
   * - Atualiza avatar em tela e salva no localStorage (front-only)
   */
  function handleFile(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      const d = ev.target.result;
      if (avatarImg) avatarImg.src = d;
      try { localStorage.setItem(STORAGE_KEY, d); } catch(e) { /* ignore */ }
    };
    reader.readAsDataURL(f);
  }

  /* Toggle dropdown de notificações (abre/fecha) */
  if(btnNotifications && notifDropdown){
    btnNotifications.addEventListener('click', (ev) => {
      const open = notifDropdown.getAttribute('aria-hidden') === 'false';
      closeAllMenus(); // fecha outros menus antes
      if(!open){
        notifDropdown.setAttribute('aria-hidden','false');
        btnNotifications.setAttribute('aria-expanded','true');
      }
      ev.stopPropagation(); // impede clique subir para document
    });
  }

  /* Toggle dropdown do perfil (abre/fecha) */
  if(btnProfile && profileDropdown){
    btnProfile.addEventListener('click', (ev) => {
      const open = profileDropdown.getAttribute('aria-hidden') === 'false';
      closeAllMenus();
      if(!open){
        profileDropdown.setAttribute('aria-hidden','false');
        btnProfile.setAttribute('aria-expanded','true');
      }
      ev.stopPropagation();
    });
  }

  /* Ver foto -> abre modal com a imagem atual */
  if(viewPhoto){
    viewPhoto.addEventListener('click', () => {
      if (modalImg && avatarImg) modalImg.src = avatarImg.src || DEFAULT_AVATAR;
      if (avatarModal) {
        avatarModal.setAttribute('aria-hidden','false');
        avatarModal.classList.add('open');
      }
      closeAllMenus();
      // foco no botão fechar do modal para facilitar teclado
      if (closeModal) closeModal.focus();
    });
  }

  /* Mudar foto -> dispara input file (visível somente para seleção local) */
  if(changePhoto){
    changePhoto.addEventListener('click', () => {
      if (fileInput) fileInput.click();
      closeAllMenus();
    });
  }

  /* Ao mudar arquivo no input -> processa a imagem */
  if(fileInput){
    fileInput.addEventListener('change', handleFile);
  }

  /* Fecha modal de visualização */
  if(closeModal){
    closeModal.addEventListener('click', () => {
      if (avatarModal) {
        avatarModal.setAttribute('aria-hidden','true');
        avatarModal.classList.remove('open');
      }
    });
  }

  /* Clique em qualquer lugar da página fecha dropdowns/modais (se clicar fora) */
  document.addEventListener('click', (ev) => {
    const target = ev.target;
    // se clicou fora dos menus e modal-content, fecha tudo
    if (!target.closest || (!target.closest('#profileDropdown') && !target.closest('#btnProfile') && !target.closest('#notificationsDropdown') && !target.closest('#btnNotifications') && !target.closest('.modal-content'))) {
      closeAllMenus();
    }
    // fechar modal se clicou fora do conteúdo
    if (avatarModal && avatarModal.getAttribute('aria-hidden') === 'false' && !target.closest('.modal-content')) {
      avatarModal.setAttribute('aria-hidden','true');
      avatarModal.classList.remove('open');
    }
  });

  /* Teclado global: Esc fecha menus e modal */
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      closeAllMenus();
      if(avatarModal && avatarModal.getAttribute('aria-hidden') === 'false'){
        avatarModal.setAttribute('aria-hidden','true');
        avatarModal.classList.remove('open');
      }
    }
  });

  /* Inicializa avatar (carrega do localStorage ou padrão) */
  loadAvatar();

  // Badge de notificações: mostra apenas quando houver contagem real
  function initNotifBadge(){
    let count = 0;
    try {
      if(btnNotifications){
        const data = btnNotifications.getAttribute('data-notif-count');
        if(data) count = parseInt(data, 10) || 0;
      }
      if(typeof window.NOTIF_COUNT === 'number'){
        count = window.NOTIF_COUNT;
      }
    } catch(e){}
    if(notifBadge){
      if(count > 0){
        notifBadge.textContent = String(count);
        notifBadge.style.display = '';
        notifBadge.setAttribute('aria-hidden','false');
      } else {
        notifBadge.textContent = '';
        notifBadge.style.display = 'none';
        notifBadge.setAttribute('aria-hidden','true');
      }
    }
  }
  initNotifBadge();

})(); // fim do módulo profile/notifications

/* ---------- Search & Carousel JS (front-only) ---------- */

(function () {
  // simples sample docs — substitua pelos seus dados reais
  const SAMPLE_DOCS = [
    { title: "Relatório de Algebra", author: "Ana Silva", subject: "Matemática", course: "Engenharia", date: "2025-09-01", img: "https://picsum.photos/seed/doc1/300/200" },
    { title: "Resumo de História", author: "Bruno Costa", subject: "História", course: "Humanas", date: "2025-08-28", img: "https://picsum.photos/seed/doc2/300/200" },
    { title: "Projeto de Física", author: "Clara Souza", subject: "Física", course: "Licenciatura", date: "2025-08-21", img: "https://picsum.photos/seed/doc3/300/200" },
    { title: "Guia de Programação", author: "Diego Martins", subject: "Computação", course: "Sistemas", date: "2025-08-15", img: "https://picsum.photos/seed/doc4/300/200" },
    { title: "Artigo sobre Arte", author: "Elisa Ramos", subject: "Arte", course: "Artes", date: "2025-08-10", img: "https://picsum.photos/seed/doc5/300/200" },
    { title: "Estudo de Caso", author: "Fabio Lima", subject: "Administração", course: "Administração", date: "2025-07-30", img: "https://picsum.photos/seed/doc6/300/200" }
  ];

  const carousel = document.getElementById('carousel');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  // cria um card DOM a partir de um objeto doc
  function createCard(doc) {
    const item = document.createElement('article');
    item.className = 'carousel-item';
    item.setAttribute('role','listitem');

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = doc.img;
    img.alt = doc.title;

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = doc.title;

    const author = document.createElement('div');
    author.className = 'meta-line';
    author.textContent = `Autor: ${doc.author}`;

    const subject = document.createElement('div');
    subject.className = 'meta-line';
    subject.textContent = `Assunto: ${doc.subject}`;

    const course = document.createElement('div');
    course.className = 'meta-line';
    course.textContent = `Curso: ${doc.course}`;

    const date = document.createElement('div');
    date.className = 'meta-line';
    date.textContent = `Data: ${doc.date}`;

    meta.appendChild(title);
    meta.appendChild(author);
    meta.appendChild(subject);
    meta.appendChild(course);
    meta.appendChild(date);

    item.appendChild(img);
    item.appendChild(meta);
    return item;
  }

  // popula o carrossel
  function populateCarousel(docs) {
    if (!carousel) return;
    carousel.innerHTML = '';
    docs.forEach(d => carousel.appendChild(createCard(d)));
  }

  // navegação por setas: desloca 1 item equivalente à largura de um item
  function scrollByItem(direction = 'next') {
    if (!carousel) return;
    const gap = 14; // deve corresponder ao gap usado no CSS
    const first = carousel.querySelector('.carousel-item');
    if(!first) return;
    const itemWidth = first.getBoundingClientRect().width + gap;
    const delta = direction === 'next' ? itemWidth : -itemWidth;
    carousel.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // listeners setas
  if (prevBtn) prevBtn.addEventListener('click', () => scrollByItem('prev'));
  if (nextBtn) nextBtn.addEventListener('click', () => scrollByItem('next'));

  // simple search (front-only): filtra pelo título/autor/assunto/curso quando checkbox habilitado
  function doSearch() {
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const checked = Array.from(document.querySelectorAll('input[name="filter"]:checked')).map(i => i.value);
    if (!q) { populateCarousel(SAMPLE_DOCS); return; }

    const filtered = SAMPLE_DOCS.filter(d => {
      // verifica apenas os campos selecionados
      let ok = false;
      if (checked.includes('titulo') && d.title.toLowerCase().includes(q)) ok = true;
      if (checked.includes('autor') && d.author.toLowerCase().includes(q)) ok = true;
      if (checked.includes('assunto') && d.subject.toLowerCase().includes(q)) ok = true;
      if (checked.includes('curso') && d.course.toLowerCase().includes(q)) ok = true;
      return ok;
    });
    populateCarousel(filtered);
  }

  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // comportamento de arrastar/scroll (drag-to-scroll)
  (function enableDragScroll(el) {
    if (!el) return;
    let isDown = false;
    let startX, scrollLeft;
    el.addEventListener('pointerdown', (e) => {
      isDown = true;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = startX - e.clientX;
      el.scrollLeft = scrollLeft + dx;
    });
    el.addEventListener('pointerup', (e) => {
      isDown = false;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
    });
    el.addEventListener('pointercancel', () => { isDown = false; el.classList.remove('dragging'); });
    // permitir navegação por teclado: setas esquerda/direita
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { scrollByItem('next'); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { scrollByItem('prev'); e.preventDefault(); }
    });
  })(carousel);

  // inicializa com dados de exemplo
  populateCarousel(SAMPLE_DOCS);

})();

/* =====================
   Máscaras e validações de formulários
   ===================== */
(function(){
  function onlyDigits(str){ return (str||'').replace(/\D+/g,''); }
  function applyCpfMask(raw){
    const d = onlyDigits(raw).slice(0,11);
    const p1 = d.slice(0,3);
    const p2 = d.slice(3,6);
    const p3 = d.slice(6,9);
    const p4 = d.slice(9,11);
    let out = '';
    if(p1) out = p1;
    if(p2) out += '.'+p2;
    if(p3) out += '.'+p3;
    if(p4) out += '-'+p4;
    return out;
  }

  // CPF (cadastro de alunos)
  const cpfInput = document.getElementById('cpf_user');
  if(cpfInput){
    cpfInput.setAttribute('inputmode','numeric');
    cpfInput.setAttribute('maxlength','14');
    cpfInput.setAttribute('pattern','\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}');
    cpfInput.addEventListener('input', function(){
      const pos = cpfInput.selectionStart;
      const before = cpfInput.value;
      cpfInput.value = applyCpfMask(cpfInput.value);
      // tentativa simples de manutenção de posição
      try { cpfInput.setSelectionRange(pos, pos); } catch(e){}
    });
  }

  // Código do curso (letras/números/hífen, auto upper)
  const codigoInput = document.getElementById('codigo');
  if(codigoInput){
    codigoInput.setAttribute('pattern','[A-Z0-9-]+');
    codigoInput.addEventListener('input', function(){
      const val = codigoInput.value || '';
      codigoInput.value = val.toUpperCase().replace(/\s+/g,'');
    });
  }

  // Portaria (somente números) — presente em curso e publicação
  const portariaInput = document.getElementById('portaria');
  if(portariaInput){
    portariaInput.setAttribute('inputmode','numeric');
    portariaInput.setAttribute('maxlength','10');
    portariaInput.addEventListener('input', function(){
      portariaInput.value = onlyDigits(portariaInput.value).slice(0,10);
    });
  }

  // Captcha (somente números)
  const captchaInput = document.getElementById('captcha');
  if(captchaInput){
    captchaInput.setAttribute('inputmode','numeric');
    captchaInput.setAttribute('pattern','\\d+');
    captchaInput.addEventListener('input', function(){
      captchaInput.value = onlyDigits(captchaInput.value);
    });
  }

  // Publicação: validação de arquivo e campos obrigatórios
  const publicacaoForm = (function(){
    // tenta localizar pelo action e pela presença dos inputs típicos
    const forms = document.querySelectorAll('form');
    for(const f of forms){
      const a = (f.getAttribute('action')||'').toLowerCase();
      if(a.includes('/publicacao')) return f;
    }
    return null;
  })();

  if(publicacaoForm){
    const titulo = document.getElementById('titulo_conteudo');
    const tipo = document.getElementById('tipo_publicacao');
    const curso = document.getElementById('curso');
    const conteudo = document.getElementById('conteudo');
    const termo = document.getElementById('termo');
    const lblConteudo = document.querySelector('label[for="conteudo"]');
    const lblTermo = document.querySelector('label[for="termo"]');

    const ALLOW_EXT = new Set(['.pdf','.doc','.docx','.xls','.xlsx','.csv','.txt','.png','.jpg','.jpeg','.webp']);
    function getExt(name){
      const m = /\.[^.]+$/.exec((name||'').toLowerCase());
      return m ? m[0] : '';
    }

    function updateLabel(input, label){
      if(!input || !label) return;
      const f = input.files && input.files[0];
      if(f){
        label.textContent = `Selecionado: ${f.name}`;
      } else {
        const base = label.getAttribute('data-base') || label.textContent;
        label.setAttribute('data-base', base);
        label.textContent = base.includes('Selecionado:') ? 'Anexar' : base;
      }
    }

    if(conteudo && lblConteudo){ conteudo.addEventListener('change', ()=>updateLabel(conteudo,lblConteudo)); }
    if(termo && lblTermo){ termo.addEventListener('change', ()=>updateLabel(termo,lblTermo)); }

    publicacaoForm.addEventListener('submit', function(ev){
      // título e tipo obrigatórios
      if(titulo && !titulo.value.trim()){
        ev.preventDefault();
        titulo.focus();
        titulo.reportValidity && titulo.reportValidity();
        alert('Informe o título da publicação.');
        return;
      }
      if(tipo && !tipo.value.trim()){
        ev.preventDefault();
        tipo.focus();
        tipo.reportValidity && tipo.reportValidity();
        alert('Informe o tipo da publicação.');
        return;
      }
      // arquivo obrigatório
      if(conteudo){
        const f = conteudo.files && conteudo.files[0];
        if(!f){
          ev.preventDefault();
          alert('Anexe o arquivo de conteúdo para publicar.');
          return;
        }
        const ext = getExt(f.name);
        if(!ALLOW_EXT.has(ext)){
          ev.preventDefault();
          alert('Tipo de arquivo não permitido.');
          return;
        }
      }
      // termo é opcional, mas se vier, valida extensão
      if(termo){
        const ft = termo.files && termo.files[0];
        if(ft){
          const ext2 = getExt(ft.name);
          if(!ALLOW_EXT.has(ext2)){
            ev.preventDefault();
            alert('Tipo de arquivo do termo não permitido.');
            return;
          }
        }
      }
    });
  }
})();
