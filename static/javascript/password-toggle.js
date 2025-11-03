document.addEventListener('DOMContentLoaded', () => {
  function initPasswordToggle(root = document){
    const toggles = root.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
      const targetId = toggle.getAttribute('data-target');
      const input = targetId ? root.getElementById(targetId) : toggle.closest('.password-wrapper')?.querySelector('input[type="password"], input[type="text"]');
      if(!input) return;

      function setVisible(visible){
        input.type = visible ? 'text' : 'password';
        const svgUse = toggle.querySelector('use');
        if(svgUse){ svgUse.setAttribute('href', visible ? '#icon-eye-off' : '#icon-eye'); }
        const label = visible ? 'Ocultar senha (solte para ocultar)' : 'Pressione para ver senha';
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
      }

      // Press-and-hold behavior
      const onMouseDown = (e)=>{ e.preventDefault(); setVisible(true); };
      const onMouseUp = ()=> setVisible(false);
      const onMouseLeave = ()=> setVisible(false);
      const onTouchStart = (e)=>{ setVisible(true); };
      const onTouchEnd = ()=> setVisible(false);
      const onKeyDown = (e)=>{ if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); setVisible(true); } };
      const onKeyUp = (e)=>{ if(e.key === ' ' || e.key === 'Enter'){ setVisible(false); } };

      toggle.addEventListener('mousedown', onMouseDown);
      toggle.addEventListener('mouseup', onMouseUp);
      toggle.addEventListener('mouseleave', onMouseLeave);
      toggle.addEventListener('touchstart', onTouchStart, { passive: true });
      toggle.addEventListener('touchend', onTouchEnd);
      toggle.addEventListener('keydown', onKeyDown);
      toggle.addEventListener('keyup', onKeyUp);

      // initial state
      setVisible(false);
    });
  }

  // Inject SVG icons sprite once
  if(!document.getElementById('password-toggle-icons')){
    const sprite = document.createElement('div');
    sprite.id = 'password-toggle-icons';
    sprite.style.display = 'none';
    sprite.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <!-- Modern eye icon -->
        <symbol id="icon-eye" viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.9 7.4 1 12c1.9 4.6 6 7.5 11 7.5s9.1-2.9 11-7.5C21.1 7.4 17 4.5 12 4.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" fill="currentColor"/>
        </symbol>
        <!-- Modern eye-off icon -->
        <symbol id="icon-eye-off" viewBox="0 0 24 24">
          <path d="M2.1 3.5 3.5 2.1 21.9 20.5 20.5 21.9l-3-3C15.9 20 14 20.5 12 20.5 7 20.5 2.9 17.6 1 13c.9-2.1 2.3-3.9 4-5.2l3 3A4.5 4.5 0 0 0 12 16.5c.7 0 1.4-.2 2-.5l-2.7-2.7a3 3 0 1 1-4.2-4.2L5.2 6.1c2.1-1.3 4.6-2.1 6.8-2.1 5 0 9.1 2.9 11 7.5-.8 2-2 3.7-3.5 5.1l-2.1-2.1" fill="currentColor"/>
        </symbol>
      </svg>
    `;
    document.body.appendChild(sprite);
  }

  initPasswordToggle(document);
  window.initPasswordToggle = initPasswordToggle;
});