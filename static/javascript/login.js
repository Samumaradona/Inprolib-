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
  function maskCEP(v){
    const d = onlyDigits(v).slice(0,8);
    let out = '';
    if (d.length > 0) out = d.substring(0,5);
    if (d.length >= 6) out += '-' + d.substring(5,8);
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

  // ===== Modal de cadastro =====
  const openRegister = document.getElementById('openRegister');
  const registerModal = document.getElementById('registerModal');
  const closeRegister = document.getElementById('closeRegister');
  const btnCloseRegister = document.getElementById('btnCloseRegister');
  const registerForm = document.getElementById('registerForm');

  const nomeUser = document.getElementById('nome_user');
  const cpfUser = document.getElementById('cpf_user');
  const emailUser = document.getElementById('email_user');
  const tipoUsuario = document.getElementById('tipo_usuario');
  const senhaReg = document.getElementById('senha_reg');
  const confirmarSenha = document.getElementById('confirmar_senha');
  const captchaInput = document.getElementById('captcha');

  // Endereço
  const cepInput = document.getElementById('cep_user');
  const logradouro = document.getElementById('logradouro');
  const complemento = document.getElementById('complemento');
  const bairro = document.getElementById('bairro');
  const cidade = document.getElementById('cidade');
  const estado = document.getElementById('estado');
  const API_CEP_URL = '/api/cep/';

  function openModal(){
    if(registerModal){
      registerModal.classList.add('open');
      registerModal.setAttribute('aria-hidden', 'false');
      setTimeout(()=>{ nomeUser && nomeUser.focus(); }, 0);
    }
  }
  function closeModal(){
    if(registerModal){
      registerModal.classList.remove('open');
      registerModal.setAttribute('aria-hidden', 'true');
    }
  }

  if(openRegister){
    openRegister.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); });
  }
  if(closeRegister){
    closeRegister.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
  }
  if(btnCloseRegister){
    btnCloseRegister.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
  }

  // Máscara de CPF no modal
  if(cpfUser){
    cpfUser.setAttribute('inputmode','numeric');
    cpfUser.setAttribute('maxlength','14');
    cpfUser.addEventListener('input', () => { cpfUser.value = maskCPF(cpfUser.value); });
  }

  // Máscara e busca de CEP
  async function buscarCEP(digits){
    try{
      const r = await fetch(`${API_CEP_URL}${digits}`);
      const data = await r.json();
      if (data && !data.erro){
        if (logradouro) logradouro.value = data.logradouro || '';
        if (bairro) bairro.value = data.bairro || '';
        if (cidade) cidade.value = data.localidade || '';
        if (estado) estado.value = (data.uf || '').toUpperCase();
        if (data.complemento && complemento) complemento.value = data.complemento;
      } else {
        if (window.showToast) window.showToast('CEP não encontrado.', 'error');
      }
    }catch(_){
      if (window.showToast) window.showToast('Falha ao consultar CEP.', 'error');
    }
  }
  if(cepInput){
    cepInput.setAttribute('inputmode','numeric');
    cepInput.setAttribute('maxlength','9');
    cepInput.addEventListener('input', () => { cepInput.value = maskCEP(cepInput.value); });
    cepInput.addEventListener('blur', () => {
      const d = onlyDigits(cepInput.value);
      if (d.length === 8){ buscarCEP(d); }
      else if (d.length > 0){ if (window.showToast) window.showToast('CEP deve ter 8 dígitos.', 'error'); }
    });
  }

  // Validações simples no modal
  function validarCPF(cpf){
    cpf = (cpf||'').replace(/[^0-9]/g,'');
    if(cpf.length !== 11 || /(\d)\1{10}/.test(cpf)) return false;
    let soma=0; for(let i=0;i<9;i++) soma+=parseInt(cpf[i])*(10-i);
    let resto = 11 - (soma % 11); let d1 = resto >= 10 ? 0 : resto;
    soma=0; for(let i=0;i<10;i++) soma+=parseInt(cpf[i])*(11-i);
    resto = 11 - (soma % 11); let d2 = resto >= 10 ? 0 : resto;
    return cpf.slice(9) === `${d1}${d2}`;
  }
  function emailValido(e){ return /.+@.+\..+/.test(e); }

  registerForm && registerForm.addEventListener('submit', (e)=>{
    const nomeOk = !!(nomeUser && (nomeUser.value||'').trim());
    const cpfOk = !!(cpfUser && validarCPF(cpfUser.value));
    const emailOk = !!(emailUser && emailValido(emailUser.value));
    const senhaOk = !!(senhaReg && (senhaReg.value||'').length >= 8);
    const confirmarOk = !!(confirmarSenha && confirmarSenha.value === (senhaReg? senhaReg.value : ''));
    const captchaOk = !!(captchaInput && (captchaInput.value||'').trim());
    const cepDigits = cepInput ? onlyDigits(cepInput.value) : '';
    const cepOk = !cepInput || cepDigits.length === 0 || cepDigits.length === 8; // se preencher, exige 8 dígitos

    if(!nomeOk || !cpfOk || !emailOk || !senhaOk || !confirmarOk || !captchaOk || !cepOk){
      e.preventDefault();
      if(window.showToast){ window.showToast('Verifique os campos do cadastro.', 'error'); }
      else { alert('Verifique os campos do cadastro.'); }
      return;
    }
    // Sem AJAX: deixa o submit seguir para backend que já envia flash/redirect.
  });
});