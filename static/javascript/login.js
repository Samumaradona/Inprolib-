document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const cpfInput = document.getElementById('cpf');
  const cepInput = document.getElementById('cep_user');
  const senhaInput = document.getElementById('senha');
  const rememberMe = document.getElementById('rememberMe');
  const cepFeedback = document.getElementById('cepFeedback');
  const logradouroInput = document.getElementById('logradouro');
  const complementoInput = document.getElementById('complemento');
  const bairroInput = document.getElementById('bairro');
  const cidadeInput = document.getElementById('cidade');
  const estadoInput = document.getElementById('estado');

  function maskCPF(v) {
    return v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function maskCEP(v) {
    return v.replace(/\D/g, '').slice(0, 8)
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  function validarCPF(cpf) {
    const s = cpf.replace(/\D/g, '');
    if (s.length !== 11 || /^([0-9])\1{10}$/.test(s)) return false;
    let soma = 0; for (let i = 0; i < 9; i++) soma += parseInt(s.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11); const d1 = resto > 9 ? 0 : resto;
    soma = 0; for (let i = 0; i < 10; i++) soma += parseInt(s.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11); const d2 = resto > 9 ? 0 : resto;
    return s.endsWith(`${d1}${d2}`);
  }

  function setFeedback(msg, type) {
    if (!cepFeedback) return;
    cepFeedback.textContent = msg || '';
    cepFeedback.style.color = type === 'success' ? '#166534' : '#b91c1c';
  }

  async function validateCEP() {
    const digits = (cepInput && cepInput.value || '').replace(/\D/g, '');
    if (!digits) { setFeedback('', ''); return; }
    if (digits.length !== 8) { setFeedback('Informe um CEP válido.', 'error'); return; }
    try {
      let data = null;
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (res.ok) data = await res.json();
      } catch (e) {}

      if (!data || data.erro) {
        try {
          const res2 = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
          if (res2.ok) {
            const d2 = await res2.json();
            data = {
              logradouro: d2.street || '',
              bairro: d2.neighborhood || '',
              localidade: d2.city || '',
              uf: d2.state || ''
            };
          }
        } catch (e) {}
      }

      if (data && !data.erro) {
        if (logradouroInput) logradouroInput.value = data.logradouro || '';
        if (bairroInput) bairroInput.value = data.bairro || '';
        if (cidadeInput) cidadeInput.value = data.localidade || '';
        if (estadoInput) estadoInput.value = (data.uf || '').toUpperCase();
        const desc = `${data.logradouro || ''} ${data.bairro || ''} - ${data.localidade || ''}/${data.uf || ''}`.trim();
        setFeedback(desc || 'Endereço preenchido pelo CEP.', 'success');
        if (cepInput) cepInput.dataset.valid = 'true';
      } else {
        setFeedback('CEP não encontrado.', 'error');
        if (cepInput) cepInput.dataset.valid = 'false';
      }
    } catch (e) {
      setFeedback('Erro ao validar CEP.', 'error');
      if (cepInput) cepInput.dataset.valid = 'false';
    }
  }

  cpfInput && cpfInput.addEventListener('input', () => { cpfInput.value = maskCPF(cpfInput.value); });
  let cepTypingTimer;
  if (cepInput) {
    cepInput.addEventListener('input', () => {
      cepInput.value = maskCEP(cepInput.value);
      const digits = cepInput.value.replace(/\D/g, '');
      if (digits.length === 8) {
        clearTimeout(cepTypingTimer);
        cepTypingTimer = setTimeout(() => {
          validateCEP();
        }, 250);
      } else {
        // CEP incompleto: limpar feedback e campos de endereço
        if (logradouroInput) logradouroInput.value = '';
        if (bairroInput) bairroInput.value = '';
        if (cidadeInput) cidadeInput.value = '';
        if (estadoInput) estadoInput.value = '';
        setFeedback('', '');
        if (cepInput) cepInput.dataset.valid = '';
      }
    });
    // Fallback: blur ainda valida (ex.: colar CEP completo e sair do campo)
    cepInput.addEventListener('blur', validateCEP);
  }

  // Lembrar CPF
  if (rememberMe && localStorage.getItem('rememberCPF') === '1') {
    const saved = localStorage.getItem('cpf');
    if (saved && cpfInput) cpfInput.value = saved;
    if (rememberMe) rememberMe.checked = true;
  }

  form && form.addEventListener('submit', (e) => {
    const cpfOk = validarCPF(cpfInput.value || '');
    const senhaOk = !!(senhaInput.value || '').trim();
    if (!cpfOk || !senhaOk) {
      e.preventDefault();
      const msg = !cpfOk ? 'CPF inválido.' : 'Informe sua senha.';
      if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
      return;
    }
    if (rememberMe && rememberMe.checked) {
      localStorage.setItem('rememberCPF', '1');
      localStorage.setItem('cpf', cpfInput.value || '');
    } else {
      localStorage.removeItem('rememberCPF');
      localStorage.removeItem('cpf');
    }
  });

  // Modal Cadastro de Aluno no Login — agora com formulário próprio
  const openAluno = document.getElementById('openAlunoModal');
  const alunoModal = document.getElementById('alunoModal');
  const closeAluno = document.getElementById('closeAlunoModal');
  const cadastroForm = document.getElementById('cadastroForm');
  const nomeUser = document.getElementById('nome_user');
  const cpfUser = document.getElementById('cpf_user');
  const emailUser = document.getElementById('email_user');
  const tipoUsuario = document.getElementById('tipo_usuario');
  const senhaNew = document.getElementById('senha_new');
  const senhaConf = document.getElementById('confirmar_senha');
  const captchaInput = document.getElementById('captcha');

  function openAlunoModal(e){
    if (e) e.preventDefault();
    if (alunoModal){
      alunoModal.setAttribute('aria-hidden','false');
      alunoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Foco inicial
      setTimeout(() => { if (nomeUser) nomeUser.focus(); }, 0);
    }
  }
  function closeAlunoModal(){
    if (alunoModal){
      alunoModal.setAttribute('aria-hidden','true');
      alunoModal.classList.remove('open');
      document.body.style.overflow = '';
      // Limpeza simples
      if (cadastroForm) cadastroForm.reset();
    }
  }

  openAluno && openAluno.addEventListener('click', openAlunoModal);
  closeAluno && closeAluno.addEventListener('click', closeAlunoModal);
  alunoModal && alunoModal.addEventListener('click', (ev)=>{ if(ev.target === alunoModal) closeAlunoModal(); });
  document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape' && alunoModal && alunoModal.classList.contains('open')) closeAlunoModal(); });

  // Máscara CPF no modal
  cpfUser && cpfUser.addEventListener('input', () => { cpfUser.value = maskCPF(cpfUser.value); });

  // Validação básica do formulário de cadastro
  cadastroForm && cadastroForm.addEventListener('submit', (e) => {
    const nomeOk = !!(nomeUser && nomeUser.value.trim());
    const cpfOk = validarCPF(cpfUser && cpfUser.value ? cpfUser.value : '');
    const emailOk = !!(emailUser && emailUser.value.includes('@') && emailUser.value.includes('.'));
    const senhaOk = !!(senhaNew && (senhaNew.value || '').length >= 8);
    const confOk = !!(senhaConf && (senhaConf.value || '') === (senhaNew ? senhaNew.value : ''));
    const captchaOk = !!(captchaInput && (captchaInput.value || '').trim());

    if (!nomeOk || !cpfOk || !emailOk || !senhaOk || !confOk || !captchaOk) {
      e.preventDefault();
      let msg = 'Preencha todos os campos corretamente.';
      if (!cpfOk) msg = 'CPF inválido.';
      else if (!emailOk) msg = 'E-mail inválido.';
      else if (!senhaOk) msg = 'A senha deve ter no mínimo 8 caracteres.';
      else if (!confOk) msg = 'As senhas não coincidem.';
      if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
      return;
    }
  });
});