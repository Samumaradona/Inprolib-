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
    const {id, titulo, tipo, curso, data: dataPublicacao, url} = data;
    titleEl.textContent = titulo || 'Publicação';
    meta.textContent = [tipo, curso, dataPublicacao].filter(Boolean).join(' • ');
    // usa rota de download quando houver id; caso contrário, usa a URL direta
    link.href = (id ? `/download_publicacao/${id}` : (url || '#'));
    try {
      // Remove alvo em nova aba para evitar navegação interrompida
      link.removeAttribute('target');
      // Sugere nome de download com o título
      link.setAttribute('download', (titulo || 'publicacao'));
    } catch(e){}

    // preview
    preview.innerHTML = '';
    if(url){
      const ext = getExt(url);
      if(['.doc','.docx','.xls','.xlsx'].includes(ext)){
        const host = location.hostname.toLowerCase();
        if(host !== 'localhost' && host !== '127.0.0.1'){
          const absURL = new URL(url, location.origin).href;
          const officeURL = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(absURL);
          const frame = document.createElement('iframe');
          frame.src = officeURL;
          frame.title = titulo || 'Pré-visualização Office';
          frame.style.width = '100%';
          frame.style.height = '520px';
          frame.style.border = '0';
          preview.appendChild(frame);
        } else {
          const msg = document.createElement('div');
          msg.textContent = 'Gerando pré-visualização...';
          msg.style.color = '#334155';
          preview.appendChild(msg);
          if(id){
            fetch(`/preview_publicacao/${id}`).then(r=>r.text()).then(html=>{
              preview.innerHTML = html;
            }).catch(()=>{
              preview.innerHTML = '';
              const fail = document.createElement('div');
              fail.textContent = 'Pré-visualização indisponível neste ambiente. Use o botão Fazer download.';
              fail.style.color = '#334155';
              preview.appendChild(fail);
            });
          } else {
            preview.innerHTML = '';
            const fail = document.createElement('div');
            fail.textContent = 'Pré-visualização indisponível. Use o botão Fazer download.';
            fail.style.color = '#334155';
            preview.appendChild(fail);
          }
        }
      }else if(['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)){
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
      }else if(ext === '.txt' || ext === '.csv'){
        const msg = document.createElement('div');
        msg.textContent = 'Carregando pré-visualização...';
        msg.style.color = '#334155';
        preview.appendChild(msg);
        fetch(url).then(r=>r.text()).then(text=>{
          preview.innerHTML = '';
          const pre = document.createElement('pre');
          pre.textContent = text;
          pre.style.whiteSpace = 'pre-wrap';
          pre.style.maxHeight = '520px';
          pre.style.overflow = 'auto';
          pre.style.background = '#fff';
          pre.style.padding = '12px';
          pre.style.borderRadius = '8px';
          preview.appendChild(pre);
        }).catch(()=>{
          preview.innerHTML = '';
          const fail = document.createElement('div');
          fail.textContent = 'Falha ao carregar pré-visualização. Use o botão Fazer download.';
          fail.style.color = '#334155';
          preview.appendChild(fail);
        });
      }else{
        const msg = document.createElement('div');
        msg.textContent = 'Pré-visualização indisponível para este tipo. Use o botão Fazer download.';
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

  // Barra de progresso no download
  if(link){
    if(!link.dataset.bound){
      link.dataset.bound = '1';
      const ensureProgressUI = ()=>{
        const actions = document.getElementById('pubActions');
        let wrap = document.getElementById('pubDlWrap');
        if(!wrap){
          wrap = document.createElement('div');
          wrap.id = 'pubDlWrap';
          wrap.style.marginTop = '8px';
          wrap.style.display = 'none';
          wrap.style.gap = '8px';
          wrap.style.alignItems = 'center';
          wrap.style.background = '#F1F5F9';
          wrap.style.borderRadius = '6px';
          wrap.style.padding = '8px';
          const bar = document.createElement('progress');
          bar.id = 'pubDlProgress';
          bar.max = 100;
          bar.value = 0;
          bar.style.width = '220px';
          const label = document.createElement('span');
          label.id = 'pubDlLabel';
          label.textContent = 'Baixando... 0%';
          wrap.appendChild(bar);
          wrap.appendChild(label);
          actions && actions.appendChild(wrap);
        }
        const bar = wrap.querySelector('progress');
        const label = wrap.querySelector('span');
        return {
          show(){ wrap.style.display='flex'; bar.value=0; label.textContent='Baixando... 0%'; },
          update(p){ bar.value=p; label.textContent = `Baixando... ${Math.max(0, Math.min(100, Math.round(p)))}%`; },
          done(){ bar.value=100; label.textContent='Download concluído com sucesso'; setTimeout(()=>{ wrap.style.display='none'; }, 1600); },
          fail(){ label.textContent='Falha no download'; wrap.style.display='flex'; }
        };
      };

      link.addEventListener('click', async (ev)=>{
        ev.preventDefault();
        const url = link.href;
        const suggested = (link.getAttribute('download') || 'arquivo');
        const progress = ensureProgressUI();
        try {
          const resp = await fetch(url);
          if(!resp.ok) throw new Error('Falha ao iniciar download');
          const total = parseInt(resp.headers.get('Content-Length') || '0', 10);
          const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;

          if(window.showSaveFilePicker && reader){
            const fileHandle = await window.showSaveFilePicker({ suggestedName: suggested });
            const writable = await fileHandle.createWritable();
            let received = 0;
            progress.show();
            while(true){
              const {done, value} = await reader.read();
              if(done) break;
              await writable.write(value);
              received += (value && value.length) ? value.length : 0;
              if(total){ progress.update((received/total)*100); }
            }
            await writable.close();
            progress.done();
          } else {
            const chunks = [];
            let received = 0;
            progress.show();
            if(reader){
              while(true){
                const {done, value} = await reader.read();
                if(done) break;
                chunks.push(value);
                received += (value && value.length) ? value.length : 0;
                if(total){ progress.update((received/total)*100); }
              }
            } else {
              const blob = await resp.blob();
              chunks.push(blob);
              progress.update(100);
            }
            const blob = new Blob(chunks);
            const objectURL = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectURL;
            a.download = suggested;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectURL);
            progress.done();
          }
        } catch(err){
          console.error('Erro no download', err);
          progress.fail();
        }
      });
    }
  }

  const rows = document.querySelectorAll('.pub-row');
  rows.forEach(row=>{
    row.addEventListener('click', ()=>{
      const data = {
        id: row.dataset.id || '',
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
            id: row.dataset.id || '',
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
  // Toast de sucesso ao anexar arquivo "conteudo"
  const conteudoInput = document.getElementById('conteudo');
  if(conteudoInput){
    conteudoInput.addEventListener('change', ()=>{
      try {
        window.showToast && window.showToast('Conteúdo anexado com sucesso!', 'success');
      } catch(e) {}
    });
  }

})();