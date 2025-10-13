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