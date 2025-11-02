// Avaliação — modal para adicionar/editar, filtros e contador
// IIFE 1: controle do modal
(function(){
  const modal = document.getElementById('avModal');
  const btnClose = document.getElementById('avModalClose');
  const form = document.getElementById('avForm');
  const nomeInput = document.getElementById('nome');
  const tituloInput = document.getElementById('titulo_conteudo');
  const avaliacaoInput = document.getElementById('avaliacao');

  function openModal(prefill){
    if(!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
    if(prefill){
      try{
        if(nomeInput) nomeInput.value = prefill.autor || '';
        if(tituloInput) tituloInput.value = prefill.titulo || '';
        if(avaliacaoInput) avaliacaoInput.value = prefill.avaliacao || '';
      }catch(e){ /* noop */ }
    }
  }
  window.openAvModal = openModal;

  function closeModal(){
    if(!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
  }

  if(btnClose){ btnClose.addEventListener('click', closeModal); }
  if(modal){
    modal.addEventListener('click', (ev)=>{
      if(ev.target === modal){ closeModal(); }
    });
  }
  document.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Escape' && modal && modal.style.display !== 'none'){
      closeModal();
    }
  });
})();

// IIFE 2: extensões de UI (toolbar, filtros, ações)
(function(){
  const openBtn = document.getElementById('btnOpenAvModal');
  if(openBtn){
    openBtn.addEventListener('click', ()=>{
      try{ window.openAvModal && window.openAvModal({}); }catch(e){ /* noop */ }
    });
  }

  function bindRowActions(){
    document.querySelectorAll('.av-row').forEach(row=>{
      const editBtn = row.querySelector('.action-edit');
      const toggleBtn = row.querySelector('.action-toggle-status');
      if(editBtn){
        editBtn.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          const data = {
            titulo: row.dataset.titulo || '',
            autor: row.dataset.autor || ''
          };
          try{ window.openAvModal && window.openAvModal(data); }catch(e){ /* noop */ }
        });
      }
      if(toggleBtn){
        toggleBtn.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          const inactive = row.classList.toggle('inactive');
          const statusCell = row.querySelector('.status-cell');
          if(statusCell){
            statusCell.textContent = inactive ? 'Inativo' : 'Ativo';
            statusCell.classList.toggle('inactive', inactive);
          }
          if(inactive){
            toggleBtn.classList.remove('is-danger');
            toggleBtn.classList.add('is-success');
            toggleBtn.title = 'Reativar avaliação';
            toggleBtn.setAttribute('aria-label','Reativar avaliação');
            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if(icon) icon.textContent = 'check_circle';
          } else {
            toggleBtn.classList.remove('is-success');
            toggleBtn.classList.add('is-danger');
            toggleBtn.title = 'Inativar avaliação';
            toggleBtn.setAttribute('aria-label','Inativar avaliação');
            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if(icon) icon.textContent = 'do_not_disturb_on';
          }
        });
      }
    });
  }

  const searchInput = document.getElementById('searchAv');
  const statusSelect = document.getElementById('statusFilterAv');
  const clearBtn = document.getElementById('btnClearAvFilters');
  const resultsEl = document.getElementById('resultsCounterAv');

  function applyAvFilters(){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const status = (statusSelect && statusSelect.value) || 'all';
    const rows = Array.from(document.querySelectorAll('.av-row'));
    let visible = 0;
    rows.forEach(row=>{
      const matchesSearch = !q || [row.dataset.titulo, row.dataset.autor, row.dataset.curso].some(v=> (v||'').toLowerCase().includes(q));
      const isInactive = row.classList.contains('inactive');
      const matchesStatus = status === 'all' || (status === 'inactive' ? isInactive : !isInactive);
      const show = matchesSearch && matchesStatus;
      row.style.display = show ? '' : 'none';
      if(show) visible++;
    });
    if(resultsEl){
      const total = rows.length;
      resultsEl.textContent = `Exibindo ${visible} de ${total}`;
    }
  }

  if(searchInput){ searchInput.addEventListener('input', applyAvFilters); }
  if(statusSelect){ statusSelect.addEventListener('change', applyAvFilters); }
  if(clearBtn){
    clearBtn.addEventListener('click', ()=>{
      if(searchInput) searchInput.value = '';
      if(statusSelect) statusSelect.value = 'all';
      applyAvFilters();
    });
  }

  bindRowActions();
  applyAvFilters();
})();