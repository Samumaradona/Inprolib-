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

/* Lista de rotas baseada em perfil do usuário */
const USER_ROLE = (typeof window !== 'undefined' ? (window.USER_ROLE || '') : '').trim();
const ALL_ROUTES = [
  { name: 'Home', path: '/home', icon: 'home' },
  { name: 'Cadastro de Cursos', path: '/cadastro_curso', icon: 'school' },
  { name: 'Cadastro de Alunos', path: '/cadastro_alunos', icon: 'people' },
  { name: 'Publicação', path: '/publicacao', icon: 'publish' },
  { name: 'Avaliação', path: '/avaliacao', icon: 'rate_review' },
  { name: 'Relatórios', path: '/relatorio', icon: 'bar_chart' },
  { name: 'Suporte', path: '/suporte', icon: 'support_agent' },
  { name: 'Vinculação de curso', path: '/vinculacao_curso', icon: 'link' },
  { name: 'Configurações', path: '/configuracao', icon: 'settings' }
];

// Tabela de permissões por perfil (simplificada e robusta)
const ALLOWED_BY_ROLE = {
  'Administrador': new Set(ALL_ROUTES.map(r => r.path)),
  'Docente': new Set(['/home','/publicacao','/suporte','/vinculacao_curso','/avaliacao','/relatorio']),
  'Aluno': new Set(['/home','/publicacao','/suporte','/relatorio'])
};

// Calcula rotas permitidas
const allowedSet = ALLOWED_BY_ROLE[USER_ROLE] || new Set(['/home']);
let ROUTES = ALL_ROUTES.filter(r => allowedSet.has(r.path));

// Garantia: para Admin/Docente, força inclusão de Avaliação caso falte
if (USER_ROLE === 'Administrador' || USER_ROLE === 'Docente') {
  const hasAval = ROUTES.some(r => r.path === '/avaliacao');
  if (!hasAval) {
    const avalRoute = ALL_ROUTES.find(r => r.path === '/avaliacao');
    if (avalRoute) ROUTES.splice(4, 0, avalRoute); // após Publicação
  }
}

// Ordena rotas em uma sequência desejada para melhor UX
const ORDER = ['/home','/cadastro_curso','/cadastro_alunos','/publicacao','/avaliacao','/relatorio','/vinculacao_curso','/configuracao','/suporte'];
ROUTES = ROUTES.sort((a,b) => ORDER.indexOf(a.path) - ORDER.indexOf(b.path));

// Define rota padrão por perfil (Admin começa em Cadastro de Cursos)
const DEFAULT_ROUTE = (USER_ROLE === 'Administrador') ? '/cadastro_curso' : '/home';

/* chave usada no localStorage para guardar qual rota está ativa */
const ROUTE_STORAGE_KEY = 'meuapp_current_route';

/* lê a rota atual do localStorage com fallback para DEFAULT_ROUTE */
let currentRoute = (function(){
  try {
    return localStorage.getItem(ROUTE_STORAGE_KEY) || DEFAULT_ROUTE || (ROUTES[0] && ROUTES[0].path) || '/';
  } catch(e) {
    // se localStorage inacessível (ex: modo privado restrito), usa fallback
    return DEFAULT_ROUTE || (ROUTES[0] && ROUTES[0].path) || '/';
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
    if (typeof window !== 'undefined' && window.location && window.location.pathname === path) {
      closeMenu();
      return;
    }
    window.location.assign(path);
  } catch(e){
    window.location.href = path;
  }
  closeMenu();
}

/* =====================
   Menu controls
   ===================== */

const btnHamburger = document.getElementById('btnHamburger');
const sideMenu = document.getElementById('sideMenu');
const backdrop = document.getElementById('backdrop');
const btnClose = document.getElementById('btnClose');
const routesList = document.getElementById('routesList');
const logoutBtn = document.getElementById('logoutBtn');
const btnBack = document.getElementById('btnBack');
let lastFocused = null;

function openMenu(){
  lastFocused = document.activeElement;
  if (sideMenu) sideMenu.classList.add('open');
  if (backdrop) backdrop.classList.add('visible');

  if (sideMenu) sideMenu.setAttribute('aria-hidden','false');
  if (btnHamburger) btnHamburger.setAttribute('aria-expanded','true');
  if (backdrop) backdrop.setAttribute('aria-hidden','false');

  if (document && document.body) document.body.style.overflow = 'hidden';

  const first = document.getElementById('firstRoute');
  if(first) first.focus();

  document.addEventListener('keydown', onKeyDown);
}

function closeMenu(){
  if (sideMenu) sideMenu.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');

  if (sideMenu) sideMenu.setAttribute('aria-hidden','true');
  if (btnHamburger) btnHamburger.setAttribute('aria-expanded','false');
  if (backdrop) backdrop.setAttribute('aria-hidden','true');

  if (document && document.body) document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeyDown);

  if(lastFocused) { try { lastFocused.focus(); } catch(e){} }
}

