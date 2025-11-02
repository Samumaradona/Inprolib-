'use strict';
(function () {
  const TYPE_CLASSES = { success: 'success', error: 'error', info: 'info' };

  function ensureContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    return container;
  }

  // Accept both call styles: showToast(message, type) and showToast(type, message)
  function showToast(arg1, arg2 = 'info', { timeout = 4000 } = {}) {
    let message = arg1;
    let type = arg2;
    const KNOWN = ['success','error','info'];
    if (KNOWN.includes(String(arg1))) {
      type = arg1;
      message = arg2;
    }
    // Guard against empty messages
    if (typeof message !== 'string' || message.trim().length === 0) {
      return null;
    }

    const container = ensureContainer();
    const toast = document.createElement('div');
    const t = TYPE_CLASSES[type] || 'info';
    toast.className = `toast ${t}`;
    toast.setAttribute('role', 'status');

    const icon = document.createElement('div');
    icon.className = 'icon';
    // Ícones inline (SVG) para evitar dependência de fontes externas
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.2-4.2-4.2 1.4-1.4L11 13.4l4.8-4.8 1.4 1.4L11 16.2z" fill="currentColor"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 13h-2v2h2v-2zm0-8h-2v6h2V7z" fill="currentColor"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM13 18h-2v-7h2v7z" fill="currentColor"/></svg>'
    };
    icon.innerHTML = icons[t] || icons.info;

    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = message;

    const close = document.createElement('button');
    close.className = 'close';
    close.setAttribute('aria-label', 'Fechar notificação');
    close.setAttribute('type', 'button');
    // Usa o símbolo × para fechar, evitando fontes externas
    close.textContent = '×';
    close.addEventListener('click', () => removeToast(toast));

    toast.appendChild(icon);
    toast.appendChild(msg);
    toast.appendChild(close);
    container.appendChild(toast);

    if (timeout && Number.isFinite(timeout)) {
      setTimeout(() => removeToast(toast), timeout);
    }
    return toast;
  }

  function removeToast(toast) {
    toast.style.animation = 'toast-out .18s ease-out forwards';
    setTimeout(() => toast.parentElement && toast.parentElement.removeChild(toast), 180);
  }

  // Remove todas as notificações atuais para evitar mensagens embaralhadas/duplicadas
  function clearToasts() {
    const container = document.getElementById('toastContainer');
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  }

  function initFlashToasts() {
    try {
      const raw = Array.isArray(window.FLASH_MESSAGES) ? window.FLASH_MESSAGES : [];
      const filtered = raw.filter((item) => {
        const message = Array.isArray(item) ? item[1] : (item && item.message);
        return typeof message === 'string' && message.trim().length > 0;
      });

      const seen = new Set();
      filtered.forEach((item) => {
        const category = Array.isArray(item) ? item[0] : (item && item.category) || 'info';
        const message = Array.isArray(item) ? item[1] : (item && item.message) || '';
        const key = `${category}:${String(message).trim()}`;
        if (seen.has(key)) return;
        seen.add(key);
        const type = category === 'success' ? 'success' : (category === 'error' ? 'error' : 'info');
        showToast(message, type);
      });
    } catch (e) {
      console.warn('Falha ao inicializar toasts das mensagens flash:', e);
    }
  }

  window.showToast = showToast;
  window.initFlashToasts = initFlashToasts;
  window.clearToasts = clearToasts;
})();