(function(){
  if (typeof window === 'undefined') return;

  // Injeta meta tags mobile/PWA e atualiza theme-color conforme tema
  (function ensureMobileMeta(){
    try{
      const head = document.head;
      const ensure = (name, content) => {
        let m = head.querySelector(`meta[name="${name}"]`);
        if(!m){ m = document.createElement('meta'); m.setAttribute('name', name); head.appendChild(m); }
        m.setAttribute('content', content);
      };
      ensure('format-detection','telephone=no');
      ensure('apple-mobile-web-app-capable','yes');
      ensure('apple-mobile-web-app-status-bar-style','default');
      // theme-color será atualizado no applyTheme
      if(!head.querySelector('meta[name="theme-color"]')){
        const m = document.createElement('meta');
        m.setAttribute('name','theme-color');
        m.setAttribute('content','#ffffff');
        head.appendChild(m);
      }
    }catch(e){ /* noop */ }
  })();

  // Se já existir applyTheme (definido por home.js), reutiliza
  if (!window.applyTheme) {
    window.applyTheme = function(theme){
      try {
        const root = document.documentElement;
        if (theme === 'escuro') {
          root.classList.add('theme-dark');
          localStorage.setItem('preferred_theme','escuro');
          const meta = document.querySelector('meta[name="theme-color"]');
          if(meta) meta.setAttribute('content','#0f172a');
        } else {
          root.classList.remove('theme-dark');
          localStorage.setItem('preferred_theme','claro');
          const meta = document.querySelector('meta[name="theme-color"]');
          if(meta) meta.setAttribute('content','#ffffff');
        }
      } catch(e) {}
    };
  }

  // Inicializa tema a partir da sessão (se houver) ou do localStorage
  try {
    const sessTheme = (typeof window.USER_THEME !== 'undefined') ? window.USER_THEME : '';
    const saved = localStorage.getItem('preferred_theme');
    const initial = sessTheme || saved || 'claro';
    window.applyTheme(initial);
  } catch(e) {
    window.applyTheme('claro');
  }

  // Carrega polyfills leves (se necessário)
  (function loadPolyfills(){
    try{
      const needClosest = !Element.prototype.closest;
      const needAbort = (typeof window.AbortController === 'undefined');
      const needAssign = typeof Object.assign !== 'function';
      if(needClosest || needAbort || needAssign){
        const s = document.createElement('script');
        s.src = 'javascript/polyfills.js?v=1';
        s.defer = true;
        document.head.appendChild(s);
      }
    }catch(_){ /* noop */ }
  })();
})();