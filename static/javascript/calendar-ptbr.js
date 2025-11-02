/**
 * Calendário pt-BR Reutilizável
 * Componente para campos de data com calendário customizado em português
 */

class CalendarPTBR {
  constructor() {
    this.months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    this.weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    this.currentDate = new Date();
    this.selectedInput = null;
    this.calendarElement = null;
  }

  // Utilitários de data
  formatISOToBR(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  parseBRToISO(br) {
    if (!br || !/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return '';
    const [d, m, y] = br.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  isValidBRDate(br) {
    if (!br || !/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return false;
    const [d, m, y] = br.split('/').map(Number);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }

  // Máscara DD/MM/AAAA
  applyBRMask(el) {
    if (!el) return;
    el.addEventListener('input', () => {
      let v = String(el.value || '').replace(/\D/g, '');
      if (v.length > 8) v = v.slice(0, 8);
      let out = '';
      if (v.length >= 1) out = v.slice(0, 2);
      if (v.length >= 3) out = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
      if (v.length >= 5) out = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)}`;
      el.value = out;
      
      if (out.length === 10) {
        if (this.isValidBRDate(out)) {
          el.removeAttribute('aria-invalid');
          this.setMsg(el, '');
        } else {
          el.setAttribute('aria-invalid', 'true');
          this.setMsg(el, 'Data inválida. Use dd/mm/aaaa.');
        }
      } else {
        el.removeAttribute('aria-invalid');
        this.setMsg(el, '');
      }
    });
  }

  setMsg(el, msg) {
    if (!el) return;
    let msgEl = el.parentNode.querySelector('.field-message');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'field-message';
      el.parentNode.appendChild(msgEl);
    }
    msgEl.textContent = msg;
    msgEl.style.display = msg ? 'block' : 'none';
  }

  // Criar calendário
  createCalendar() {
    const cal = document.createElement('div');
    cal.className = 'date-picker';
    cal.innerHTML = `
      <div class="dp-header">
        <button type="button" class="dp-nav" data-nav="prev" aria-label="Mês anterior">‹</button>
        <span class="dp-month-year"></span>
        <button type="button" class="dp-nav" data-nav="next" aria-label="Próximo mês">›</button>
      </div>
      <div class="dp-week">
        ${this.weekdays.map(day => `<div class="dp-weekday">${day}</div>`).join('')}
      </div>
      <div class="dp-grid"></div>
    `;
    
    // Event listeners
    cal.querySelector('[data-nav="prev"]').addEventListener('click', () => this.prevMonth());
    cal.querySelector('[data-nav="next"]').addEventListener('click', () => this.nextMonth());
    
    return cal;
  }

  renderCalendar() {
    if (!this.calendarElement) return;
    
    const monthYear = this.calendarElement.querySelector('.dp-month-year');
    const grid = this.calendarElement.querySelector('.dp-grid');
    
    monthYear.textContent = `${this.months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    grid.innerHTML = '';
    
    // Células vazias para o início do mês
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'dp-cell dp-empty';
      grid.appendChild(cell);
    }
    
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'dp-cell';
      cell.textContent = day;
      cell.addEventListener('click', () => this.selectDate(day));
      grid.appendChild(cell);
    }
  }

  selectDate(day) {
    if (!this.selectedInput) return;
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    
    this.selectedInput.value = formattedDate;
    this.selectedInput.dispatchEvent(new Event('input'));
    this.hideCalendar();
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  showCalendar(input) {
    this.selectedInput = input;
    
    if (!this.calendarElement) {
      this.calendarElement = this.createCalendar();
      document.body.appendChild(this.calendarElement);
    }
    
    // Posicionar calendário
    const rect = input.getBoundingClientRect();
    const wrapper = input.closest('.input-with-icon');
    const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : rect;
    
    this.calendarElement.style.position = 'absolute';
    this.calendarElement.style.top = `${wrapperRect.bottom + window.scrollY + 5}px`;
    this.calendarElement.style.left = `${wrapperRect.left + window.scrollX}px`;
    this.calendarElement.style.zIndex = '1000';
    this.calendarElement.style.display = 'block';
    
    // Se o input tem valor válido, navegar para esse mês
    if (input.value && this.isValidBRDate(input.value)) {
      const [d, m, y] = input.value.split('/').map(Number);
      this.currentDate = new Date(y, m - 1, d);
    } else {
      this.currentDate = new Date();
    }
    
    this.renderCalendar();
    
    // Fechar ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
    }, 0);
  }

  hideCalendar() {
    if (this.calendarElement) {
      this.calendarElement.style.display = 'none';
    }
    this.selectedInput = null;
  }

  handleOutsideClick(e) {
    if (this.calendarElement && !this.calendarElement.contains(e.target) && 
        !e.target.closest('.input-with-icon')) {
      this.hideCalendar();
    }
  }

  // Inicializar campo de data
  enhance(el) {
    if (!el) return;
    
    this.applyBRMask(el);
    const wrap = el.closest('.input-with-icon');
    
    if (wrap) {
      const trigger = wrap.querySelector('.calendar-trigger');
      if (trigger) {
        trigger.style.cursor = 'pointer';
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-label', 'Abrir calendário');
        trigger.addEventListener('click', () => this.showCalendar(el));
      }
    }

    // Validação no blur
    el.addEventListener('blur', () => {
      if (el.value && !this.isValidBRDate(el.value)) {
        el.setAttribute('aria-invalid', 'true');
        this.setMsg(el, 'Data inválida. Use dd/mm/aaaa.');
      }
    });
  }
}

// Instância global
window.CalendarPTBR = window.CalendarPTBR || new CalendarPTBR();

// Função de conveniência para inicializar campos
window.initDateField = function(selector) {
  const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];
  elements.forEach(el => {
    if (el) window.CalendarPTBR.enhance(el);
  });
};

// Auto-inicialização para campos com classe 'date-input'
document.addEventListener('DOMContentLoaded', () => {
  window.initDateField('.date-input');
});