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
  { name: 'Cadastro de Usuários', path: '/cadastro_alunos', icon: 'people' },
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
  'Docente': new Set(['/home','/publicacao','/suporte','/avaliacao','/relatorio']),
  'Aluno': new Set(['/home','/publicacao','/suporte','/relatorio'])
};

// Calcula rotas permitidas
const allowedSet = ALLOWED_BY_ROLE[USER_ROLE] || new Set(['/home']);

/*
 * Desativa spellcheck/autocorreção em campos de texto para evitar sublinhado vermelho.
 * Aplica-se globalmente a textareas, inputs de texto/Busca/Email/URL/Tel e contenteditable.
 */
(function disableGlobalSpellcheck(){
  try {
    const selectors = [
      'textarea',
      'input[type="text"]',
      'input[type="search"]',
      'input[type="email"]',
      'input[type="url"]',
      'input[type="tel"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      el.setAttribute('spellcheck','false');
      // iOS/Safari: atributos auxiliares
      el.setAttribute('autocorrect','off');
      el.setAttribute('autocapitalize','off');
    });
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.setAttribute('spellcheck','false');
      el.setAttribute('autocorrect','off');
      el.setAttribute('autocapitalize','off');
    });
  } catch(_) { /* noop */ }
})();
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

/* lê a rota atual preferindo a rota do navegador, com fallback para storage/default */
let currentRoute = (function(){
  // rota atual do navegador
  let pathFromLocation = '';
  try {
    if (typeof window !== 'undefined' && window.location && window.location.pathname) {
      pathFromLocation = String(window.location.pathname).trim();
    }
  } catch(e) { /* noop */ }

  // se a rota atual existe na lista, usa ela para marcar ativo
  const hasPathInRoutes = ROUTES && Array.isArray(ROUTES) && ROUTES.some(r => r && r.path === pathFromLocation);
  if (pathFromLocation && hasPathInRoutes) {
    try { localStorage.setItem(ROUTE_STORAGE_KEY, pathFromLocation); } catch(e) { /* noop */ }
    return pathFromLocation;
  }

  // caso contrário, usa valor persistido ou rota padrão
  try {
    return localStorage.getItem(ROUTE_STORAGE_KEY) || DEFAULT_ROUTE || (ROUTES[0] && ROUTES[0].path) || '/';
  } catch(e) {
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
const menuCloseBtn = document.getElementById('btnClose');
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

  // Foca a rota atualmente ativa; se não houver, foca a primeira
  let activeBtn = null;
  try {
    if (routesList) {
      activeBtn = routesList.querySelector('.route.active,[aria-current="page"]');
    }
  } catch(e) { /* noop */ }

  if (activeBtn) {
    try { activeBtn.focus(); } catch(e){}
  } else {
    const first = document.getElementById('firstRoute');
    if(first) { try { first.focus(); } catch(e){} }
  }

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
if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeMenu);
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

  // Modal de detalhes da notificação
  const notifModal = document.getElementById('notifModal');
  const notifModalTitle = document.getElementById('notifModalTitle');
  const notifModalMessage = document.getElementById('notifModalMessage');
  const notifModalMeta = document.getElementById('notifModalMeta');
  const notifModalPreview = document.getElementById('notifModalPreview');
  const notifModalMarkRead = document.getElementById('notifModalMarkRead');
  const notifModalClose = document.getElementById('notifModalClose');

  // Estado para controlar visibilidade do dropdown enquanto o modal está aberto
  let notifDropdownWasOpenOnModal = false;
  let notifModalActive = false;

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

  // ===== Notificações: busca e renderização =====
  function updateNotifBadge(count){
    try {
      if(!notifBadge) return;
      const n = parseInt(count, 10) || 0;
      if(n > 0){
        notifBadge.textContent = String(n);
        notifBadge.style.display = '';
        notifBadge.setAttribute('aria-hidden','false');
      } else {
        notifBadge.textContent = '';
        notifBadge.style.display = 'none';
        notifBadge.setAttribute('aria-hidden','true');
      }
    } catch(_){}
  }

  // Utilitário simples para label de tempo relativo
  function notifTimeAgo(ts){
    try{
      if(!ts) return '';
      let d = null;
      if(typeof ts === 'string'){
        const s = ts.trim();
        // dd/mm/aaaa HH:MM
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
        if(m){
          const [_,dd,mm,yyyy,HH,MM] = m;
          d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10), parseInt(HH||'0',10), parseInt(MM||'0',10));
        }else{
          d = new Date(s);
        }
      } else if(typeof ts === 'number'){
        d = new Date(ts);
      } else if(ts instanceof Date){
        d = ts;
      }
      if(!d || isNaN(d)) return '';
      const diff = Math.floor((Date.now() - d.getTime())/1000);
      if(diff < 60) return 'há poucos segundos';
      if(diff < 3600) return `há ${Math.floor(diff/60)} min`;
      if(diff < 86400) return `há ${Math.floor(diff/3600)} h`;
      return `há ${Math.floor(diff/86400)} d`;
    }catch(_){ return ''; }
  }

  // Determina a URL alvo para a notificação
  function getNotifTargetURL(refTipo, refId){
    const t = String(refTipo||'').toLowerCase();
    const role = (typeof USER_ROLE !== 'undefined' ? USER_ROLE : '').trim();
    // Fluxo correto:
    // - Docente/Admin: ir para tela de avaliação quando a notificação se refere a publicação/avaliação
    // - Aluno: ir para publicações; se houver id, pode abrir preview direto
    if (t.includes('publicacao')) {
      if (role === 'Docente' || role === 'Administrador') {
        return `${location.origin}/avaliacao`;
      }
      return refId ? `${location.origin}/preview_pdf_publicacao/${encodeURIComponent(refId)}`
                   : `${location.origin}/publicacao`;
    }
    if (t.includes('avaliacao')) {
      if (role === 'Docente' || role === 'Administrador') {
        return `${location.origin}/avaliacao`;
      }
      return `${location.origin}/publicacao`;
    }
    return `${location.origin}/home`;
  }

  // Abre em nova aba e marca a notificação como lida; não usa modal
  async function openNotifInNewTabAndMarkRead({ id, refTipo, refId } = {}){
    const target = getNotifTargetURL(refTipo, refId);
    try{ window.open(target, '_blank', 'noopener'); }catch(_){ location.href = target; }
    if(id){
      try{
        const r = await fetch('/api/notificacoes/read', {
          method:'POST', headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
          body: JSON.stringify({ id })
        });
        await r.json().catch(()=>({}));
      }catch(_){ }
      // Atualiza UI: remove item e sincroniza badge
      try{
        const item = notifDropdown && notifDropdown.querySelector(`.notif-item[data-id="${id}"]`);
        if(item){ item.remove(); }
      }catch(_){ }
      const current = parseInt(notifBadge && (notifBadge.textContent||'0'), 10) || 0;
      updateNotifBadge(Math.max(0, current - 1));
      try { await fetchNotifCount(); } catch(_){ }
      if(notifDropdown && !notifDropdown.querySelector('.notif-item')){
        notifDropdown.innerHTML = '<div class="notif-empty">Você não tem novas notificações</div>';
        try { await fetchNotifCount(); } catch(_){ }
      }
    }
  }

  // Mantém assinatura antiga: qualquer chamada ao modal agora delega para nova aba
  function openNotifModal(data){
    const payload = data || {};
    openNotifInNewTabAndMarkRead({ id: payload.id, refTipo: payload.refTipo, refId: payload.refId });
  }

  function closeNotifModal(){
    if(!notifModal) return;
    notifModal.setAttribute('aria-hidden','true');
    notifModal.classList.remove('open');
    try{ if(notifModalPreview) notifModalPreview.innerHTML = ''; }catch(_){ }

    // Restaura o dropdown se ele estava aberto antes de abrir o modal
    try{
      notifModalActive = false;
      if(notifDropdownWasOpenOnModal){
        if(notifDropdown){ notifDropdown.setAttribute('aria-hidden','false'); }
        if(btnNotifications){ btnNotifications.setAttribute('aria-expanded','true'); }
      }
      notifDropdownWasOpenOnModal = false;
    }catch(_){ }
  }

  // Ações do modal de notificação
  if(notifModalClose){
    notifModalClose.addEventListener('click', (e)=>{ e.stopPropagation(); closeNotifModal(); });
  }
  if(notifModalMarkRead){
    notifModalMarkRead.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const id = notifModalMarkRead.getAttribute('data-id');
      if(!id) return closeNotifModal();
      try{
        const r = await fetch('/api/notificacoes/read', {
          method:'POST', headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
          body: JSON.stringify({ id })
        });
        await r.json().catch(()=>({}));
        const item = notifDropdown && notifDropdown.querySelector(`.notif-item[data-id="${id}"]`);
        if(item) item.remove();
        const current = parseInt(notifBadge && (notifBadge.textContent||'0'), 10) || 0;
        updateNotifBadge(Math.max(0, current - 1));
        // Sincroniza imediatamente com o backend para evitar divergências em múltiplas abas
        try { await fetchNotifCount(); } catch(_){ }
        closeNotifModal();
        try { window.showToast && window.showToast('Notificação marcada como lida.', 'success'); } catch(_){}
        if(!notifDropdown.querySelector('.notif-item')){
          notifDropdown.innerHTML = '<div class="notif-empty">Você não tem novas notificações</div>';
          // Garante que o badge reflita o estado real do backend
          try { await fetchNotifCount(); } catch(_){ }
        }
      }catch(_){ try { window.showToast && window.showToast('Falha ao marcar como lida.', 'error'); } catch(__){} }
    });
  }

  // Abre o dropdown de notificações programaticamente
  function openNotifDropdown(){
    if(!btnNotifications || !notifDropdown) return;
    const isOpen = notifDropdown.getAttribute('aria-hidden') === 'false';
    if(isOpen) return; // evita reabrir desnecessariamente
    closeAllMenus();
    notifDropdown.setAttribute('aria-hidden','false');
    btnNotifications.setAttribute('aria-expanded','true');
    // estado de carregamento enquanto busca dados
    try {
      const listEl = document.getElementById('notifList');
      if(listEl){
        listEl.innerHTML = '<div class="notif-loading">Carregando notificações...</div>';
      } else {
        notifDropdown.innerHTML = '<div class="notif-loading">Carregando notificações...</div>';
      }
    } catch(_){ }
    // busca e renderiza notificações ao abrir
    fetchAndRenderNotifList();
    // atualiza badge por garantia
    fetchNotifCount();
    // foca o primeiro item (acessibilidade)
    setTimeout(() => {
      const container = document.getElementById('notifList') || notifDropdown;
      const first = container.querySelector('.notif-item');
      if(first) first.focus();
    }, 0);
  }

  let notifAutoOpenDone = false;
  async function fetchNotifCount(opts = {}){
    const { autoOpenIfHas = false } = opts;
    try{
      const r = await fetch('/api/notificacoes/count', { headers: { 'Accept':'application/json' } });
      const j = await r.json();
      const c = j && (j.count ?? j.total ?? 0);
      updateNotifBadge(c);
      // Autoabrir uma única vez se houver não lidas e a opção estiver habilitada
      try{
        if (autoOpenIfHas && !notifAutoOpenDone && c > 0){
          openNotifDropdown();
          notifAutoOpenDone = true;
        }
      }catch(_){ }
      
    }catch(_){ /* mantém estado atual */ }
  }

  function renderNotifList(items){
    if(!notifDropdown) return;
    // Utilitário: parse dd/mm/aaaa HH:MM ou ISO
    function parseDateFlexible(ts){
      try{
        if(!ts) return null;
        if(typeof ts === 'string'){
          const s = ts.trim();
          // dd/mm/aaaa HH:MM
          const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
          if(m){
            const dd = parseInt(m[1],10), mm = parseInt(m[2],10)-1, yyyy = parseInt(m[3],10);
            const hh = m[4] ? parseInt(m[4],10) : 0;
            const min = m[5] ? parseInt(m[5],10) : 0;
            return new Date(yyyy, mm, dd, hh, min, 0, 0);
          }
          // ISO
          const d = new Date(s);
          if(!isNaN(d.getTime())) return d;
        } else if(ts instanceof Date){
          return ts;
        }
      }catch(_){ }
      return null;
    }
    // Utilitário: retorna string "há X..." em pt-BR
    function timeAgo(ts){
      const d = parseDateFlexible(ts);
      if(!d) return '';
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - d.getTime());
      const sec = Math.floor(diffMs/1000);
      if(sec < 60) return 'agora';
      const min = Math.floor(sec/60);
      if(min < 60) return `há ${min} min`;
      const h = Math.floor(min/60);
      if(h < 24) return `há ${h} h`;
      const dday = Math.floor(h/24);
      if(dday < 30) return `há ${dday} d`;
      const mon = Math.floor(dday/30);
      if(mon < 12) return `há ${mon} m`; // meses
      const yr = Math.floor(mon/12);
      return `há ${yr} a`;
    }

    const arr = Array.isArray(items) ? items : [];
    const listEl = document.getElementById('notifList');
    if(listEl){
      if(!arr.length){
        listEl.innerHTML = '<div class="notif-empty">Você não tem novas notificações</div>';
      } else {
        const htmlItems = [];
        arr.forEach(n => {
          const tipo = (n.tipo || 'info');
          const title = (n.titulo || n.title || '');
          const msg = (n.mensagem || n.message || '');
          const ts = (n.ts || n.timestamp || n.created_at || '');
          const read = !!(n.lido || n.lida || n.read);
          const id = (n.id || n.id_notificacao || '');
          const refTipo = (n.ref_tipo || n.refType || '');
          const refId = (n.ref_id || n.refId || '');
          let href = '/home';
          if(String(refTipo).toLowerCase().includes('publicacao')){ href = '/publicacao'; }
          const icon = tipo === 'success' ? 'task_alt' : (tipo === 'error' ? 'error' : 'info');
          const rel = timeAgo(ts);
          htmlItems.push(
            `<div class="notif-item" data-id="${id}" data-read="${read}" data-ref-tipo="${String(refTipo||'')}" data-ref-id="${String(refId||'')}" data-href="${href}" data-ts="${String(ts)}">
               <span class="material-symbols-outlined">${icon}</span>
               <div>
                 <div class="notif-title">${title}</div>
                 <div class="notif-sub">${msg}${rel ? ` • <span class="notif-time">${rel}</span>` : ''}</div>
                 <button class="notif-mark-read" data-id="${id}">Marcar lida</button>
               </div>
             </div>`
          );
        });
        listEl.innerHTML = htmlItems.join('');
      }
    } else {
      if(!arr.length){
        notifDropdown.innerHTML = '<div class="notif-empty">Você não tem novas notificações</div>';
        return;
      }
      const isAvalPage = (typeof window !== 'undefined' && String(window.location.pathname || '').startsWith('/avaliacao'));
      const html = [
        '<div class="notif-menu-header">'
        + '<span>Notificações</span>'
        + (isAvalPage ? '' : '<button id="btnMarkAllRead" class="notif-mark-all">Marcar todas lidas</button>')
        + '</div>'
      ];
      arr.forEach(n => {
        const tipo = (n.tipo || 'info');
        const title = (n.titulo || n.title || '');
        const msg = (n.mensagem || n.message || '');
        const ts = (n.ts || n.timestamp || n.created_at || '');
        const read = !!(n.lido || n.lida || n.read);
        const id = (n.id || n.id_notificacao || '');
        const refTipo = (n.ref_tipo || n.refType || '');
        const refId = (n.ref_id || n.refId || '');
        let href = '/home';
        if(String(refTipo).toLowerCase().includes('publicacao')){ href = '/publicacao'; }
        const icon = tipo === 'success' ? 'task_alt' : (tipo === 'error' ? 'error' : 'info');
        const rel = timeAgo(ts);
        html.push(
          `<div class="notif-item" data-id="${id}" data-read="${read}" data-ref-tipo="${String(refTipo||'')}" data-ref-id="${String(refId||'')}" data-href="${href}" data-ts="${String(ts)}">
             <span class="material-symbols-outlined">${icon}</span>
             <div>
               <div class="notif-title">${title}</div>
               <div class="notif-sub">${msg}${rel ? ` • <span class="notif-time">${rel}</span>` : ''}</div>
               <button class="notif-mark-read" data-id="${id}">Marcar lida</button>
             </div>
           </div>`
        );
      });
      notifDropdown.innerHTML = html.join('');
    }
    // ação: marcar todas como lidas
    const btnAll = document.getElementById('btnMarkAllRead');
    if(btnAll){
      btnAll.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        try{
          const r = await fetch('/api/notificacoes/read_all', { method:'POST', headers: { 'Accept':'application/json' } });
          await r.json().catch(() => ({}));
          updateNotifBadge(0);
          notifDropdown.innerHTML = '<div class="notif-empty">Você não tem novas notificações</div>';
          // Sincroniza o badge com o backend após marcar todas como lidas
          try { await fetchNotifCount(); } catch(_){ }
          try { window.showToast && window.showToast('Notificações marcadas como lidas.', 'success'); } catch(_){}
        }catch(_){ try { window.showToast && window.showToast('Falha ao marcar notificações.', 'error'); } catch(__){} }
      });
    }
    // ação: ao clicar na notificação, abrir em nova aba e marcar como lida
    notifDropdown.querySelectorAll('.notif-item[data-id]').forEach(el => {
      // destaque visual para não lidas
      try { if(el.getAttribute('data-read') === 'false') el.classList.add('is-unread'); } catch(_){}

      function handleOpen(){
        const id = el.getAttribute('data-id');
        const refTipo = el.getAttribute('data-ref-tipo') || '';
        const refId = el.getAttribute('data-ref-id') || '';
        openNotifInNewTabAndMarkRead({ id, refTipo, refId });
      }

      el.addEventListener('click', (ev) => { ev.stopPropagation(); handleOpen(); });
      // acessível via teclado
      el.setAttribute('tabindex','0');
      el.setAttribute('role','button');
      el.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); handleOpen(); } });
    });

    // ação: marcar individual como lida via botão dedicado
    notifDropdown.querySelectorAll('.notif-mark-read[data-id]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const id = btn.getAttribute('data-id');
        if(!id) return;
        try{
          const r = await fetch('/api/notificacoes/read', {
            method: 'POST',
            headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
            body: JSON.stringify({ id })
          });
          await r.json().catch(() => ({}));
          // Remove o item da lista ao marcar como lida
          const item = btn.closest('.notif-item');
          if(item){ item.remove(); }
          // Atualiza badge decrementando 1
          const current = parseInt(notifBadge && (notifBadge.textContent||'0'), 10) || 0;
          updateNotifBadge(Math.max(0, current - 1));
          // Sincroniza imediatamente com o backend para refletir a contagem real
          try { await fetchNotifCount(); } catch(_){ }
          // Se não houver mais itens, mostra vazio
          if(!notifDropdown.querySelector('.notif-item')){
            notifDropdown.innerHTML = '<div class="notif-empty">Você não tem novas notificações</div>';
            // Ajusta o badge consultando o backend
            try { await fetchNotifCount(); } catch(_){ }
          }
          try { window.showToast && window.showToast('Notificação marcada como lida.', 'success'); } catch(_){}
        }catch(_){ try { window.showToast && window.showToast('Falha ao marcar como lida.', 'error'); } catch(__){} }
      });
    });
  }

  async function fetchAndRenderNotifList(){
    try{
      const r = await fetch('/api/notificacoes/list?limit=10&unread=1', { headers: { 'Accept':'application/json' } });
      const j = await r.json();
      const items = j && (j.notifications || j.notificacoes || j.items || j.data || []);
      renderNotifList(items);
    }catch(_){
      renderNotifList([]);
    }
  }

  // Atualização em tempo real via SSE com fallback para polling
  function startPollingFallback(){
    try{
      if(startPollingFallback._started) return;
      startPollingFallback._started = true;
    }catch(_){}
    setInterval(()=>{
      fetchNotifCount();
      if(notifDropdown && notifDropdown.getAttribute('aria-hidden') === 'false'){
        fetchAndRenderNotifList();
      }
    }, 10000);
  }
  function setupNotifRealtime(){
    try{
      const es = new EventSource('/api/notificacoes/stream');
      es.onmessage = (e)=>{
        try{
          const data = JSON.parse(e.data || '{}');
          if(typeof data.count === 'number'){
            const prev = parseInt(notifBadge && (notifBadge.textContent||'0'), 10) || 0;
            updateNotifBadge(data.count);
            // Não autoabrir dropdown ao receber novas notificações
            // Se o dropdown estiver aberto e ainda não houver itens, mas há count>0, tenta re-buscar
            if (notifDropdown && notifDropdown.getAttribute('aria-hidden') === 'false'){
              const hasItems = !!notifDropdown.querySelector('.notif-item');
              if (!hasItems && data.count > 0){
                // mostra estado de carregamento e re-busca lista
                try { notifDropdown.innerHTML = '<div class="notif-loading">Carregando notificações...</div>'; } catch(_){}
                fetchAndRenderNotifList();
              }
            }
          }
          const items = data.items;
          if(items && notifDropdown && notifDropdown.getAttribute('aria-hidden') === 'false'){
            renderNotifList(items);
          }
        }catch(_){ /* ignora */ }
      };
      es.onerror = ()=>{ try{ es.close(); }catch(_){}; startPollingFallback(); };
    }catch(_){ startPollingFallback(); }
  }
  // Inicialização de notificações com fallback robusto
  function setupNotifRealtimeEnhanced(){
    try{
      if(setupNotifRealtimeEnhanced._started) return;
      setupNotifRealtimeEnhanced._started = true;
      if(!USER_ID){ startPollingFallback(); return; }
      if(typeof EventSource === 'undefined'){ startPollingFallback(); return; }
      const controller = ('AbortController' in window) ? new AbortController() : null;
      const timer = setTimeout(()=>{ try{ controller && controller.abort(); }catch(_){ } }, 2500);
      fetch('/api/notificacoes/count', { headers: { 'Accept':'application/json' }, signal: controller ? controller.signal : undefined })
        .then(r => { try{ clearTimeout(timer); }catch(_){ } return r.ok ? r.json() : Promise.reject(new Error('count failed')); })
        .then(() => {
          const es = new EventSource('/api/notificacoes/stream');
          es.onmessage = (e)=>{
            try{
              const data = JSON.parse(e.data || '{}');
              if(typeof data.count === 'number'){
                const prev = parseInt(notifBadge && (notifBadge.textContent||'0'), 10) || 0;
                updateNotifBadge(data.count);
                if (notifDropdown && notifDropdown.getAttribute('aria-hidden') === 'false'){
                  const hasItems = !!notifDropdown.querySelector('.notif-item');
                  if (!hasItems && data.count > 0){
                    try { notifDropdown.innerHTML = '<div class="notif-loading">Carregando notificações...</div>'; } catch(_){ }
                    fetchAndRenderNotifList();
                  }
                }
              }
              const items = data.items;
              if(items && notifDropdown && notifDropdown.getAttribute('aria-hidden') === 'false'){
                renderNotifList(items);
              }
            }catch(_){ /* ignora */ }
          };
          es.onerror = ()=>{ try{ es.close(); }catch(_){ } ; startPollingFallback(); };
        })
        .catch(() => { startPollingFallback(); });
    }catch(_){ startPollingFallback(); }
  }
  setupNotifRealtimeEnhanced();
  // Consulta inicial com autoabertura condicional (apenas uma vez)
  try{ fetchNotifCount({ autoOpenIfHas: true }); }catch(_){}

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

    try { window.showToast && window.showToast('Enviando nova foto...', 'info'); } catch(_){ }

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

    {
      let req = fetch('/upload_avatar', { method: 'POST', body: fd });
      if (window.ProgressOverlay) {
        req = window.ProgressOverlay.attachToPromise(req, { msg: 'Enviando foto...' });
      }
      req.then(r => r.json())
      .then(json => {
        if(json && json.ok && json.photo_url){
          if (avatarImg) avatarImg.src = json.photo_url;
          if (modalImg) modalImg.src = json.photo_url;
          if (typeof window !== 'undefined') window.USER_PHOTO = json.photo_url;
          try { window.showToast && window.showToast('Foto atualizada com sucesso!', 'success'); } catch(_){ }
        } else {
          try { window.showToast && window.showToast((json && json.error) || 'Falha ao atualizar foto.', 'error'); } catch(_){ }
        }
      })
      .catch(() => { try { window.showToast && window.showToast('Erro de conexão ao enviar foto.', 'error'); } catch(_){} });
    }
  }

  /* Toggle dropdown de notificações (abre/fecha) */
  if(btnNotifications && notifDropdown){
    btnNotifications.addEventListener('click', (ev) => {
      const open = notifDropdown.getAttribute('aria-hidden') === 'false';
      closeAllMenus(); // fecha outros menus antes
      if(!open){
        notifDropdown.setAttribute('aria-hidden','false');
        btnNotifications.setAttribute('aria-expanded','true');
        // busca e renderiza notificações quando abrir
        fetchAndRenderNotifList();
        // atualiza badge (caso tenha mudado em outra aba)
        fetchNotifCount();
      }
      ev.stopPropagation(); // impede clique subir para document
    });
  }

  // Fallback: botão estático existente em alguns templates — removido da Avaliação
  // Em outras telas, mantém funcionalidade
  (function bindLegacyMarkAll(){
    try{
      const isAvalPage = (typeof window !== 'undefined' && String(window.location.pathname || '').startsWith('/avaliacao'));
      const legacyBtn = document.getElementById('markAllRead');
      if(!legacyBtn) return;
      if(isAvalPage){
        // Não exibir na Avaliação do Docente
        try { legacyBtn.remove(); } catch(_){}
        return;
      }
      legacyBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        try{
          const r = await fetch('/api/notificacoes/read_all', { method:'POST', headers: { 'Accept':'application/json' } });
          await r.json().catch(() => ({}));
          updateNotifBadge(0);
          if(notifDropdown){
            notifDropdown.innerHTML = '<div class=\"notif-empty\">Você não tem novas notificações</div>';
          }
          // Reconsulta o backend para sincronizar contagem real
          try { await fetchNotifCount(); } catch(_){ }
          try { window.showToast && window.showToast('Notificações marcadas como lidas.', 'success'); } catch(_){}
        }catch(_){
          try { window.showToast && window.showToast('Falha ao marcar notificações.', 'error'); } catch(__){}
        }
      });
    }catch(_){ }
  })();

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
    viewPhoto.addEventListener('click', (ev) => {
      if (modalImg && avatarImg) modalImg.src = avatarImg.src || DEFAULT_AVATAR;
      if (avatarModal) {
        avatarModal.setAttribute('aria-hidden','false');
        avatarModal.classList.add('open');
      }
      closeAllMenus();
      // foco no botão fechar do modal para facilitar teclado
      if (closeModal) closeModal.focus();
      // impede que o clique feche o modal pelo listener global
      ev.stopPropagation();
    });
  }

  /* Mudar foto -> dispara input file (visível somente para seleção local) */
  if(changePhoto){
    changePhoto.addEventListener('click', (ev) => {
      if (fileInput) fileInput.click();
      closeAllMenus();
      // evita fechamento imediato por clique global
      ev.stopPropagation();
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
    if (notifModal && notifModal.getAttribute('aria-hidden') === 'false' && !target.closest('.modal-content')) {
      notifModal.setAttribute('aria-hidden','true');
      notifModal.classList.remove('open');
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
      if(notifModal && notifModal.getAttribute('aria-hidden') === 'false'){
        notifModal.setAttribute('aria-hidden','true');
        notifModal.classList.remove('open');
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
    updateNotifBadge(count);
    // Busca do backend sem autoabertura
    fetchNotifCount({ autoOpenIfHas: false });
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
      // Aceita já em dd/mm/aaaa; se estiver em ISO, converte
      if(typeof v === 'string' && v.includes('/')){
        return v; // já está em dd/mm/aaaa
      }
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
  // Denúncia de copyright (apenas no modal da Home)
  const complaintForm = document.getElementById('homeCardComplaintForm');
  const complaintText = document.getElementById('homeCardComplaintText');
  const complaintImage = document.getElementById('homeCardComplaintImage');
  const complaintSubmit = document.getElementById('homeCardComplaintSubmit');
  const complaintCount = document.getElementById('homeComplaintCount');
  const complaintSection = document.getElementById('homeCardComplaint');
  const complaintImageLabel = (function(){
    try { return document.querySelector('label[for="homeCardComplaintImage"]'); } catch(_) { return null; }
  })();
  let currentDoc = null;
  // Botão de download removido na Home; o usuário baixa pela tela Publicação.

  // Enforce max length on complaint textarea (robust against paste)
  const MAX_DENUNCIA_LEN = 800;
  if (complaintText) {
    try { complaintText.setAttribute('maxlength', String(MAX_DENUNCIA_LEN)); } catch(_){}
    complaintText.addEventListener('input', () => {
      const v = complaintText.value || '';
      if (v.length > MAX_DENUNCIA_LEN) {
        complaintText.value = v.slice(0, MAX_DENUNCIA_LEN);
      }
      // Atualiza contador em tempo real
      try { if (complaintCount) complaintCount.textContent = String((complaintText.value||'').length); } catch(_){}
      // limpa erro se usuário corrigir
      try {
        complaintText.classList.remove('field-error');
        const msgEl = complaintText.parentElement && complaintText.parentElement.querySelector('.field-msg.error');
        if (msgEl) msgEl.remove();
      } catch(_){}
    });
    // Inicializa contador ao abrir a página/modal
    try { if (complaintCount) complaintCount.textContent = String((complaintText.value||'').length); } catch(_){}
  }

  // Bloqueia denúncia para Docente (usa avaliação indeferir/deferir)
  if (USER_ROLE === 'Docente' && complaintSection) {
    try {
      complaintSection.innerHTML = '<div style="color:#334155;font-size:13px">Docentes não podem registrar denúncia. Utilize a tela de Avaliação para indeferir antes da publicação.</div>';
    } catch(_){ }
  }

  function openCardModal(doc){
    currentDoc = doc || null;
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

    // Pré-visualização similar à tela Publicação, com controles de zoom
    if(modalPreview){
      modalPreview.innerHTML = '';
      try {
        const getExt = (u)=>{ try{ const m = String(u||'').toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/); return m ? ('.'+m[1]) : ''; }catch{ return ''; } };

        const url = doc && doc.url;
        if(url){
          const ext = getExt(url);
          if(['.doc','.docx','.xls','.xlsx'].includes(ext)){
            if(doc && doc.id){
              // Apenas iframe com toolbar nativa do viewer
              const frame = document.createElement('iframe');
              frame.src = `/preview_pdf_publicacao/${doc.id}#zoom=page-width`;
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
            // Apenas iframe com toolbar nativa do viewer
            const frame = document.createElement('iframe');
            frame.src = url + '#zoom=page-width';
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
              pre.style.fontSize = '16px';
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

  // Envio da denúncia de copyright para /suporte sem sair da Home
  if (complaintForm) {
    complaintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        // Bloqueio adicional no front para Docente
        if (USER_ROLE === 'Docente') {
          try { window.showToast && window.showToast('Denúncia indisponível para Docente. Utilize Avaliação.', 'error'); } catch(_) {}
          return;
        }
        if (!currentDoc) {
          try { window.showToast && window.showToast('Publicação não identificada.', 'error'); } catch(_) {}
          return;
        }
        const raw = (complaintText && complaintText.value || '');
        const desc = raw.trim();
        if (!desc) {
          if (complaintText) complaintText.focus();
          // destaque visual
          try {
            complaintText.classList.add('field-error');
            const container = complaintText.parentElement || complaintForm;
            let msgEl = container.querySelector('.field-msg.error');
            if (!msgEl) {
              msgEl = document.createElement('div');
              msgEl.className = 'field-msg error';
              msgEl.style.color = '#dc2626';
              msgEl.style.fontSize = '12px';
              msgEl.style.marginTop = '4px';
              container.appendChild(msgEl);
            }
            msgEl.textContent = 'Descreva a denúncia.';
          } catch(_){}
          try { window.showToast && window.showToast('Descreva a denúncia antes de enviar.', 'error'); } catch(_) {}
          return;
        }
        if (desc.length > MAX_DENUNCIA_LEN) {
          if (complaintText) {
            complaintText.value = desc.slice(0, MAX_DENUNCIA_LEN);
            complaintText.focus();
          }
          try { window.showToast && window.showToast(`Limite de ${MAX_DENUNCIA_LEN} caracteres excedido.`, 'error'); } catch(_) {}
          return;
        }
        // exige imagem de erro
        const hasImage = !!(complaintImage && complaintImage.files && complaintImage.files.length > 0);
        if (!hasImage) {
          try {
            if (complaintImageLabel) {
              complaintImageLabel.classList.add('field-error');
              let msgEl = complaintImageLabel.nextElementSibling && complaintImageLabel.nextElementSibling.classList && complaintImageLabel.nextElementSibling.classList.contains('field-msg') ? complaintImageLabel.nextElementSibling : null;
              if (!msgEl) {
                msgEl = document.createElement('div');
                msgEl.className = 'field-msg error';
                msgEl.style.color = '#dc2626';
                msgEl.style.fontSize = '12px';
                msgEl.style.marginTop = '4px';
                complaintImageLabel.parentElement && complaintImageLabel.parentElement.appendChild(msgEl);
              }
              msgEl.textContent = 'Anexe uma imagem do erro.';
            }
          } catch(_){}
          try { window.showToast && window.showToast('Anexe uma imagem do erro para avaliação.', 'error'); } catch(_) {}
          return;
        }
        const compose = (v) => (v==null||v==='') ? '—' : String(v);
        const msg = [
          'Denúncia de COPYRIGHT no INPROLIB:',
          '',
          `Título: ${compose(currentDoc.title)}`,
          `Autor: ${compose(currentDoc.author)}`,
          `Curso: ${compose(currentDoc.course)}`,
          `Tipo: ${compose(currentDoc.tipo)}`,
          `ID da publicação: ${compose(currentDoc.id)}`,
          '',
          'Descrição do usuário:',
          desc
        ].join('\n');

        const fd = new FormData();
        fd.append('mensagem', msg);
        fd.append('mensagem_plain', desc);
        if (currentDoc && currentDoc.id != null) {
          fd.append('id_publicacao', String(currentDoc.id));
        }
        if (complaintImage && complaintImage.files && complaintImage.files.length > 0) {
          fd.append('imagem', complaintImage.files[0]);
        }

        const prevText = complaintSubmit ? complaintSubmit.textContent : '';
        if (complaintSubmit) {
          complaintSubmit.disabled = true;
          complaintSubmit.textContent = 'Enviando...';
        }
        try { window.showToast && window.showToast('Enviando sua denúncia...', 'info'); } catch(_) {}

        let req = fetch('/publicacao/denuncia', { method: 'POST', body: fd, redirect: 'follow' });
        if (window.ProgressOverlay) {
          req = window.ProgressOverlay.attachToPromise(req, { msg: 'Enviando sua denúncia...' });
        }
        const resp = await req;
        const ok = resp && resp.ok;
        let payload = null;
        try { payload = await resp.json(); } catch(_) { payload = null; }
        if (ok) {
          if (complaintText) complaintText.value = '';
          if (complaintImage) complaintImage.value = '';
          try { if (complaintCount) complaintCount.textContent = '0'; } catch(_){}
          try { window.showToast && window.showToast('Denúncia enviada com sucesso!', 'success'); } catch(_) {}
          // redireciona para Últimas publicações com status denunciada
          try { window.location.href = '/publicacao'; } catch(_){}
        } else {
          // exibe erros padronizados e destaca campo
          const errMsg = (payload && payload.error) ? payload.error : 'Falha ao enviar a denúncia.';
          try { window.showToast && window.showToast(errMsg, 'error'); } catch(_) {}
          if (payload && /imagem/i.test(errMsg)) {
            try {
              complaintImageLabel && complaintImageLabel.classList.add('field-error');
            } catch(_){}
          }
          if (payload && /800/i.test(errMsg)) {
            try { complaintText && complaintText.classList.add('field-error'); } catch(_){}
          }
        }
        if (complaintSubmit) {
          complaintSubmit.disabled = false;
          complaintSubmit.textContent = prevText || 'Enviar denúncia';
        }
      } catch (err) {
        try { window.showToast && window.showToast('Erro inesperado. Verifique sua conexão.', 'error'); } catch(_) {}
        if (complaintSubmit) {
          complaintSubmit.disabled = false;
          complaintSubmit.textContent = 'Enviar denúncia';
        }
      }
    });
  }

  if (complaintImage) {
    complaintImage.addEventListener('change', (e) => {
      const hasFile = e.target && e.target.files && e.target.files.length > 0;
      if (hasFile) {
        try { window.showToast && window.showToast('Imagem anexada à denúncia!', 'success'); } catch(_) {}
        try {
          if (complaintImageLabel) {
            complaintImageLabel.classList.remove('field-error');
            const n = complaintImageLabel.nextElementSibling;
            if (n && n.classList && n.classList.contains('field-msg')) n.remove();
          }
        } catch(_){}
      }
    });
  }

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

    // linha com ícone do tipo + título
    const typeRow = document.createElement('div');
    typeRow.className = 'type-row';
    const typeIconEl = document.createElement('span');
    typeIconEl.className = 'material-symbols-outlined type-icon';
    typeIconEl.setAttribute('aria-hidden','true');
    typeIconEl.textContent = getTypeIcon(doc.tipo);
    typeRow.appendChild(typeIconEl);
    typeRow.appendChild(title);

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

    meta.appendChild(typeRow);
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

  // Portaria (alfanumérico): permitir letras, números e caracteres comuns
  const portariaInput = document.getElementById('portaria');
  if(portariaInput){
    portariaInput.setAttribute('inputmode','text');
    portariaInput.setAttribute('maxlength','40');
    portariaInput.addEventListener('input', function(){
      const val = portariaInput.value || '';
      // permite letras, números, espaço, hífen, ponto e barra
      portariaInput.value = val.replace(/[^A-Za-z0-9\-\.\/\s]/g,'').slice(0,40);
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
    const autor = document.getElementById('autor');
    const titulo = document.getElementById('titulo_conteudo');
    const tipo = document.getElementById('tipo_publicacao');
    const curso = document.getElementById('curso');
    const conteudo = document.getElementById('conteudo');
    const termo = document.getElementById('termo');
    const lblConteudo = document.querySelector('label[for="conteudo"]');
    const lblTermo = document.querySelector('label[for="termo"]');

    // Asterisco vermelho nos campos obrigatórios e feedback de ausência
    function labelFor(id){ return document.querySelector(`label[for="${id}"]`); }
    const requiredIds = ['titulo_conteudo','tipo_publicacao','curso','orientador','captcha'];
    requiredIds.forEach((id)=>{
      const lbl = labelFor(id);
      if(lbl) lbl.classList.add('required');
      const el = document.getElementById(id);
      if(!el) return;
      // Mensagem personalizada e contorno vermelho
      el.addEventListener('blur', ()=>{
        const val = (el.value||'').trim();
        if(!val){
          if(lbl) lbl.classList.add('required-missing');
          el.classList.add('field-error');
          showFieldError(el, 'Campo obrigatório.');
        }
      });
      // Limpa o erro ao digitar/selecionar
      const clear = ()=>{
        const val = (el.value||'').trim();
        if(val){
          if(lbl) lbl.classList.remove('required-missing');
          el.classList.remove('field-error');
          clearFieldError(el);
        }
      };
      el.addEventListener('input', clear);
      el.addEventListener('change', clear);
    });
    // Arquivos obrigatórios: mostram asterisco nas labels
    if(lblConteudo) lblConteudo.classList.add('required');
    if(lblTermo) lblTermo.classList.add('required');

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

    // helpers de erro visual (contorno vermelho + mensagem próxima ao campo)
    function showFieldError(el, msg){
      try{
        if(!el) return;
        el.classList.add('field-error');
        const id = el.id || Math.random().toString(36).slice(2);
        const container = el.parentElement || publicacaoForm;
        let msgEl = container.querySelector(`.field-msg.error[data-for="${id}"]`);
        if(!msgEl){
          msgEl = document.createElement('div');
          msgEl.className = 'field-msg error';
          msgEl.setAttribute('data-for', id);
          msgEl.style.color = '#dc2626';
          msgEl.style.fontSize = '12px';
          msgEl.style.marginTop = '4px';
          container.appendChild(msgEl);
        }
        msgEl.textContent = msg || 'Verifique este campo.';
      }catch(_){ /* noop */ }
    }
    function clearFieldError(el){
      try{
        if(!el) return;
        el.classList.remove('field-error');
        const id = el.id || '';
        const container = el.parentElement || publicacaoForm;
        const msgEl = id ? container.querySelector(`.field-msg.error[data-for="${id}"]`) : null;
        if(msgEl && msgEl.remove) msgEl.remove();
      }catch(_){ /* noop */ }
    }
    function showLabelError(lbl, msg){
      try{
        if(!lbl) return;
        lbl.classList.add('field-error');
        let msgEl = lbl.nextElementSibling && lbl.nextElementSibling.classList && lbl.nextElementSibling.classList.contains('field-msg') ? lbl.nextElementSibling : null;
        if(!msgEl){
          msgEl = document.createElement('div');
          msgEl.className = 'field-msg error';
          msgEl.style.color = '#dc2626';
          msgEl.style.fontSize = '12px';
          msgEl.style.marginTop = '4px';
          lbl.parentElement && lbl.parentElement.appendChild(msgEl);
        }
        msgEl.textContent = msg || 'Campo obrigatório.';
      }catch(_){ }
    }
    function clearLabelError(lbl){
      try{
        if(!lbl) return;
        lbl.classList.remove('field-error');
        const sib = lbl.nextElementSibling;
        if(sib && sib.classList && sib.classList.contains('field-msg')) sib.remove();
      }catch(_){ }
    }

    // limpar erro quando o usuário altera o valor
    [titulo,tipo,document.getElementById('curso'),document.getElementById('orientador'),document.getElementById('captcha')]
      .filter(Boolean).forEach(el=>{
        el.addEventListener('input', ()=>clearFieldError(el));
        el.addEventListener('change', ()=>clearFieldError(el));
      });
    if(conteudo && lblConteudo){ conteudo.addEventListener('change', ()=>{ clearLabelError(lblConteudo); updateLabel(conteudo,lblConteudo); }); }
    if(termo && lblTermo){ termo.addEventListener('change', ()=>{ clearLabelError(lblTermo); updateLabel(termo,lblTermo); }); }

    publicacaoForm.addEventListener('submit', async function(ev){
      ev.preventDefault();
      const curso = document.getElementById('curso');
      const orientador = document.getElementById('orientador');
      const captcha = document.getElementById('captcha');

      // Validações personalizadas
      if(autor && !autor.value.trim()){
        showFieldError(autor, 'Informe o autor do conteúdo.');
        autor.focus();
        window.showToast && window.showToast('Informe o autor do conteúdo.', 'error');
        return;
      }
      if(titulo && !titulo.value.trim()){
        showFieldError(titulo, 'Informe o título da publicação.');
        titulo.focus();
        window.showToast && window.showToast('Informe o título da publicação.', 'error');
        return;
      }
      if(tipo && !tipo.value.trim()){
        showFieldError(tipo, 'Selecione o tipo da publicação.');
        tipo.focus();
        window.showToast && window.showToast('Informe o tipo da publicação.', 'error');
        return;
      }
      if(curso && !curso.value.trim()){
        showFieldError(curso, 'Selecione o curso.');
        curso.focus();
        window.showToast && window.showToast('Informe o curso.', 'error');
        return;
      }
      if(orientador && !orientador.value.trim()){
        showFieldError(orientador, 'Selecione o orientador/professor.');
        orientador.focus();
        window.showToast && window.showToast('Selecione o orientador (perfil Professor).', 'error');
        return;
      }
      if(captcha && !String(captcha.value||'').trim()){
        showFieldError(captcha, 'Resolva o captcha para continuar.');
        captcha.focus();
        window.showToast && window.showToast('Resolva o captcha para continuar.', 'error');
        return;
      }
      // arquivos obrigatórios: conteúdo e termo
      if(conteudo){
        const f = conteudo.files && conteudo.files[0];
        if(!f){
          showLabelError(lblConteudo, 'Anexe o arquivo de conteúdo.');
          window.showToast && window.showToast('Anexe o arquivo de conteúdo para publicar.', 'error');
          return;
        }
        const ext = getExt(f.name);
        if(!ALLOW_EXT.has(ext)){
          showLabelError(lblConteudo, 'Tipo de arquivo não permitido.');
          window.showToast && window.showToast('Tipo de arquivo não permitido.', 'error');
          return;
        }
      }
      if(termo){
        const ft = termo.files && termo.files[0];
        if(!ft){
          showLabelError(lblTermo, 'Anexe o termo de autorização.');
          window.showToast && window.showToast('Anexe o termo de autorização.', 'error');
          return;
        }
        const ext2 = getExt(ft.name);
        if(!ALLOW_EXT.has(ext2)){
          showLabelError(lblTermo, 'Tipo de arquivo do termo não permitido.');
          window.showToast && window.showToast('Tipo de arquivo do termo não permitido.', 'error');
          return;
        }
      }

      // submissão AJAX para não limpar a tela em caso de erro
      try{
        const fd = new FormData(publicacaoForm);
        let req = fetch('/publicacao', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (window.ProgressOverlay) {
          req = window.ProgressOverlay.attachToPromise(req, { msg: 'Enviando publicação...' });
        }
        const resp = await req;
        const ct = resp.headers.get('Content-Type')||'';
        let data = null;
        if(ct.includes('application/json')){
          data = await resp.json().catch(()=>null);
        } else {
          // Fallback: tenta ler texto
          const text = await resp.text().catch(()=> '');
          data = null;
          if(!resp.ok){
            throw new Error('Falha ao enviar a publicação.');
          }
        }
        if(!resp.ok || (data && data.ok === false)){
          const field = data && data.field;
          const message = (data && data.message) || 'Verifique os campos e tente novamente.';
          window.showToast && window.showToast(message, 'error');
          // destaca campo específico sem limpar tela
          const map = {
            'autor': autor,
            'captcha': captcha,
            'titulo_conteudo': titulo,
            'tipo_publicacao': tipo,
            'curso': curso,
            'orientador': orientador
          };
          const target = map[field] || captcha || titulo;
          if(target){ showFieldError(target, message); target.focus(); }
          // arquivos
          if(field === 'conteudo'){ showLabelError(lblConteudo, message); }
          if(field === 'termo'){ showLabelError(lblTermo, message); }
          return;
        }
        // sucesso
        const msg = (data && data.message) || 'Publicação criada com sucesso!';
        window.showToast && window.showToast(msg, 'success');
        // fecha modal e mantém lista atual; opcionalmente limpar
        try{
          const modal = document.getElementById('pubCreateModal');
          if(modal){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }
        }catch(_){ }
      }catch(err){
        window.showToast && window.showToast('Falha ao enviar a publicação.', 'error');
      }
    });
  }
})();
// Tema: função global para aplicar claro/escuro
if (typeof window !== 'undefined' && !window.applyTheme) {
  window.applyTheme = function(theme){
    try {
      const root = document.documentElement;
      if(theme === 'escuro'){
        root.classList.add('theme-dark');
        localStorage.setItem('preferred_theme','escuro');
      } else {
        root.classList.remove('theme-dark');
        localStorage.setItem('preferred_theme','claro');
      }
    } catch(e) {}
  };
  // aplica tema salvo/local ou vindo da sessão
  (function(){
    const sessTheme = (typeof window !== 'undefined' ? (window.USER_THEME || '') : '');
    const saved = localStorage.getItem('preferred_theme');
    const initial = (sessTheme || saved || 'claro');
    window.applyTheme(initial);
  })();
}

// Seletor de tema no menu lateral (único, discreto, sem alterar templates)

(function(){
  // não exibir seletor na tela de Administrador
  if (typeof USER_ROLE !== 'undefined' && USER_ROLE === 'Administrador') return;

  const sideMenu = document.getElementById('sideMenu');
  if(!sideMenu) return;
  // evita inserir duplicado
  if (document.getElementById('sideThemeSelect')) return;

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';
  wrap.style.margin = '12px 16px';

  const label = document.createElement('label');
  label.setAttribute('for','sideThemeSelect');
  label.textContent = 'Tema';
  label.style.fontSize = '12px';
  label.style.color = '#64748b';

  const select = document.createElement('select');
  select.id = 'sideThemeSelect';
  select.setAttribute('aria-label','Selecionar tema');
  select.innerHTML = '<option value="claro">Claro</option><option value="escuro">Escuro</option>';
  try {
    const saved = localStorage.getItem('preferred_theme') || 'claro';
    select.value = (saved === 'escuro' ? 'escuro' : 'claro');
  } catch(e) { select.value = 'claro'; }
  select.addEventListener('change', function(){
    const val = select.value === 'escuro' ? 'escuro' : 'claro';
    if (window.applyTheme) window.applyTheme(val);
  });

  wrap.appendChild(label);
  wrap.appendChild(select);

  const footer = sideMenu.querySelector('footer');
  if (footer) {
    sideMenu.insertBefore(wrap, footer);
  } else {
    sideMenu.appendChild(wrap);
  }
})();
  // Mapeia tipo -> ícone (Material Symbols)
  function getTypeIcon(tipoRaw){
    const t = String(tipoRaw || '').toLowerCase();
    if(!t) return 'insert_drive_file';
    if(t.includes('artigo')) return 'article';
    if(t.includes('tcc')) return 'assignment';
    if(t.includes('monografia')) return 'menu_book';
    if(t.includes('disserta')) return 'menu_book';
    if(t.includes('tese')) return 'menu_book';
    if(t.includes('relat')) return 'summarize';
    if(t.includes('resumo')) return 'notes';
    if(t.includes('projeto') || t.includes('plano')) return 'assignment';
    return 'insert_drive_file';
  }
