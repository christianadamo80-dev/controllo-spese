const STORAGE_KEY = 'simulatore-spese-v2';

const state = {
  currentBalance: 0,
  safetyThreshold: 0,
  certainExpenses: [],
  futureExpenses: [],
  editingCertainId: null,
  editingFutureId: null,
};

const els = {
  currentBalance: document.getElementById('currentBalance'),
  safetyThreshold: document.getElementById('safetyThreshold'),
  certainTotal: document.getElementById('certainTotal'),
  futureTotal: document.getElementById('futureTotal'),
  finalBalance: document.getElementById('finalBalance'),
  marginValue: document.getElementById('marginValue'),
  statusText: document.getElementById('statusText'),
  statusBadge: document.getElementById('statusBadge'),
  initialBar: document.getElementById('initialBar'),
  expensesBar: document.getElementById('expensesBar'),
  finalBar: document.getElementById('finalBar'),
  barInitialLabel: document.getElementById('barInitialLabel'),
  barExpensesLabel: document.getElementById('barExpensesLabel'),
  barFinalLabel: document.getElementById('barFinalLabel'),
  certainList: document.getElementById('certainList'),
  futureList: document.getElementById('futureList'),
  certainForm: document.getElementById('certainForm'),
  futureForm: document.getElementById('futureForm'),
  addCertainExpense: document.getElementById('addCertainExpense'),
  addFutureExpense: document.getElementById('addFutureExpense'),
  cancelCertainBtn: document.getElementById('cancelCertainBtn'),
  cancelFutureBtn: document.getElementById('cancelFutureBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  resetBtn: document.getElementById('resetBtn'),
  expenseItemTemplate: document.getElementById('expenseItemTemplate'),
  monthlyProjectionList: document.getElementById('monthlyProjectionList'),
  certainDescription: document.getElementById('certainDescription'),
  certainAmount: document.getElementById('certainAmount'),
  certainFrequency: document.getElementById('certainFrequency'),
  certainDate: document.getElementById('certainDate'),
  futureDescription: document.getElementById('futureDescription'),
  futureAmount: document.getElementById('futureAmount'),
  futureType: document.getElementById('futureType'),
  futureCategory: document.getElementById('futureCategory'),
  futureDate: document.getElementById('futureDate'),
  futurePriority: document.getElementById('futurePriority'),
  futureEnabled: document.getElementById('futureEnabled'),
};

function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

function formatSignedCurrency(value) {
  const num = Number(value || 0);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(num))}`;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFutureItems(items = []) {
  return items.map(item => ({
    ...item,
    type: item.type || 'expense',
    enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    priority: item.priority || 'Media',
  }));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentBalance: Number(state.currentBalance || 0),
    safetyThreshold: Number(state.safetyThreshold || 0),
    certainExpenses: state.certainExpenses,
    futureExpenses: state.futureExpenses,
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.currentBalance = Number(data.currentBalance || 0);
    state.safetyThreshold = Number(data.safetyThreshold || 0);
    state.certainExpenses = Array.isArray(data.certainExpenses) ? data.certainExpenses : [];
    state.futureExpenses = normalizeFutureItems(Array.isArray(data.futureExpenses) ? data.futureExpenses : []);
  } catch {
    console.warn('Dati salvati non leggibili');
  }
}

function setInputsFromState() {
  els.currentBalance.value = state.currentBalance || '';
  els.safetyThreshold.value = state.safetyThreshold || '';
}

function getFutureImpact(item) {
  const amount = Number(item.amount || 0);
  return item.type === 'income' ? -amount : amount;
}

function totals() {
  const certainTotal = state.certainExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const futureTotal = state.futureExpenses
    .filter(item => item.enabled)
    .reduce((sum, item) => sum + getFutureImpact(item), 0);
  const totalImpact = certainTotal + futureTotal;
  const finalBalance = Number(state.currentBalance || 0) - totalImpact;
  const margin = finalBalance - Number(state.safetyThreshold || 0);
  return { certainTotal, futureTotal, totalImpact, finalBalance, margin };
}

function updateSummary() {
  const { certainTotal, futureTotal, totalImpact, finalBalance, margin } = totals();
  els.certainTotal.textContent = formatCurrency(certainTotal);
  els.futureTotal.textContent = formatSignedCurrency(-futureTotal);
  els.finalBalance.textContent = formatCurrency(finalBalance);
  els.marginValue.textContent = formatSignedCurrency(margin);
  els.barInitialLabel.textContent = formatCurrency(state.currentBalance || 0);
  els.barExpensesLabel.textContent = formatSignedCurrency(-totalImpact);
  els.barFinalLabel.textContent = formatCurrency(finalBalance);

  const base = Math.max(Number(state.currentBalance || 0), Math.abs(totalImpact), Math.abs(finalBalance), 1);
  els.initialBar.style.width = `${Math.min(100, (Number(state.currentBalance || 0) / base) * 100)}%`;
  els.expensesBar.style.width = `${Math.min(100, (Math.abs(totalImpact) / base) * 100)}%`;
  els.finalBar.style.width = `${Math.min(100, (Math.abs(finalBalance) / base) * 100)}%`;
  els.expensesBar.className = `progress-bar ${totalImpact >= 0 ? 'progress-orange' : 'progress-green'}`;
  els.finalBar.className = `progress-bar ${finalBalance >= 0 ? 'progress-green' : 'progress-red'}`;

  let badgeClass = 'neutral';
  let badgeText = 'In attesa dati';
  let statusText = 'Inserisci i dati per vedere la situazione.';

  if (Number(state.currentBalance || 0) || certainTotal || futureTotal) {
    if (finalBalance < 0) {
      badgeClass = 'danger';
      badgeText = 'Saldo negativo';
      statusText = 'Con i movimenti inseriti andrai sotto zero. Valuta di ridurre o posticipare alcune spese.';
    } else if (margin < 0) {
      badgeClass = 'warning';
      badgeText = 'Sotto soglia';
      statusText = 'Il saldo finale resta positivo ma scende sotto la soglia minima di sicurezza che hai impostato.';
    } else {
      badgeClass = 'ok';
      badgeText = 'Situazione OK';
      statusText = 'Il saldo finale rimane sopra la soglia minima. Puoi usare entrate e spese future per confrontare scenari diversi.';
    }
  }

  els.statusBadge.className = `status-badge ${badgeClass}`;
  els.statusBadge.textContent = badgeText;
  els.statusText.textContent = statusText;
}

function createMetaPill(text, className = '') {
  const span = document.createElement('span');
  span.className = `meta-pill ${className}`.trim();
  span.textContent = text;
  return span;
}

function createActionButton(text, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-small ${className}`;
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function renderCertainExpenses() {
  els.certainList.innerHTML = '';
  if (!state.certainExpenses.length) {
    els.certainList.innerHTML = '<div class="empty-state">Nessuna spesa certa inserita.</div>';
    return;
  }

  [...state.certainExpenses]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach(item => {
      const clone = els.expenseItemTemplate.content.firstElementChild.cloneNode(true);
      clone.querySelector('.item-title').textContent = item.description;
      const metaRow = clone.querySelector('.meta-row');
      metaRow.appendChild(createMetaPill(item.frequency || 'Una tantum'));
      if (item.date) metaRow.appendChild(createMetaPill(`Data: ${formatDate(item.date)}`));
      clone.querySelector('.item-amount').textContent = `- ${formatCurrency(item.amount)}`;
      
      const actions = clone.querySelector('.item-actions');
      actions.appendChild(createActionButton('Modifica', 'btn-secondary', () => editCertain(item.id)));
      actions.appendChild(createActionButton('Duplica', 'btn-secondary', () => duplicateCertain(item.id)));
      actions.appendChild(createActionButton('Elimina', 'btn-danger', () => deleteCertain(item.id)));
      
      els.certainList.appendChild(clone);
    });
}

