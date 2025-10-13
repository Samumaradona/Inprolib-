document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const senha = document.getElementById('senha');
  form.addEventListener('submit', (e) => {
    const okEmail = /.+@.+\..+/.test((email.value||'').trim());
    const okSenha = !!(senha.value||'').trim();
    if (!okEmail || !okSenha) {
      e.preventDefault();
      alert('Informe um e-mail válido e sua senha.');
    }
  });
});