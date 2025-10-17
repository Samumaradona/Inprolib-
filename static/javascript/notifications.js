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

  function showToast(message, type = 'info', { timeout = 4000 } = {}) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    const t = TYPE_CLASSES[type] || 'info';
    toast.className = `toast ${t}`;
    toast.setAttribute('role', 'status');

    const icon = document.createElement('div');
    icon.className = 'icon material-symbols-outlined';
    icon.textContent = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');

    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = message;

    const close = document.createElement('button');
    close.className = 'close material-symbols-outlined';
    close.setAttribute('aria-label', 'Fechar notificação');
    close.textContent = 'close';
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

  function initFlashToasts() {
    try {
      if (Array.isArray(window.FLASH_MESSAGES)) {
        window.FLASH_MESSAGES.forEach(([category, message]) => {
          const type = category === 'success' ? 'success' : (category === 'error' ? 'error' : 'info');
          showToast(String(message), type);
        });
      }
    } catch (e) {
      console.warn('Falha ao inicializar toasts das mensagens flash:', e);
    }
  }

  // Expor globalmente
  window.showToast = showToast;
  window.initFlashToasts = initFlashToasts;
})();