function renderFutureExpenses() {
  els.futureList.innerHTML = '';
  if (!state.futureExpenses.length) {
    els.futureList.innerHTML = '<div class="empty-state">Nessun movimento futuro inserito.</div>';
    return;
  }

  [...state.futureExpenses]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach(item => {
      const clone = els.expenseItemTemplate.content.firstElementChild.cloneNode(true);
      clone.querySelector('.item-title').textContent = item.description;
      const metaRow = clone.querySelector('.meta-row');
      metaRow.appendChild(createMetaPill(item.type === 'income' ? 'Entrata futura' : 'Spesa futura', item.type === 'income' ? 'priority-bassa' : ''));
      if (item.category) metaRow.appendChild(createMetaPill(item.category));
      if (item.date) metaRow.appendChild(createMetaPill(`Data: ${formatDate(item.date)}`));
      metaRow.appendChild(createMetaPill(`Priorità ${item.priority}`, `priority-${(item.priority || '').toLowerCase()}`));
      metaRow.appendChild(createMetaPill(item.enabled ? 'Inclusa nel calcolo' : 'Esclusa dal calcolo', item.enabled ? '' : 'disabled'));
      clone.querySelector('.item-amount').textContent = `${item.type === 'income' ? '+' : '-'} ${formatCurrency(item.amount)}`;
      const actions = clone.querySelector('.item-actions');
      actions.appendChild(createActionButton(item.enabled ? 'Escludi' : 'Includi', 'btn-secondary', () => toggleFuture(item.id)));
      actions.appendChild(createActionButton('Modifica', 'btn-secondary', () => editFuture(item.id)));
      actions.appendChild(createActionButton('Elimina', 'btn-danger', () => deleteFuture(item.id)));
      els.futureList.appendChild(clone);
    });
}

