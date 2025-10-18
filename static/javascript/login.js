document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const cpfInput = document.getElementById('cpf');
  const cepInput = document.getElementById('cep');
  const senhaInput = document.getElementById('senha');
  const rememberMe = document.getElementById('rememberMe');
  const cepFeedback = document.getElementById('cepFeedback');

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
    const digits = (cepInput.value || '').replace(/\D/g, '');
    if (!digits) { setFeedback('', ''); return; }
    if (digits.length !== 8) { setFeedback('Informe um CEP válido.', 'error'); return; }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setFeedback('CEP não encontrado.', 'error');
        cepInput.dataset.valid = 'false';
      } else {
        const desc = `${data.logradouro || ''} ${data.bairro || ''} - ${data.localidade || ''}/${data.uf || ''}`.trim();
        setFeedback(desc, 'success');
        cepInput.dataset.valid = 'true';
      }
    } catch (e) {
      setFeedback('Erro ao validar CEP.', 'error');
      cepInput.dataset.valid = 'false';
    }
  }

  cpfInput && cpfInput.addEventListener('input', () => { cpfInput.value = maskCPF(cpfInput.value); });
  cepInput && cepInput.addEventListener('input', () => { cepInput.value = maskCEP(cepInput.value); });
  cepInput && cepInput.addEventListener('blur', validateCEP);

  // Lembrar CPF
  if (rememberMe && localStorage.getItem('rememberCPF') === '1') {
    const saved = localStorage.getItem('cpf');
    if (saved && cpfInput) cpfInput.value = saved;
    rememberMe.checked = true;
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

  // Modal Cadastro de Aluno no Login
  const openAluno = document.getElementById('openAlunoModal');
  const alunoModal = document.getElementById('alunoModal');
  const closeAluno = document.getElementById('closeAlunoModal');
  const alunoFrame = document.getElementById('alunoFrame');

  function openAlunoModal(e){
    if (e) e.preventDefault();
    if (alunoModal){
      alunoModal.setAttribute('aria-hidden','false');
      alunoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (alunoFrame) alunoFrame.src = '/cadastro_alunos';
    }
  }
  function closeAlunoModal(){
    if (alunoModal){
      alunoModal.setAttribute('aria-hidden','true');
      alunoModal.classList.remove('open');
      document.body.style.overflow = '';
      if (alunoFrame) alunoFrame.src = '';
    }
  }

  openAluno && openAluno.addEventListener('click', openAlunoModal);
  closeAluno && closeAluno.addEventListener('click', closeAlunoModal);
  alunoModal && alunoModal.addEventListener('click', (ev)=>{ if(ev.target === alunoModal) closeAlunoModal(); });
  document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape' && alunoModal && alunoModal.classList.contains('open')) closeAlunoModal(); });
});