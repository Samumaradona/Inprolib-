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

  // Utilitários para marcar/limpar asterisco dinâmico nos labels
  function labelFor(id){ return document.querySelector(`label[for="${id}"]`); }
  function flagRequired(id){
    const lbl = labelFor(id); if(lbl) lbl.classList.add('required-missing');
    const el = document.getElementById(id); if(el) el.classList.add('field-error');
  }
  function clearRequired(id){
    const lbl = labelFor(id); if(lbl) lbl.classList.remove('required-missing');
    const el = document.getElementById(id); if(el) el.classList.remove('field-error');
  }

  // Limpa destaque ao preencher
  [nomeUser, cpfUser, emailUser, senhaReg, confirmarSenha, captchaInput].forEach((el)=>{
    if(!el) return;
    el.addEventListener('input', ()=>{ if((el.value||'').trim()) clearRequired(el.id); });
    el.addEventListener('blur', ()=>{ if((el.value||'').trim()) clearRequired(el.id); });
  });

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
      // Ao fechar sem concluir, limpar campos para novo cadastro
      resetRegisterForm();
    }
  }

  // Limpa todo o formulário de cadastro
  function resetRegisterForm(){
    try{
      if(registerForm){
        registerForm.reset();
      }
      // Campos que podem reter valores por scripts auxiliares
      if(nomeUser) nomeUser.value = '';
      if(cpfUser) cpfUser.value = '';
      if(emailUser) emailUser.value = '';
      if(tipoUsuario){ tipoUsuario.value = 'Aluno'; }
      if(cepInput) cepInput.value = '';
      if(logradouro) logradouro.value = '';
      if(complemento) complemento.value = '';
      if(bairro) bairro.value = '';
      if(cidade) cidade.value = '';
      if(estado) estado.value = '';
      if(senhaReg) senhaReg.value = '';
      if(confirmarSenha) confirmarSenha.value = '';
      if(captchaInput) captchaInput.value = '';
      // Limpa destaques de campos obrigatórios
      ['nome_user','cpf_user','email_user','senha_reg','confirmar_senha','captcha'].forEach(clearRequired);
      // Remover toasts existentes
      window.clearToasts && window.clearToasts();
    }catch(e){ /* noop */ }
  }

  // Removido contador de caracteres do campo Nome conforme solicitação

  if(openRegister){
    openRegister.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); });
  }
  if(closeRegister){
    closeRegister.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
  }
  if(btnCloseRegister){
    btnCloseRegister.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
  }

  // Abrir modal automaticamente quando vier de redirecionamento de erro de cadastro
  try {
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get('register');
    const errField = (params.get('err')||'').trim();
    if (shouldOpen) {
      openModal();
      // Mapear campo de erro para destacar borda em vermelho
      const fieldMap = {
        'captcha': 'captcha',
        'email': 'email_user',
        'email_len': 'email_user',
        'email_dup': 'email_user',
        'cpf': 'cpf_user',
        'cpf_dup': 'cpf_user',
        'pwd': 'senha_reg',
        'senha_match': 'confirmar_senha',
        'required': 'nome_user',
        'error': 'captcha'
      };
      const targetId = fieldMap[errField] || 'captcha';
      flagRequired(targetId);
      const targetEl = document.getElementById(targetId);
      targetEl && targetEl.focus();
      // Limpar parâmetros da URL para evitar reabertura ao recarregar
      const url = new URL(window.location);
      url.searchParams.delete('register');
      url.searchParams.delete('err');
      window.history.replaceState({}, '', url);
    }
  } catch (_) { /* noop */ }

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

  // Política de senha: 8–16 com maiúscula, minúscula, número e símbolo
  function senhaForte(s){
    const v = (s||'').trim();
    if(v.length < 8 || v.length > 16) return false;
    return (
      /[A-Z]/.test(v) &&
      /[a-z]/.test(v) &&
      /\d/.test(v) &&
      /[^A-Za-z0-9]/.test(v)
    );
  }

  registerForm && registerForm.addEventListener('submit', async (e)=>{
    const nomeVal = (nomeUser && nomeUser.value || '').trim();
    const cpfVal = cpfUser && cpfUser.value || '';
    const emailVal = (emailUser && emailUser.value || '').trim();
    const senhaVal = senhaReg && senhaReg.value || '';
    const confirmVal = confirmarSenha && confirmarSenha.value || '';
    const captchaVal = (captchaInput && captchaInput.value || '').trim();
    const cepDigits = cepInput ? onlyDigits(cepInput.value) : '';

    // Primeira regra: nenhum campo obrigatório pode ficar em branco
    const missing = [];
    if(!nomeVal) missing.push('nome_user');
    if(!cpfVal) missing.push('cpf_user');
    if(!emailVal) missing.push('email_user');
    if(!senhaVal) missing.push('senha_reg');
    if(!confirmVal) missing.push('confirmar_senha');
    if(!captchaVal) missing.push('captcha');
    if(missing.length){
      e.preventDefault();
      missing.forEach(flagRequired);
      if(window.showToast) window.showToast('Não pode faltar nenhum campo sem preenchimento.', 'error');
      (document.getElementById(missing[0])||nomeUser)?.focus();
      return;
    }

    // Campo por campo, mostra erro específico e foca o campo
    if(!nomeVal){ e.preventDefault(); window.showToast && window.showToast('error','Informe seu nome completo.'); nomeUser && nomeUser.focus(); return; }
    if(!validarCPF(cpfVal)){ e.preventDefault(); window.showToast && window.showToast('error','CPF inválido.'); cpfUser && cpfUser.focus(); return; }
    if(!emailValido(emailVal)){ e.preventDefault(); window.showToast && window.showToast('error','E-mail inválido. Ex.: usuario@dominio.com'); emailUser && emailUser.focus(); return; }
    if(emailVal.length > 40){ e.preventDefault(); window.showToast && window.showToast('error','E-mail deve ter no máximo 40 caracteres.'); emailUser && emailUser.focus(); return; }
    if(!senhaForte(senhaVal)){ e.preventDefault(); window.showToast && window.showToast('error','A senha deve ter entre 8 e 16 caracteres, com maiúscula, minúscula, número e símbolo.'); senhaReg && senhaReg.focus(); return; }
    if(confirmVal !== senhaVal){ e.preventDefault(); window.showToast && window.showToast('error','A confirmação de senha não coincide.'); confirmarSenha && confirmarSenha.focus(); return; }
    if(!captchaVal){ e.preventDefault(); window.showToast && window.showToast('error','Resolva o captcha para continuar.'); captchaInput && captchaInput.focus(); return; }
    if(cepDigits && cepDigits.length !== 8){ e.preventDefault(); window.showToast && window.showToast('error','CEP deve ter 8 dígitos (00000-000).'); cepInput && cepInput.focus(); return; }

    // Se tudo ok: enviar via AJAX para não perder valores em caso de erro
    e.preventDefault();
    try{
      const formData = new URLSearchParams(new FormData(registerForm));
      // garante action=create
      formData.set('action','create');
      const resp = await fetch('/cadastro_alunos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData.toString()
      });
      const data = await resp.json().catch(()=>({ ok:false, message:'Erro inesperado.' }));
      if (resp.ok && data && data.ok){
        window.showToast && window.showToast('Usuário cadastrado com sucesso!', 'success');
        // pequeno delay para o usuário perceber o sucesso
        setTimeout(()=>{ window.location.href = (data.redirect || '/login'); }, 600);
        return;
      }
      // Erro: manter valores e destacar campo
      const msg = (data && data.message) || 'Verifique os campos informados.';
      const field = (data && data.field) || 'captcha';
      window.showToast && window.showToast(msg, 'error');
      // Zera apenas o campo com erro para o usuário preencher corretamente
      try{
        const el = document.getElementById(field);
        if(el){ el.value = ''; }
      }catch(_){ /* noop */ }
      flagRequired(field);
      (document.getElementById(field)||captchaInput||nomeUser)?.focus();
    }catch(_e){
      window.showToast && window.showToast('Falha ao enviar cadastro. Tente novamente.', 'error');
    }
  });
  // Validação em tempo real ao sair do campo (blur)
  [['nome_user', v=>!!(v||'').trim()],
   ['cpf_user', validarCPF],
   ['email_user', v=>emailValido(v) && (v||'').trim().length <= 40],
   ['senha_reg', senhaForte],
   ['confirmar_senha', v=>v === (senhaReg && senhaReg.value || '') && senhaForte(v)],
   ['captcha', v=>!!(v||'').trim()]
  ].forEach(([id,fn])=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('blur', ()=>{
      const ok = fn(el.value||'');
      if(!ok){ flagRequired(id); } else { clearRequired(id); }
    });
    el.addEventListener('input', ()=>{ clearRequired(id); });
  });

  // Password toggle: deixamos para o módulo global password-toggle.js
});