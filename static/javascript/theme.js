(function(){
  if (typeof window === 'undefined') return;

  // Se já existir applyTheme (definido por home.js), reutiliza
  if (!window.applyTheme) {
    window.applyTheme = function(theme){
      try {
        const root = document.documentElement;
        if (theme === 'escuro') {
          root.classList.add('theme-dark');
          localStorage.setItem('preferred_theme','escuro');
        } else {
          root.classList.remove('theme-dark');
          localStorage.setItem('preferred_theme','claro');
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
})();