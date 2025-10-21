document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const cpf = document.getElementById('cpf');
  const senha = document.getElementById('senha');
  const remember = document.getElementById('rememberMe');

  function onlyDigits(v){ return (v||'').replace(/[^0-9]/g,''); }
  function maskCPF(v){
    const d = onlyDigits(v).slice(0,11);
    let out = '';
    if (d.length > 0) out = d.substring(0,3);
    if (d.length >= 4) out += '.' + d.substring(3,6);
    if (d.length >= 7) out += '.' + d.substring(6,9);
    if (d.length >= 10) out += '-' + d.substring(9,11);
    return out;
  }

  if(cpf){
    cpf.setAttribute('inputmode','numeric');
    cpf.setAttribute('maxlength','14');
    cpf.addEventListener('input', () => { cpf.value = maskCPF(cpf.value); });
  }

  // Lembrar-me: guarda/restaura CPF localmente
  try {
    const saved = localStorage.getItem('login_cpf');
    if (saved && cpf) cpf.value = saved;
  } catch(e){}

  if(remember){
    remember.addEventListener('change', () => {
      try {
        if (remember.checked && cpf) localStorage.setItem('login_cpf', cpf.value);
        else localStorage.removeItem('login_cpf');
      } catch(e){}
    });
  }

  form && form.addEventListener('submit', (e) => {
    const okCPF = !!(cpf && onlyDigits(cpf.value).length === 11);
    const okSenha = !!(senha && (senha.value||'').trim());
    if (!okCPF || !okSenha) {
      e.preventDefault();
      if (window.showToast) { window.showToast('Informe um CPF válido e sua senha.', 'error'); }
      else { alert('Informe um CPF válido e sua senha.'); }
      return;
    }
    if (remember && remember.checked && cpf){
      try { localStorage.setItem('login_cpf', cpf.value); } catch(e){}
    }
  });
});