function renderMonthlyProjection() {
  const container = els.monthlyProjectionList;
  if (!container) return;
  container.innerHTML = '';

  const initialBalance = Number(state.currentBalance || 0);
  const timeline = {};

  state.certainExpenses.forEach(item => {
    if (!item.date) return;
    const key = item.date.substring(0, 7);
    if (!timeline[key]) timeline[key] = { expenses: 0, incomes: 0 };
    timeline[key].expenses += Number(item.amount || 0);
  });

  state.futureExpenses.forEach(item => {
    if (!item.date || !item.enabled) return;
    const key = item.date.substring(0, 7);
    if (!timeline[key]) timeline[key] = { expenses: 0, incomes: 0 };
    
    if (item.type === 'income') {
      timeline[key].incomes += Number(item.amount || 0);
    } else {
      timeline[key].expenses += Number(item.amount || 0);
    }
  });

  const months = Object.keys(timeline).sort();
  if (months.length === 0) {
    container.innerHTML = '<div class="empty-state">Assegna una data ai movimenti per vedere la proiezione mensile.</div>';
    return;
  }

  let runningBalance = initialBalance;

  months.forEach(monthKey => {
    const [year, month] = monthKey.split('-');
    const formattedMonth = `${month}/${year}`;
    
    const data = timeline[monthKey];
    const netImpact = data.incomes - data.expenses;
    runningBalance += netImpact;

    let balanceColor = 'var(--text)';
    if (runningBalance < 0) balanceColor = 'var(--danger)';
    else if (runningBalance < Number(state.safetyThreshold || 0)) balanceColor = 'var(--warning)';

    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.padding = '12px 16px';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    
    row.innerHTML = `
      <div class="list-main">
        <h3 class="item-title" style="margin:0; font-size:1.1rem;">${formattedMonth}</h3>
        <div class="meta-row" style="margin-top: 4px; display: flex; gap: 8px;">
          <span class="meta-pill" style="color: var(--success); background: #e7f6ed; padding: 2px 8px; border-radius: 999px; font-size: 0.85rem;">+ ${formatCurrency(data.incomes)}</span>
          <span class="meta-pill" style="color: var(--danger); background: #fdeceb; padding: 2px 8px; border-radius: 999px; font-size: 0.85rem;">- ${formatCurrency(data.expenses)}</span>
        </div>
      </div>
      <div class="list-side" style="text-align: right;">
        <span style="font-size: 0.85rem; color: var(--muted); display:block;">Saldo stimato</span>
        <strong style="font-size: 1.2rem; color: ${balanceColor};">${formatCurrency(runningBalance)}</strong>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderAll() {
  renderCertainExpenses();
  renderFutureExpenses();
  updateSummary();
  renderMonthlyProjection();
  saveState();
}

function openCertainForm(editing = false) {
  if (!editing) {
    state.editingCertainId = null;
    els.certainForm.reset();
  }
  els.certainForm.classList.remove('hidden');
}

function closeCertainForm() {
  state.editingCertainId = null;
  els.certainForm.reset();
  els.certainForm.classList.add('hidden');
}

function openFutureForm(editing = false) {
  if (!editing) {
    state.editingFutureId = null;
    els.futureForm.reset();
    els.futureType.value = 'expense';
    els.futurePriority.value = 'Media';
    els.futureEnabled.checked = true;
  }
  els.futureForm.classList.remove('hidden');
}

function closeFutureForm() {
  state.editingFutureId = null;
  els.futureForm.reset();
  els.futureForm.classList.add('hidden');
}

function editCertain(id) {
  const item = state.certainExpenses.find(exp => exp.id === id);
  if (!item) return;
  state.editingCertainId = id;
  els.certainDescription.value = item.description || '';
  els.certainAmount.value = item.amount || '';
  els.certainFrequency.value = item.frequency || 'Una tantum';
  els.certainDate.value = item.date || '';
  openCertainForm(true);
}

function duplicateCertain(id) {
  const item = state.certainExpenses.find(exp => exp.id === id);
  if (!item) return;
  state.editingCertainId = null; // Forza la creazione di un nuovo elemento al submit
  els.certainDescription.value = item.description || '';
  els.certainAmount.value = item.amount || '';
  els.certainFrequency.value = item.frequency || 'Una tantum';
  els.certainDate.value = item.date || ''; // Mantiene la data originale ma permette la modifica immediata
  els.certainForm.classList.remove('hidden');
  els.certainDate.focus();
}

function editFuture(id) {
  const item = state.futureExpenses.find(exp => exp.id === id);
  if (!item) return;
  state.editingFutureId = id;
  els.futureDescription.value = item.description || '';
  els.futureAmount.value = item.amount || '';
  els.futureType.value = item.type || 'expense';
  els.futureCategory.value = item.category || '';
  els.futureDate.value = item.date || '';
  els.futurePriority.value = item.priority || 'Media';
  els.futureEnabled.checked = Boolean(item.enabled);
  openFutureForm(true);
}

function deleteCertain(id) {
  state.certainExpenses = state.certainExpenses.filter(exp => exp.id !== id);
  renderAll();
}

function deleteFuture(id) {
  state.futureExpenses = state.futureExpenses.filter(exp => exp.id !== id);
  renderAll();
}

function toggleFuture(id) {
  state.futureExpenses = state.futureExpenses.map(exp => exp.id === id ? { ...exp, enabled: !exp.enabled } : exp);
  renderAll();
}

function handleCertainSubmit(event) {
  event.preventDefault();
  const payload = {
    id: state.editingCertainId || uid(),
    description: els.certainDescription.value.trim(),
    amount: Number(els.certainAmount.value || 0),
    frequency: els.certainFrequency.value,
    date: els.certainDate.value,
  };
  if (!payload.description || payload.amount <= 0) return;
  if (state.editingCertainId) {
    state.certainExpenses = state.certainExpenses.map(exp => exp.id === state.editingCertainId ? payload : exp);
  } else {
    state.certainExpenses.push(payload);
  }
  closeCertainForm();
  renderAll();
}

function handleFutureSubmit(event) {
  event.preventDefault();
  const payload = {
    id: state.editingFutureId || uid(),
    description: els.futureDescription.value.trim(),
    amount: Number(els.futureAmount.value || 0),
    type: els.futureType.value,
    category: els.futureCategory.value.trim(),
    date: els.futureDate.value,
    priority: els.futurePriority.value,
    enabled: els.futureEnabled.checked,
  };
  if (!payload.description || payload.amount <= 0) return;
  if (state.editingFutureId) {
    state.futureExpenses = state.futureExpenses.map(exp => exp.id === state.editingFutureId ? payload : exp);
  } else {
    state.futureExpenses.push(payload);
  }
  closeFutureForm();
  renderAll();
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    currentBalance: Number(state.currentBalance || 0),
    safetyThreshold: Number(state.safetyThreshold || 0),
    certainExpenses: state.certainExpenses,
    futureExpenses: state.futureExpenses,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulatore-spese-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state.currentBalance = Number(data.currentBalance || 0);
      state.safetyThreshold = Number(data.safetyThreshold || 0);
      state.certainExpenses = Array.isArray(data.certainExpenses) ? data.certainExpenses : [];
      state.futureExpenses = normalizeFutureItems(Array.isArray(data.futureExpenses) ? data.futureExpenses : []);
      setInputsFromState();
      renderAll();
      alert('Dati importati correttamente.');
    } catch {
      alert('Il file selezionato non è valido.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  const confirmReset = confirm('Vuoi davvero eliminare tutti i dati salvati?');
  if (!confirmReset) return;
  state.currentBalance = 0;
  state.safetyThreshold = 0;
  state.certainExpenses = [];
  state.futureExpenses = [];
  state.editingCertainId = null;
  state.editingFutureId = null;
  localStorage.removeItem(STORAGE_KEY);
  setInputsFromState();
  closeCertainForm();
  closeFutureForm();
  renderAll();
}

function bindEvents() {
  els.currentBalance.addEventListener('input', e => {
    state.currentBalance = Number(e.target.value || 0);
    renderAll();
  });
  els.safetyThreshold.addEventListener('input', e => {
    state.safetyThreshold = Number(e.target.value || 0);
    renderAll();
  });
  els.addCertainExpense.addEventListener('click', () => openCertainForm(false));
  els.addFutureExpense.addEventListener('click', () => openFutureForm(false));
  els.cancelCertainBtn.addEventListener('click', closeCertainForm);
  els.cancelFutureBtn.addEventListener('click', closeFutureForm);
  els.certainForm.addEventListener('submit', handleCertainSubmit);
  els.futureForm.addEventListener('submit', handleFutureSubmit);
  els.exportBtn.addEventListener('click', exportData);
  els.importFile.addEventListener('change', importData);
  els.resetBtn.addEventListener('click', resetAll);
}

function init() {
  loadState();
  setInputsFromState();
  bindEvents();
  renderAll();
}

init();