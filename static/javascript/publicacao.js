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
  const evalWrap = document.getElementById('pubEvalHistory');
  const evalStatus = document.getElementById('pubEvalStatus');
  const evalList = document.getElementById('pubEvalList');
  const evalPanel = document.getElementById('pubEvalPanel');
  const toggleEvalBtn = document.getElementById('btnToggleEvalHistory');

  // Toggle do histórico de avaliações (menu cascata)
  (function initEvalHistoryToggle(){
    if(!toggleEvalBtn || !evalPanel) return;
    let expanded = false;
    function render(){
      toggleEvalBtn.setAttribute('aria-expanded', String(expanded));
      const icon = toggleEvalBtn.querySelector('.material-symbols-outlined');
      if(icon) icon.textContent = expanded ? 'expand_less' : 'expand_more';
      // Atualiza rótulo mantendo ícone
      const label = expanded ? 'Ocultar' : 'Mostrar';
      toggleEvalBtn.lastChild && toggleEvalBtn.removeChild(toggleEvalBtn.lastChild);
      toggleEvalBtn.appendChild(document.createTextNode(label));
      evalPanel.style.display = expanded ? '' : 'none';
      toggleEvalBtn.title = expanded ? 'Ocultar histórico' : 'Mostrar histórico';
      // Se expandiu, garante que o bloco fique visível abaixo do cabeçalho sticky
      if(expanded){
        try{ (evalWrap || evalPanel).scrollIntoView({ block: 'start', behavior: 'smooth' }); }catch(e){}
      }
    }
    render();
    toggleEvalBtn.addEventListener('click', (e)=>{ e.preventDefault(); expanded = !expanded; render(); });
  })();

  // Reseta a UI de progresso/estado de download ao abrir/fechar o modal
  function resetProgressUI(){
    try{
      const wrap = document.getElementById('pubDlWrap');
      if(wrap){
        wrap.style.display = 'none';
        const bar = wrap.querySelector('progress');
        const label = wrap.querySelector('span');
        if(bar) bar.value = 0;
        if(label) label.textContent = 'Baixando... 0%';
      }
    }catch(_){ /* noop */ }
  }

  function openModal(data){
    const {id, titulo, tipo, curso, data: dataPublicacao, url, status} = data;
    titleEl.textContent = titulo || 'Publicação';
    meta.textContent = [tipo, curso, dataPublicacao].filter(Boolean).join(' • ');
    // usa rota de download (PDF) quando houver id; caso contrário, usa a URL direta
    link.href = (id ? `/download_pdf_publicacao/${id}` : (url || '#'));
    try {
      // Remove alvo em nova aba para evitar navegação interrompida
      link.removeAttribute('target');
      // Sugere nome de download com o título
      link.setAttribute('download', (titulo || 'publicacao'));
    } catch(e){}

    // Garante que qualquer mensagem anterior (ex.: "Download cancelado") seja removida
    resetProgressUI();

    // Controle de permissão de download por status
    const st = String(status || '').toLowerCase();
    const isPublished = st.includes('public');
    if(!isPublished){
      link.href = '#';
      link.classList.add('is-disabled');
      link.setAttribute('aria-disabled','true');
      link.title = 'Download disponível apenas quando Publicada';
      link.textContent = 'Download indisponível';
    } else {
      link.classList.remove('is-disabled');
      link.removeAttribute('aria-disabled');
      link.textContent = 'Fazer download';
      link.title = 'Fazer download';
    }


    // preview
    preview.innerHTML = '';
    // Sempre usa a rota de preview em PDF quando há id
    if(id){
      const src = `${location.origin}/preview_pdf_publicacao/${id}#zoom=page-width`;
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = titulo || 'Pré-visualização PDF';
      frame.style.width = '100%';
      frame.style.height = '520px';
      frame.style.border = '0';
      frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads');
      frame.setAttribute('referrerpolicy','no-referrer');
      frame.setAttribute('loading','lazy');
      preview.appendChild(frame);
    } else if(url){
      // Fallback sem id: usa URL direta conforme tipo
      const ext = getExt(url);
      if(['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)){
        const img = document.createElement('img');
        img.src = url;
        img.alt = titulo || 'Conteúdo da publicação';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.setAttribute('loading','lazy');
        img.setAttribute('referrerpolicy','no-referrer');
        img.setAttribute('decoding','async');
        preview.appendChild(img);
      }else if(ext === '.pdf'){
        const frame = document.createElement('iframe');
        frame.src = url;
        frame.title = titulo || 'Conteúdo da publicação';
        frame.style.width = '100%';
        frame.style.height = '520px';
        frame.style.border = '0';
        // Ampliamos permissões para melhor compatibilidade do visualizador PDF
        frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-popups');
        frame.setAttribute('referrerpolicy','no-referrer');
        frame.setAttribute('loading','lazy');
        preview.appendChild(frame);
        // Fallback útil: abrir em nova aba e baixar
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.alignItems = 'center';
        actions.style.marginTop = '8px';
        const openLink = document.createElement('a');
        openLink.href = url;
        openLink.target = '_blank';
        openLink.rel = 'noopener';
        openLink.textContent = 'Abrir em nova aba';
        const dlLink = document.createElement('a');
        dlLink.href = url.replace('/preview_pdf_publicacao/','/download_pdf_publicacao/');
        dlLink.textContent = 'Baixar PDF';
        actions.appendChild(openLink);
        actions.appendChild(dlLink);
        preview.appendChild(actions);
      }else if(ext === '.txt' || ext === '.csv'){
        const msg = document.createElement('div');
        msg.textContent = 'Carregando pré-visualização...';
        msg.style.color = '#334155';
        preview.appendChild(msg);
        fetch(url, { referrerPolicy: 'no-referrer' }).then(r=>r.text()).then(text=>{
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

    // histórico de avaliações
    if(evalStatus){ evalStatus.textContent = id ? 'Carregando histórico...' : 'Nenhuma publicação selecionada.'; }
    if(evalList){ evalList.innerHTML = ''; }
    if(id){
      fetch(`/publicacao/${id}/avaliacoes`, { credentials: 'same-origin' })
        .then(r=>r.json())
        .then(json=>{
          const ok = !!json && json.ok;
          const items = ok ? (json.avaliacoes || []) : [];
          if(!items.length){
            if(evalStatus){ evalStatus.textContent = 'Nenhuma avaliação registrada para esta publicação.'; }
            return;
          }
          if(evalStatus){ evalStatus.textContent = `${items.length} avaliação(ões) encontradas:`; }
          items.forEach(it=>{
            const wrap = document.createElement('div');
            wrap.style.border = '1px solid #e5e7eb';
            wrap.style.borderRadius = '8px';
            wrap.style.padding = '8px';
            wrap.style.background = '#F8FAFC';
            const meta = document.createElement('div');
            meta.style.color = '#334155';
            meta.style.fontSize = '13px';
            meta.style.marginBottom = '4px';
            meta.innerHTML = `<strong>${(it.avaliador||'')}</strong> • ${(it.data||'')}`;
            const comment = document.createElement('div');
            comment.style.color = '#0f172a';
            comment.style.fontSize = '14px';
            comment.textContent = it.comentario ? it.comentario : '(sem comentário)';
            wrap.appendChild(meta);
            wrap.appendChild(comment);
            evalList && evalList.appendChild(wrap);
          });
        })
        .catch(()=>{ if(evalStatus){ evalStatus.textContent = 'Falha ao carregar histórico.'; } });
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
    // Ao fechar, também limpamos a UI de progresso
    resetProgressUI();
  }

  if(btnClose){ btnClose.addEventListener('click', closeModal); }
  // Fechamento apenas pelo botão X: sem clique no backdrop e sem tecla Esc
  // Removidos listeners que fechavam ao clicar fora ou via Escape

  // Barra de progresso no download
  if(link){
    if(!link.dataset.bound){
      link.dataset.bound = '1';
      const ensureProgressUI = (controller)=>{
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
          const btnCancel = document.createElement('button');
          btnCancel.id = 'pubDlCancel';
          btnCancel.type = 'button';
          btnCancel.textContent = 'Cancelar';
          btnCancel.style.marginLeft = '8px';
          btnCancel.style.background = '#e2e8f0';
          btnCancel.style.color = '#0f172a';
          btnCancel.style.border = '0';
          btnCancel.style.padding = '6px 10px';
          btnCancel.style.borderRadius = '6px';
          btnCancel.style.cursor = 'pointer';
          btnCancel.setAttribute('aria-label','Cancelar download');
          wrap.appendChild(bar);
          wrap.appendChild(label);
          wrap.appendChild(btnCancel);
          actions && actions.appendChild(wrap);
        }
        const bar = wrap.querySelector('progress');
        const label = wrap.querySelector('span');
        const btnCancel = wrap.querySelector('#pubDlCancel');
        if(btnCancel){
          btnCancel.onclick = ()=>{
            try{ controller && controller.abort && controller.abort(); }catch(e){}
            // Atualiza rótulo imediatamente
            label.textContent = 'Download cancelado';
            wrap.style.display='flex';
            try { window.showToast && window.showToast('Download cancelado', 'info'); } catch(_){}
            try { setTimeout(()=>{ typeof closeModal === 'function' && closeModal(); }, 400); } catch(_){}
          };
        }
        return {
          show(){ wrap.style.display='flex'; bar.value=0; label.textContent='Baixando... 0%'; },
          update(p){ bar.value=p; label.textContent = `Baixando... ${Math.max(0, Math.min(100, Math.round(p)))}%`; },
          done(name){
            bar.value=100;
            const msg = name ? `Download concluído: ${name}` : 'Download concluído com sucesso';
            label.textContent = msg;
            wrap.style.display='flex';
            try {
              if (window.location && window.location.pathname === '/publicacao') {
                window.showToast && window.showToast(msg, 'success');
              }
            } catch(_){}
            // Fecha o modal após breve intervalo para indicar conclusão
            try { setTimeout(()=>{ typeof closeModal === 'function' && closeModal(); }, 600); } catch(_){}
          },
          fail(){ label.textContent='Falha no download'; wrap.style.display='flex'; }
          ,
          cancel(){
            label.textContent='Download cancelado';
            wrap.style.display='flex';
            try { window.showToast && window.showToast('Download cancelado', 'info'); } catch(_){}
            try { setTimeout(()=>{ typeof closeModal === 'function' && closeModal(); }, 400); } catch(_){}
          }
        };
      };

      link.addEventListener('click', async (ev)=>{
        ev.preventDefault();
        // Bloqueia interação quando desabilitado por status
        if(link.classList.contains('is-disabled') || link.getAttribute('aria-disabled') === 'true'){
          try { window.showToast && window.showToast('Download disponível apenas quando Publicada.', 'info'); } catch(e) {}
          return;
        }
        const url = link.href;
        let suggested = (link.getAttribute('download') || 'arquivo');
        const controller = new AbortController();
        let aborted = false;
        try { controller.signal.addEventListener('abort', ()=>{ aborted = true; }); }catch(_){}
        const progress = ensureProgressUI(controller);
        try {
          const resp = await fetch(url, { credentials: 'same-origin', signal: controller.signal });
          if(!resp.ok) throw new Error('Falha ao iniciar download');

          // Tenta obter nome sugerido do servidor (Content-Disposition)
          try{
            const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition') || '';
            const rfc5987 = cd.match(/filename\*=UTF-8''([^;]+)/);
            const classic = cd.match(/filename="?([^";]+)"?/);
            const serverName = rfc5987 ? decodeURIComponent(rfc5987[1]) : (classic ? classic[1] : null);
            if(serverName){ suggested = serverName; }
          }catch(e){ /* ignore */ }

          const total = parseInt(resp.headers.get('Content-Length') || resp.headers.get('content-length') || '0', 10);
          let mime = resp.headers.get('Content-Type') || resp.headers.get('content-type') || 'application/octet-stream';
          const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
          // garante extensão .pdf quando o conteúdo é PDF
          if(/pdf/i.test(mime) && !/\.pdf$/i.test(suggested)){ suggested = `${suggested}.pdf`; }

          if(window.showSaveFilePicker && reader && window.isSecureContext){
            const fileHandle = await window.showSaveFilePicker({ 
              suggestedName: suggested,
              types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
              excludeAcceptAllOption: true
            });
            const writable = await fileHandle.createWritable();
            let received = 0;
            progress.show();
            while(true){
              if(aborted) break;
              const {done, value} = await reader.read();
              if(done) break;
              await writable.write(value);
              received += (value && value.length) ? value.length : 0;
              if(total){ progress.update((received/total)*100); }
            }
            try { await writable.close(); } catch(_){}
            if(!aborted){
              progress.done(suggested);
            } else {
              progress.cancel();
            }
          } else {
            const chunks = [];
            let received = 0;
            progress.show();
            if(reader){
              while(true){
                if(aborted) break;
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
            // fallback para salvar via âncora ou API msSaveOrOpenBlob
            if(!aborted){
              const blob = new Blob(chunks, { type: /pdf/i.test(mime) ? 'application/pdf' : mime });
              if(navigator.msSaveOrOpenBlob){
                navigator.msSaveOrOpenBlob(blob, suggested);
                progress.done(suggested);
              } else {
                const objectURL = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectURL;
                a.download = suggested;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(objectURL);
                progress.done(suggested);
              }
            } else {
              progress.cancel();
            }
          }
        } catch(err){
          console.error('Erro no download', err);
          // Se for cancelamento via AbortController, trate como cancelado
          if(err && (err.name === 'AbortError' || err.code === 20)){
            progress.cancel();
          } else {
            progress.fail();
          }
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
        url: row.dataset.url || '',
        status: row.dataset.status || ''
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
      // Reseta o formulário e limpa mensagens/estilos de erro
      try{
        const form = document.getElementById('pubFormContainer');
        if(form && form.reset) form.reset();
        // Limpa feedbacks de erro gerados dinamicamente
        form && form.querySelectorAll('.field-msg.error').forEach(el=>{ try{ el.remove(); }catch(_){ } });
        form && form.querySelectorAll('.field-error').forEach(el=>{ el.classList.remove('field-error'); });
        form && form.querySelectorAll('label.required-missing').forEach(el=>{ el.classList.remove('required-missing'); });
        // Restabelece textos das labels de arquivo
        const lblConteudo = document.querySelector('label[for="conteudo"]');
        const lblTermo = document.querySelector('label[for="termo"]');
        if(lblConteudo){
          const base = lblConteudo.getAttribute('data-base') || 'Anexar Conteúdo';
          lblConteudo.textContent = base.includes('Selecionado:') ? 'Anexar Conteúdo' : base;
        }
        if(lblTermo){
          const base2 = lblTermo.getAttribute('data-base') || 'Anexar Termo de Autorização';
          lblTermo.textContent = base2.includes('Selecionado:') ? 'Anexar Termo de Autorização' : base2;
        }
      }catch(_){ /* noop */ }
      createModal.style.display = 'flex';
      createModal.setAttribute('aria-hidden','false');
      // Foca no título por padrão; se não existir, foca no autor apenas se não estiver readonly
      const titleField = document.getElementById('titulo_conteudo');
      const autorField = document.getElementById('autor');
      const firstField = titleField || (autorField && !autorField.readOnly ? autorField : null);
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
  // Modal de criação também só fecha pelo botão X

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
            url: row.dataset.url || '',
            status: row.dataset.status || ''
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

  // Sem filtros na lista: apenas vincula ações de cada linha
  bindRowActions();
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