function toggleMenu(){
  if (sideMenu && sideMenu.classList.contains('open')) {
    closeMenu();
  } else {
    openMenu();
  }
}

function onKeyDown(e){
  if(e.key === 'Escape') closeMenu();

  const focusable = sideMenu ? sideMenu.querySelectorAll('button, a') : [];
  if(!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length -1];

  if(e.key === 'Tab'){
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }
}

/* =====================
   Event listeners (guards)
   ===================== */

/* Adiciona listeners somente se os elementos existirem (proteção) */
if (btnHamburger) btnHamburger.addEventListener('click', toggleMenu);
if (btnClose) btnClose.addEventListener('click', closeMenu);
if (backdrop) backdrop.addEventListener('click', closeMenu);
if (logoutBtn) logoutBtn.addEventListener('click', (ev) => {
  // evita navegação dupla do <a href="/logout"> e nossa navegação programática
  try {
    ev.preventDefault();
  } catch(e) {}
  try {
    navigateTo('/logout');
  } catch(e) {
    window.location.href = '/logout';
  }
  closeMenu();
});
if (btnBack) btnBack.addEventListener('click', () => {
  try {
    navigateTo('/home');
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
const SERVER_PHOTO = (typeof window !== 'undefined' ? (window.USER_PHOTO || '') : '');
const USER_ID = (typeof window !== 'undefined' ? (window.USER_ID || '') : '');
const AVATAR_KEY = USER_ID ? `avatar_${USER_ID}` : 'avatar_default';

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
   * - Carrega avatar do servidor (USER_PHOTO) se disponível
   * - Fallback para DEFAULT_AVATAR
   */
  function loadAvatar(){
    try{
      if (avatarImg){
        if (SERVER_PHOTO){
          avatarImg.src = SERVER_PHOTO;
          return;
        }
        const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem(AVATAR_KEY) : null;
        if (stored){
          avatarImg.src = stored;
          return;
        }
        avatarImg.src = DEFAULT_AVATAR;
      }
    }catch(_){
      if (avatarImg) avatarImg.src = SERVER_PHOTO || DEFAULT_AVATAR;
    }
  }

  /**
   * handleFile(e)
   * - Envia imagem para o backend e atualiza avatar com a URL retornada
   */
  function handleFile(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const fd = new FormData();
    fd.append('avatar', f);

    // Salva fallback local (offline) enquanto atualiza no servidor
    try{
      const reader = new FileReader();
      reader.onload = function(){
        try{
          if (typeof localStorage !== 'undefined'){
            localStorage.setItem(AVATAR_KEY, reader.result);
          }
        }catch(_){ /* storage pode estar indisponível */ }
      };
      reader.readAsDataURL(f);
    }catch(_){ }

    fetch('/upload_avatar', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(json => {
        if(json && json.ok && json.photo_url){
          if (avatarImg) avatarImg.src = json.photo_url;
          if (modalImg) modalImg.src = json.photo_url;
          if (typeof window !== 'undefined') window.USER_PHOTO = json.photo_url;
        }
      })
      .catch(() => { /* silencioso conforme requisito */ });
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

  /* Inicializa avatar (carrega do servidor ou padrão) */
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
  // dados reais vindos do backend
  const DOCS_RAW = Array.isArray(window.PUBLICACOES) ? window.PUBLICACOES : [];
  console.log('DOCS_RAW carregados:', DOCS_RAW);
  function formatDate(v){
    try{
      if(!v) return '';
      const d = new Date(v);
      if(isNaN(d.getTime())) return String(v);
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }catch{ return String(v||''); }
  }
  const DOCS = DOCS_RAW.map(p => ({
    id: p.id_publicacao || null,
    title: p.titulo || 'Sem título',
    author: p.autor_nome || '',
    tipo: p.tipo || '',
    course: p.nome_curso || p.curso || '',
    date: formatDate(p.data_publicacao),
    thumb: '/img/logo.png',
    url: (p.nome_arquivo ? `/static/uploads/${p.nome_arquivo}` : '')
  }));

  const carousel = document.getElementById('carousel');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  const searchInput = document.getElementById('searchInput');
  const resultsCounter = document.getElementById('resultsCounterHome');
  const filterField = document.getElementById('homeFilterField');
  const clearBtn = document.getElementById('btnClearHomeFilters');
  const modal = document.getElementById('homeCardModal');
  const modalClose = document.getElementById('homeCardModalClose');
  const modalTitle = document.getElementById('homeCardModalTitle');
  const modalMeta = document.getElementById('homeCardModalMeta');
  const modalPreview = document.getElementById('homeCardModalPreview');
  // Botão de download removido na Home; o usuário baixa pela tela Publicação.

  function openCardModal(doc){
    if(!modal) return;
    // Abre o modal imediatamente para garantir visibilidade mesmo se a prévia falhar
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('open');

    if(modalTitle) modalTitle.textContent = doc.title || 'Publicação';
    if(modalMeta){
      const parts = [
        doc.author && `Autor: ${doc.author}`,
        doc.tipo && `Tipo: ${doc.tipo}`,
        doc.course && `Curso: ${doc.course}`,
        doc.date && `Data: ${doc.date}`
      ].filter(Boolean);
      modalMeta.textContent = parts.join(' • ');
    }

    // Ação de download removida: a Home não possui botão de download
    // O usuário deve usar a tela de Publicação para baixar o arquivo

    // Pré-visualização similar à tela Publicação
    if(modalPreview){
      modalPreview.innerHTML = '';
      try {
        const getExt = (u)=>{ try{ const m = String(u||'').toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/); return m ? ('.'+m[1]) : ''; }catch{ return ''; } };

        const url = doc && doc.url;
        if(url){
          const ext = getExt(url);
          if(['.doc','.docx','.xls','.xlsx'].includes(ext)){
            if(doc && doc.id){
              const frame = document.createElement('iframe');
              frame.src = `/preview_pdf_publicacao/${doc.id}`;
              frame.title = doc.title || 'Pré-visualização PDF';
              frame.style.width = '100%';
              frame.style.height = '520px';
              frame.style.border = '0';
              modalPreview.appendChild(frame);
            } else {
              const fail = document.createElement('div');
              fail.textContent = 'Pré-visualização indisponível sem identificador. Abra na tela Publicação para baixar.';
              fail.style.color = '#334155';
              modalPreview.appendChild(fail);
            }
          } else if(['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)){
            const img = document.createElement('img');
            img.src = url;
            img.alt = doc.title || 'Conteúdo da publicação';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            modalPreview.appendChild(img);
          } else if(ext === '.pdf'){
            const frame = document.createElement('iframe');
            frame.src = url;
            frame.title = doc.title || 'Conteúdo da publicação';
            frame.style.width = '100%';
            frame.style.height = '520px';
            frame.style.border = '0';
            modalPreview.appendChild(frame);
          } else if(ext === '.txt' || ext === '.csv'){
            const msg = document.createElement('div');
            msg.textContent = 'Carregando pré-visualização...';
            msg.style.color = '#334155';
            modalPreview.appendChild(msg);
            fetch(url).then(r=>r.text()).then(text=>{
              modalPreview.innerHTML = '';
              const pre = document.createElement('pre');
              pre.textContent = text;
              pre.style.whiteSpace = 'pre-wrap';
              pre.style.maxHeight = '520px';
              pre.style.overflow = 'auto';
              pre.style.background = '#fff';
              pre.style.padding = '12px';
              pre.style.borderRadius = '8px';
              modalPreview.appendChild(pre);
            }).catch(()=>{
              modalPreview.innerHTML = '';
              const fail = document.createElement('div');
              fail.textContent = 'Falha ao carregar pré-visualização. Abra na tela Publicação para baixar.';
              fail.style.color = '#334155';
              modalPreview.appendChild(fail);
            });
          } else {
            const msg = document.createElement('div');
            msg.textContent = 'Pré-visualização indisponível para este tipo. Abra na tela Publicação para baixar.';
            msg.style.color = '#334155';
            modalPreview.appendChild(msg);
          }
        } else {
          const msg = document.createElement('div');
          msg.textContent = 'Nenhum arquivo anexado ou endereço indisponível.';
          msg.style.color = '#334155';
          modalPreview.appendChild(msg);
        }
      } catch(err){
        const fail = document.createElement('div');
        fail.textContent = 'Falha ao preparar a pré-visualização. Abra na tela Publicação para baixar.';
        fail.style.color = '#334155';
        modalPreview.appendChild(fail);
      }
    }
  }
  function closeCardModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
    modal.classList.remove('open');
    if(modalPreview) modalPreview.innerHTML = '';
  }
  if(modalClose) modalClose.addEventListener('click', closeCardModal);
  if(modal) modal.addEventListener('click', (ev)=>{ if(ev.target === modal) closeCardModal(); });
  document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape' && modal && modal.classList.contains('open')) closeCardModal(); });

  // cria um card DOM a partir de um objeto doc
  function createCard(doc) {
    const item = document.createElement('article');
    item.className = 'carousel-item';
    item.setAttribute('role','listitem');
    item.tabIndex = 0; // acessível por teclado
    item.dataset.idx = String(DOCS.indexOf(doc));

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = doc.thumb || '/img/logo.png';
    img.alt = doc.title || 'Documento';

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = doc.title || 'Sem título';

    const author = document.createElement('div');
    author.className = 'meta-line';
    author.textContent = `Autor: ${doc.author || '—'}`;

    const tipo = document.createElement('div');
    tipo.className = 'meta-line';
    tipo.textContent = `Tipo: ${doc.tipo || '—'}`;

    const course = document.createElement('div');
    course.className = 'meta-line';
    course.textContent = `Curso: ${doc.course || '—'}`;

    const date = document.createElement('div');
    date.className = 'meta-line';
    date.textContent = `Data: ${doc.date || ''}`;

    meta.appendChild(title);
    meta.appendChild(author);
    meta.appendChild(tipo);
    meta.appendChild(course);
    meta.appendChild(date);

    item.appendChild(img);
    item.appendChild(meta);

    // abre modal ao selecionar
    item.addEventListener('click', ()=> openCardModal(doc));
    item.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openCardModal(doc); }
    });

    return item;
  }

  // contador de resultados
  function updateCounter(visibleCount, totalCount){
    if(!resultsCounter) return;
    if(totalCount == null) totalCount = DOCS.length;
    if(visibleCount === 0){ resultsCounter.textContent = 'Nenhum resultado'; }
    else { resultsCounter.textContent = `Exibindo ${visibleCount} de ${totalCount}`; }
  }

  // popula o carrossel
  function populateCarousel(docs) {
    if (!carousel) return;
    carousel.innerHTML = '';
    docs.forEach(d => carousel.appendChild(createCard(d)));
    updateCounter(docs.length, DOCS.length);
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

  // busca: filtra por título/autor/tipo/curso
  function doSearch() {
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const field = (filterField && filterField.value) || 'all';
    if (!q) { populateCarousel(DOCS); return; }
  
    const filtered = DOCS.filter(d => {
      if(field === 'all'){
        const hay = `${d.title||''} ${d.author||''} ${d.tipo||''} ${d.course||''}`.toLowerCase();
        return hay.includes(q);
      }
      if(field === 'titulo') return (d.title||'').toLowerCase().includes(q);
      if(field === 'autor') return (d.author||'').toLowerCase().includes(q);
      if(field === 'tipo') return (d.tipo||'').toLowerCase().includes(q);
      if(field === 'curso') return (d.course||'').toLowerCase().includes(q);
      return false;
    });
    populateCarousel(filtered);
  }

  // busca: Enter e digitação imediata
  if (searchInput){
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    searchInput.addEventListener('input', () => { doSearch(); });
  }
  if (filterField) filterField.addEventListener('change', () => { doSearch(); });
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if(searchInput) searchInput.value = '';
    if(filterField) filterField.value = 'all';
    populateCarousel(DOCS);
  });

  // comportamento de arrastar/scroll (drag-to-scroll)
  (function enableDragScroll(el) {
    if (!el) return;
    let isDown = false;
    let startX = 0, scrollLeft = 0;
    let moved = false;
    let downTarget = null;

    el.addEventListener('pointerdown', (e) => {
      isDown = true;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
      moved = false;
      downTarget = e.target && e.target.closest ? e.target.closest('.carousel-item') : null;
      el.classList.add('dragging');
    });

    el.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = startX - e.clientX;
      if (Math.abs(dx) > 5) moved = true;
      el.scrollLeft = scrollLeft + dx;
    });

    el.addEventListener('pointerup', (e) => {
      isDown = false;
      try { el.releasePointerCapture(e.pointerId); } catch(_) {}
      el.classList.remove('dragging');
      if (!moved && downTarget) {
        const idxAttr = downTarget.getAttribute('data-idx');
        const doc = (idxAttr != null) ? DOCS[Number(idxAttr)] : null;
        if (doc) openCardModal(doc);
      }
      downTarget = null;
    });

    el.addEventListener('pointercancel', () => { 
      isDown = false; 
      moved = false; 
      downTarget = null; 
      el.classList.remove('dragging'); 
    });

    // permitir navegação por teclado: setas esquerda/direita
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { scrollByItem('next'); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { scrollByItem('prev'); e.preventDefault(); }
    });
  })(carousel);

  // inicializa com dados reais
  populateCarousel(DOCS);

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

  // Calcula a posição do cursor com base na quantidade de dígitos antes do cursor
  function caretFromDigits(formatted, digitCount){
    if(digitCount <= 0) return 0;
    let seen = 0;
    for(let i=0;i<formatted.length;i++){
      if(/\d/.test(formatted[i])){
        seen++;
        if(seen === digitCount) return i+1; // logo após o dígito correspondente
      }
    }
    return formatted.length;
  }

  // CPF (cadastro de alunos)
  const cpfInput = document.getElementById('cpf_user');
  if(cpfInput){
    cpfInput.setAttribute('inputmode','numeric');
    cpfInput.setAttribute('maxlength','14');
    cpfInput.setAttribute('pattern','\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}');
    cpfInput.addEventListener('input', function(){
      const raw = cpfInput.value || '';
      const prevPos = cpfInput.selectionStart || raw.length;
      const digitsBefore = onlyDigits(raw.slice(0, prevPos)).length;
      const formatted = applyCpfMask(raw);
      cpfInput.value = formatted;
      const newPos = caretFromDigits(formatted, digitsBefore);
      try { cpfInput.setSelectionRange(newPos, newPos); } catch(e){}
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
        if (window.showToast) { window.showToast('Informe o título da publicação.', 'error'); } else { alert('Informe o título da publicação.'); }
        return;
      }
      if(tipo && !tipo.value.trim()){
        ev.preventDefault();
        tipo.focus();
        tipo.reportValidity && tipo.reportValidity();
        if (window.showToast) { window.showToast('Informe o tipo da publicação.', 'error'); } else { alert('Informe o tipo da publicação.'); }
        return;
      }
      // arquivo obrigatório
      if(conteudo){
        const f = conteudo.files && conteudo.files[0];
        if(!f){
          ev.preventDefault();
          if (window.showToast) { window.showToast('Anexe o arquivo de conteúdo para publicar.', 'error'); } else { alert('Anexe o arquivo de conteúdo para publicar.'); }
          return;
        }
        const ext = getExt(f.name);
        if(!ALLOW_EXT.has(ext)){
          ev.preventDefault();
          if (window.showToast) { window.showToast('Tipo de arquivo não permitido.', 'error'); } else { alert('Tipo de arquivo não permitido.'); }
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
            if (window.showToast) { window.showToast('Tipo de arquivo do termo não permitido.', 'error'); } else { alert('Tipo de arquivo do termo não permitido.'); }
            return;
          }
        }
      }
    });
  }
})();
