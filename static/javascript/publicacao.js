(()=>{
  function getExt(name){
    const i = name.lastIndexOf('.');
    return i>=0 ? name.slice(i).toLowerCase() : '';
  }

  const modal = document.getElementById('pubModal');
  const btnClose = document.getElementById('pubModalClose');
  const meta = document.getElementById('pubMeta');
  const preview = document.getElementById('pubPreview');
  const link = document.getElementById('pubDownload');
  const titleEl = document.getElementById('pubModalTitle');

  function openModal(data){
    const {titulo, tipo, curso, data: dataPublicacao, url} = data;
    titleEl.textContent = titulo || 'Publicação';
    meta.textContent = [tipo, curso, dataPublicacao].filter(Boolean).join(' • ');
    link.href = url || '#';

    // preview
    preview.innerHTML = '';
    if(url){
      const ext = getExt(url);
      if(['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)){
        const img = document.createElement('img');
        img.src = url;
        img.alt = titulo || 'Conteúdo da publicação';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        preview.appendChild(img);
      }else if(ext === '.pdf'){
        const frame = document.createElement('iframe');
        frame.src = url;
        frame.title = titulo || 'Conteúdo da publicação';
        frame.style.width = '100%';
        frame.style.height = '520px';
        frame.style.border = '0';
        preview.appendChild(frame);
      }else{
        const msg = document.createElement('div');
        msg.textContent = 'Pré-visualização indisponível para este tipo. Use o botão Abrir/baixar.';
        msg.style.color = '#334155';
        preview.appendChild(msg);
      }
    }else{
      const msg = document.createElement('div');
      msg.textContent = 'Nenhum arquivo anexado ou endereço indisponível.';
      msg.style.color = '#334155';
      preview.appendChild(msg);
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
  }
  // expõe para outros handlers
  window.openPubModal = openModal;

  function closeModal(){
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
    preview.innerHTML = '';
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

  const rows = document.querySelectorAll('.pub-row');
  rows.forEach(row=>{
    row.addEventListener('click', ()=>{
      const data = {
        titulo: row.dataset.titulo || '',
        tipo: row.dataset.tipo || '',
        curso: row.dataset.curso || '',
        data: row.dataset.data || '',
        url: row.dataset.url || ''
      };
      openModal(data);
    });
  });
})();

// Extensões de UI: toolbar, filtros, contador e ações
(()=>{
  // usa window.openPubModal (definido na IIFE principal)

  const toggleFormBtn = document.getElementById('btnTogglePubForm');
  const createModal = document.getElementById('pubCreateModal');
  const createModalClose = document.getElementById('pubCreateModalClose');

  function openCreateModal(){
    if(createModal){
      createModal.style.display = 'flex';
      createModal.setAttribute('aria-hidden','false');
      const firstField = document.getElementById('autor') || document.getElementById('titulo_conteudo');
      if(firstField) try { firstField.focus(); } catch(e){}
    }
  }
  function closeCreateModal(){
    if(createModal){
      createModal.style.display = 'none';
      createModal.setAttribute('aria-hidden','true');
    }
  }

  if(toggleFormBtn){
    toggleFormBtn.addEventListener('click', openCreateModal);
  }
  if(createModalClose){
    createModalClose.addEventListener('click', closeCreateModal);
  }
  if(createModal){
    createModal.addEventListener('click', (ev)=>{
      if(ev.target === createModal){ closeCreateModal(); }
    });
  }
  document.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Escape' && createModal && createModal.style.display !== 'none'){
      closeCreateModal();
    }
  });

  function bindRowActions(){
    document.querySelectorAll('.pub-row').forEach(row=>{
      const editBtn = row.querySelector('.action-edit');
      const toggleBtn = row.querySelector('.action-toggle-status');
      if(editBtn){
        editBtn.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          const data = {
            titulo: row.dataset.titulo || '',
            tipo: row.dataset.tipo || '',
            curso: row.dataset.curso || '',
            data: row.dataset.data || '',
            url: row.dataset.url || ''
          };
          // chama openModal da IIFE principal
          try { window.openPubModal ? window.openPubModal(data) : openModal(data); } catch(e) { /* noop */ }
        });
      }
      if(toggleBtn){
        toggleBtn.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          const statusCell = row.querySelector('.status-cell');
          if(row.classList.contains('inactive')){
            row.classList.remove('inactive');
            if(statusCell){ statusCell.textContent = 'Ativo'; }
            toggleBtn.classList.remove('is-danger');
            toggleBtn.classList.add('is-success');
            toggleBtn.title = 'Ativar publicação';
            toggleBtn.setAttribute('aria-label','Ativar publicação');
            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if(icon) icon.textContent = 'task_alt';
          }else{
            row.classList.add('inactive');
            if(statusCell){ statusCell.textContent = 'Inativo'; }
            toggleBtn.classList.remove('is-success');
            toggleBtn.classList.add('is-danger');
            toggleBtn.title = 'Inativar publicação';
            toggleBtn.setAttribute('aria-label','Inativar publicação');
            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if(icon) icon.textContent = 'do_not_disturb_on';
          }
          applyPubFilters();
        });
      }
    });
  }

  const searchInput = document.getElementById('searchPub');
  const statusSelect = document.getElementById('statusFilterPub');
  const clearBtn = document.getElementById('btnClearPubFilters');
  const resultsEl = document.getElementById('resultsCounterPub');

  function applyPubFilters(){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const status = (statusSelect && statusSelect.value) || 'all';
    const rows = Array.from(document.querySelectorAll('.pub-row'));
    let visible = 0;
    rows.forEach(row=>{
      const matchesSearch = !q || [row.dataset.titulo, row.dataset.tipo, row.dataset.curso].some(v=> (v||'').toLowerCase().includes(q));
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

  if(searchInput) searchInput.addEventListener('input', applyPubFilters);
  if(statusSelect) statusSelect.addEventListener('change', applyPubFilters);
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    if(searchInput) searchInput.value = '';
    if(statusSelect) statusSelect.value = 'all';
    applyPubFilters();
  });

  bindRowActions();
  applyPubFilters();
})();