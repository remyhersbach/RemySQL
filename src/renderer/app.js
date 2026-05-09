const state = {
  connections: [],
  activeConnectionId: null,
  schemaByConnection: new Map(),
  tabs: [],
  activeTabId: null,
  tablePayloadByTab: new Map(),
  selectedRowIndexByTab: new Map(),
  relationLookupByTab: new Map(),
  pendingRowsByTab: new Map(),
  editsByTab: new Map(),
  sidebarView: 'connections',
  editingConnectionId: null,
  mode: 'data',
  filterTimer: null,
  filterMode: 'text',
  filterValue: '',
  filterValueTo: ''
};

const elements = {
  themeToggleButton: document.querySelector('#themeToggleButton'),
  newConnectionButton: document.querySelector('#newConnectionButton'),
  connectionForm: document.querySelector('#connectionForm'),
  connectionTypeSelect: document.querySelector('#connectionTypeSelect'),
  connectionNameInput: document.querySelector('#connectionNameInput'),
  mariaFields: document.querySelector('#mariaFields'),
  mariaHostInput: document.querySelector('#mariaHostInput'),
  mariaPortInput: document.querySelector('#mariaPortInput'),
  mariaUserInput: document.querySelector('#mariaUserInput'),
  mariaPasswordInput: document.querySelector('#mariaPasswordInput'),
  mariaDatabaseInput: document.querySelector('#mariaDatabaseInput'),
  sqlitePathField: document.querySelector('#sqlitePathField'),
  connectionPathInput: document.querySelector('#connectionPathInput'),
  saveConnectionButton: document.querySelector('#saveConnectionButton'),
  cancelConnectionButton: document.querySelector('#cancelConnectionButton'),
  connectionFormTitle: document.querySelector('#connectionFormTitle'),
  sidebarNav: document.querySelector('#sidebarNav'),
  connectionsList: document.querySelector('#connectionsList'),
  activeConnectionLabel: document.querySelector('#activeConnectionLabel'),
  workspaceTitle: document.querySelector('#workspaceTitle'),
  refreshButton: document.querySelector('#refreshButton'),
  tabsBar: document.querySelector('#tabsBar'),
  emptyState: document.querySelector('#emptyState'),
  tableView: document.querySelector('#tableView'),
  dataModeButton: document.querySelector('#dataModeButton'),
  structureModeButton: document.querySelector('#structureModeButton'),
  filterInput: document.querySelector('#filterInput'),
  filterArea: document.querySelector('#filterArea'),
  filterTextMode: document.querySelector('#filterTextMode'),
  filterColumnMode: document.querySelector('#filterColumnMode'),
  filterModeToggle: document.querySelector('#filterModeToggle'),
  filterColumnSelect: document.querySelector('#filterColumnSelect'),
  filterOperatorSelect: document.querySelector('#filterOperatorSelect'),
  filterValueInput: document.querySelector('#filterValueInput'),
  filterValueDateBtn: document.querySelector('#filterValueDateBtn'),
  filterBetweenSep: document.querySelector('#filterBetweenSep'),
  filterValueToDateBtn: document.querySelector('#filterValueToDateBtn'),
  limitInput: document.querySelector('#limitInput'),
  tableMeta: document.querySelector('#tableMeta'),
  dataTable: document.querySelector('#dataTable'),
  relationsList: document.querySelector('#relationsList'),
  relationsPanel: document.querySelector('#relationsPanel'),
  relationsToggle: document.querySelector('#relationsToggle'),
  tableActions: document.querySelector('#tableActions'),
  addRowButton: document.querySelector('#addRowButton'),
  pendingActions: document.querySelector('#pendingActions'),
  saveRowsButton: document.querySelector('#saveRowsButton'),
  discardRowsButton: document.querySelector('#discardRowsButton'),
  datePickerBackdrop: document.querySelector('#datePickerBackdrop'),
  datePicker: document.querySelector('#datePicker'),
  datePickerInput: document.querySelector('#datePickerInput'),
  datePickerConfirm: document.querySelector('#datePickerConfirm'),
  datePickerCancel: document.querySelector('#datePickerCancel'),
  toast: document.querySelector('#toast')
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 4600);
}

function getActiveConnection() {
  return state.connections.find((connection) => connection.id === state.activeConnectionId) || null;
}

function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '<span class="muted-note">NULL</span>';
  }
  return escapeHtml(value);
}

function formatPlainValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return String(value);
}

function getRelationKey(kind, index) {
  return `${kind}:${index}`;
}

function getOutgoingRelationByColumn(payload, columnName) {
  const index = (payload.relations?.outgoing || []).findIndex((relation) => relation.fromColumn === columnName);

  if (index === -1) {
    return null;
  }

  return {
    index,
    relation: payload.relations.outgoing[index]
  };
}

function getConnectionSummary(connection) {
  if (connection.type === 'mariadb') {
    return `${connection.user}@${connection.host}:${connection.port}/${connection.database}`;
  }

  return connection.path;
}

function sameConnection(left, right) {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === 'sqlite') {
    return left.path === right.path;
  }

  return left.host === right.host
    && Number(left.port) === Number(right.port)
    && left.user === right.user
    && left.database === right.database;
}

function setConnectionFormType(type) {
  const normalizedType = type === 'sqlite' ? 'sqlite' : 'mariadb';
  elements.connectionTypeSelect.value = normalizedType;
  elements.mariaFields.hidden = normalizedType !== 'mariadb';
  elements.sqlitePathField.hidden = normalizedType !== 'sqlite';
}

function openConnectionForm(type = 'mariadb', preset = {}) {
  state.editingConnectionId = preset.id || null;
  elements.connectionFormTitle.textContent = state.editingConnectionId ? 'Connectie bewerken' : 'Nieuwe connectie';
  elements.connectionForm.hidden = false;
  setConnectionFormType(type);
  elements.connectionNameInput.value = preset.name || '';
  elements.connectionPathInput.value = preset.path || '';
  elements.mariaHostInput.value = preset.host || '127.0.0.1';
  elements.mariaPortInput.value = preset.port || '3306';
  elements.mariaUserInput.value = preset.user || '';
  elements.mariaPasswordInput.value = preset.password || '';
  elements.mariaDatabaseInput.value = preset.database || '';
  (type === 'sqlite' ? elements.connectionPathInput : elements.mariaUserInput).focus();
}

function resetConnectionForm() {
  state.editingConnectionId = null;
  elements.connectionNameInput.value = '';
  elements.connectionPathInput.value = '';
  elements.mariaHostInput.value = '127.0.0.1';
  elements.mariaPortInput.value = '3306';
  elements.mariaUserInput.value = '';
  elements.mariaPasswordInput.value = '';
  elements.mariaDatabaseInput.value = '';
}

function getConnectionFromForm() {
  const id = state.editingConnectionId || undefined;
  if (elements.connectionTypeSelect.value === 'sqlite') {
    return {
      ...(id ? { id } : {}),
      type: 'sqlite',
      name: elements.connectionNameInput.value,
      path: elements.connectionPathInput.value
    };
  }

  return {
    ...(id ? { id } : {}),
    type: 'mariadb',
    name: elements.connectionNameInput.value || elements.mariaDatabaseInput.value,
    host: elements.mariaHostInput.value || '127.0.0.1',
    port: elements.mariaPortInput.value || '3306',
    user: elements.mariaUserInput.value,
    password: elements.mariaPasswordInput.value,
    database: elements.mariaDatabaseInput.value
  };
}

async function loadConnections() {
  state.connections = await window.sqlBase.listConnections();
  if (!state.activeConnectionId && state.connections.length) {
    state.activeConnectionId = state.connections[0].id;
    await loadSchemaForActiveConnection();
  }
  render();
}

async function loadSchemaForActiveConnection() {
  const connection = getActiveConnection();
  if (!connection) {
    return;
  }

  try {
    const schema = await window.sqlBase.loadSchema(connection);
    state.schemaByConnection.set(connection.id, schema);
  } catch (error) {
    showToast(error.message);
  }
}

async function saveConnection(connection) {
  try {
    const result = await window.sqlBase.addConnection(connection);
    state.connections = [
      result.connection,
      ...state.connections.filter((item) => item.id !== result.connection.id && !sameConnection(item, result.connection))
    ];
    state.activeConnectionId = result.connection.id;
    state.schemaByConnection.set(result.connection.id, { tables: result.tables });
    elements.connectionForm.hidden = true;
    resetConnectionForm();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function removeConnection(connectionId) {
  state.connections = await window.sqlBase.removeConnection(connectionId);
  state.schemaByConnection.delete(connectionId);
  state.tabs = state.tabs.filter((tab) => tab.connectionId !== connectionId);
  for (const tabId of [...state.selectedRowIndexByTab.keys()]) {
    if (!state.tabs.some((tab) => tab.id === tabId)) {
      state.selectedRowIndexByTab.delete(tabId);
      state.relationLookupByTab.delete(tabId);
      state.pendingRowsByTab.delete(tabId);
      state.editsByTab.delete(tabId);
    }
  }
  if (state.activeConnectionId === connectionId) {
    state.sidebarView = 'connections';
    state.activeConnectionId = state.connections[0]?.id || null;
    if (state.activeConnectionId) {
      await loadSchemaForActiveConnection();
    }
  }
  state.activeTabId = state.tabs[0]?.id || null;
  render();
}

async function openTable(connection, tableName) {
  const existing = state.tabs.find((tab) => tab.connectionId === connection.id && tab.tableName === tableName);
  if (existing) {
    state.activeTabId = existing.id;
    render();
    return loadActiveTable();
  }

  const tab = {
    id: `${connection.id}:${tableName}:${Date.now()}`,
    connectionId: connection.id,
    connectionName: connection.name,
    tableName
  };

  state.tabs.push(tab);
  state.activeTabId = tab.id;
  state.mode = 'data';
  state.filterMode = 'text';
  state.filterValue = '';
  state.filterValueTo = '';
  elements.filterInput.value = '';
  elements.filterColumnSelect.value = '';
  elements.filterOperatorSelect.value = '=';
  elements.filterValueInput.value = '';
  elements.filterTextMode.hidden = false;
  elements.filterColumnMode.hidden = true;
  elements.filterModeToggle.classList.remove('active');
  render();
  await loadActiveTable();
}

async function loadActiveTable() {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || !connection) {
    return;
  }

  try {
    const payload = await window.sqlBase.loadTable({
      connection,
      tableName: tab.tableName,
      filter: elements.filterInput.value,
      limit: elements.limitInput.value,
      columnFilter: (() => {
        const column = elements.filterColumnSelect.value;
        const operator = elements.filterOperatorSelect.value;
        if (!column) return null;
        if (operator === 'BETWEEN') {
          return state.filterValue.trim() && state.filterValueTo.trim()
            ? { column, operator: 'BETWEEN', value: state.filterValue, valueTo: state.filterValueTo }
            : null;
        }
        return state.filterValue.trim()
          ? { column, operator, value: state.filterValue }
          : null;
      })()
    });
    state.tablePayloadByTab.set(tab.id, payload);
    state.relationLookupByTab.delete(tab.id);
    state.pendingRowsByTab.delete(tab.id);
    state.editsByTab.delete(tab.id);
    if ((state.selectedRowIndexByTab.get(tab.id) ?? -1) >= payload.rows.length) {
      state.selectedRowIndexByTab.delete(tab.id);
    }
    renderTableView();
  } catch (error) {
    showToast(error.message);
  }
}

function closeTab(tabId) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
  state.tablePayloadByTab.delete(tabId);
  state.selectedRowIndexByTab.delete(tabId);
  state.relationLookupByTab.delete(tabId);
  state.pendingRowsByTab.delete(tabId);
  state.editsByTab.delete(tabId);

  if (state.activeTabId === tabId) {
    state.activeTabId = state.tabs[Math.max(0, index - 1)]?.id || state.tabs[0]?.id || null;
  }

  render();
  renderTableView();
}

function getDateInputType(columnType) {
  if (!columnType) return null;
  const t = columnType.toLowerCase().replace(/\(.*\)/, '').trim();
  if (t === 'datetime' || t === 'timestamp') return 'datetime-local';
  if (t === 'date') return 'date';
  if (t === 'time') return 'time';
  return null;
}

function dbValueToInputValue(value, inputType) {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  if (inputType === 'datetime-local') return str.replace(' ', 'T').substring(0, 19);
  if (inputType === 'date') return str.substring(0, 10);
  return str;
}

function inputValueToDbValue(value, inputType) {
  if (!value) return '';
  if (inputType === 'datetime-local') {
    const withSeconds = value.length === 16 ? `${value}:00` : value;
    return withSeconds.replace('T', ' ');
  }
  if (inputType === 'time' && value.length === 5) return `${value}:00`;
  return value;
}

const datePickerState = { onCommit: null, onCancel: null };

function openDatePicker(td, tab, editKey, rawInputValue, inputType, originalHtml, originalClassName) {
  let done = false;

  td.classList.add('editing');
  td.classList.remove('edited-cell', 'edited-cell-error');

  elements.datePickerInput.type = inputType;
  if (inputType === 'datetime-local') elements.datePickerInput.step = '1';
  elements.datePickerInput.value = dbValueToInputValue(rawInputValue, inputType);
  elements.datePickerBackdrop.hidden = false;
  elements.datePicker.hidden = false;

  const rect = td.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 268);
  elements.datePicker.style.left = `${Math.max(8, left)}px`;
  elements.datePicker.style.top = `${rect.bottom + 4}px`;

  elements.datePickerInput.focus();
  try { elements.datePickerInput.showPicker(); } catch {}

  const close = () => {
    elements.datePickerBackdrop.hidden = true;
    elements.datePicker.hidden = true;
    datePickerState.onCommit = null;
    datePickerState.onCancel = null;
  };

  const commit = () => {
    if (done) return;
    done = true;
    close();
    td.classList.remove('editing');

    const val = inputValueToDbValue(elements.datePickerInput.value, inputType);
    const original = rawInputValue === null || rawInputValue === undefined ? '' : String(rawInputValue);

    if (val === original) {
      td.className = originalClassName;
      td.innerHTML = originalHtml;
      return;
    }

    const edits = state.editsByTab.get(tab.id) || new Map();
    edits.set(editKey, { value: val, error: null });
    state.editsByTab.set(tab.id, edits);
    td.classList.add('edited-cell');
    td.title = val;
    td.innerHTML = val === '' ? '<span class="muted-note">NULL</span>' : escapeHtml(val);
    elements.pendingActions.hidden = false;
  };

  const cancel = () => {
    if (done) return;
    done = true;
    close();
    td.className = originalClassName;
    td.innerHTML = originalHtml;
  };

  datePickerState.onCommit = commit;
  datePickerState.onCancel = cancel;
}

function openFilterDatePicker(inputType, currentValue, anchorEl, onConfirm) {
  if (datePickerState.onCancel) datePickerState.onCancel();

  let done = false;

  elements.datePickerInput.type = inputType;
  if (inputType === 'datetime-local') elements.datePickerInput.step = '1';
  elements.datePickerInput.value = dbValueToInputValue(currentValue, inputType);
  elements.datePickerBackdrop.hidden = false;
  elements.datePicker.hidden = false;

  const rect = anchorEl.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 268);
  elements.datePicker.style.left = `${Math.max(8, left)}px`;
  elements.datePicker.style.top = `${rect.bottom + 4}px`;

  elements.datePickerInput.focus();
  try { elements.datePickerInput.showPicker(); } catch {}

  const close = () => {
    elements.datePickerBackdrop.hidden = true;
    elements.datePicker.hidden = true;
    datePickerState.onCommit = null;
    datePickerState.onCancel = null;
  };

  const commit = () => {
    if (done) return;
    done = true;
    close();
    onConfirm(inputValueToDbValue(elements.datePickerInput.value, inputType));
  };

  const cancel = () => {
    if (done) return;
    done = true;
    close();
  };

  datePickerState.onCommit = commit;
  datePickerState.onCancel = cancel;
}

function getFilterColumnType() {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const col = payload?.columns?.find((c) => c.name === elements.filterColumnSelect.value);
  return col ? getDateInputType(col.type) : null;
}

function updateFilterValueUI() {
  const col = elements.filterColumnSelect.value;
  const dateType = col ? getFilterColumnType() : null;
  const isDate = Boolean(dateType);
  const operator = elements.filterOperatorSelect.value;
  const isBetween = operator === 'BETWEEN';

  elements.filterValueInput.hidden = isDate;
  elements.filterValueDateBtn.hidden = !isDate;
  elements.filterBetweenSep.hidden = !isBetween;
  elements.filterValueToDateBtn.hidden = !isBetween;

  elements.filterValueDateBtn.textContent = state.filterValue || (isBetween ? 'Van…' : 'Kies datum…');
  elements.filterValueToDateBtn.textContent = state.filterValueTo || 'Tot…';
}

elements.datePickerConfirm.addEventListener('click', () => datePickerState.onCommit?.());
elements.datePickerCancel.addEventListener('click', () => datePickerState.onCancel?.());

elements.datePickerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); datePickerState.onCommit?.(); }
  if (e.key === 'Escape') { e.preventDefault(); datePickerState.onCancel?.(); }
});

elements.datePickerBackdrop.addEventListener('click', () => datePickerState.onCancel?.());

function renderConnections() {
  const connection = getActiveConnection();

  if (state.sidebarView === 'tables' && connection) {
    const schema = state.schemaByConnection.get(connection.id);
    const activeTab = getActiveTab();
    const chevronLeft = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;

    const pencilIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    elements.sidebarNav.innerHTML = `
      <button class="sidebar-back-button" data-back-to-connections>${chevronLeft} Connecties</button>
      <div class="active-connection-info">
        <div class="active-connection-text">
          <span class="connection-name">${escapeHtml(connection.name)}</span>
          <span class="connection-path">${escapeHtml(getConnectionSummary(connection))}</span>
        </div>
        <button class="edit-connection-button icon-button" data-edit-connection-id="${escapeHtml(connection.id)}" title="Bewerk connectie" aria-label="Bewerk connectie">${pencilIcon}</button>
      </div>
    `;

    const tables = schema?.tables || [];
    elements.connectionsList.innerHTML = tables.length
      ? tables.map((table) => `
          <button class="table-button ${activeTab?.connectionId === connection.id && activeTab?.tableName === table.name ? 'active' : ''}"
                  data-table-name="${escapeHtml(table.name)}"
                  data-table-connection-id="${escapeHtml(connection.id)}">
            <span>
              <span class="table-name">${escapeHtml(table.name)}</span>
              <span class="table-kind">${escapeHtml(table.type)}</span>
            </span>
          </button>
        `).join('')
      : '<p class="muted-note">Geen tabellen gevonden.</p>';

    elements.connectionsList.dataset.view = 'tables';
  } else {
    elements.sidebarNav.innerHTML = '<div class="section-title">Connecties</div>';
    elements.connectionsList.innerHTML = '';
    elements.connectionsList.dataset.view = 'connections';

    if (!state.connections.length) {
      elements.connectionsList.innerHTML = '<p class="muted-note">Nog geen connecties. Maak er linksboven een aan.</p>';
      return;
    }

    for (const conn of state.connections) {
      const item = document.createElement('article');
      item.className = 'connection-item';
      item.innerHTML = `
        <button class="connection-button" data-connection-id="${escapeHtml(conn.id)}">
          <span>
            <span class="connection-name">${escapeHtml(conn.name)}</span>
            <span class="connection-path">${escapeHtml(getConnectionSummary(conn))}</span>
          </span>
        </button>
        <div class="connection-actions">
          <button class="icon-button" data-edit-connection-id="${escapeHtml(conn.id)}" title="Bewerk connectie" aria-label="Bewerk connectie">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-button connection-delete-button" data-remove-connection-id="${escapeHtml(conn.id)}" title="Verwijder connectie" aria-label="Verwijder connectie">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      `;
      elements.connectionsList.appendChild(item);
    }
  }
}

function renderTabs() {
  elements.tabsBar.innerHTML = state.tabs
    .map(
      (tab) => `
        <button class="tab-button ${tab.id === state.activeTabId ? 'active' : ''}" data-tab-id="${escapeHtml(tab.id)}">
          <span class="tab-label">${escapeHtml(tab.tableName)}</span>
          <span class="tab-close" data-close-tab-id="${escapeHtml(tab.id)}">x</span>
        </button>
      `
    )
    .join('');
}

function capturePendingInputValues() {
  const tab = getActiveTab();
  if (!tab) return;
  const pendingRows = state.pendingRowsByTab.get(tab.id);
  if (!pendingRows?.length) return;
  for (const pendingRow of pendingRows) {
    const rowEl = elements.dataTable.querySelector(`tr[data-pending-id="${pendingRow.id}"]`);
    if (!rowEl) continue;
    for (const input of rowEl.querySelectorAll('input[data-col]')) {
      pendingRow.values[input.dataset.col] = input.value;
    }
  }
}

function appendPendingRows(tab, columns) {
  if (!tab) return;
  const pendingRows = state.pendingRowsByTab.get(tab.id) || [];
  if (!pendingRows.length) return;
  const tbody = elements.dataTable.querySelector('tbody');
  if (!tbody) return;
  if (tbody.querySelector('.pending-row')) return;

  for (const pendingRow of pendingRows) {
    const tr = document.createElement('tr');
    tr.className = 'pending-row';
    tr.dataset.pendingId = pendingRow.id;

    for (const column of columns) {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.dataset.col = column.name;
      input.value = pendingRow.values[column.name] ?? '';
      input.placeholder = column.name;
      td.appendChild(input);
      tr.appendChild(td);
    }

    const actionsTd = document.createElement('td');
    actionsTd.className = 'pending-row-actions';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-button';
    removeBtn.dataset.removePendingId = pendingRow.id;
    removeBtn.title = 'Rij verwijderen';
    removeBtn.textContent = '×';
    actionsTd.appendChild(removeBtn);
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);

    if (pendingRow.error) {
      const errorTr = document.createElement('tr');
      errorTr.className = 'pending-row-error';
      const errorTd = document.createElement('td');
      errorTd.colSpan = columns.length + 1;
      errorTd.innerHTML = `<span class="insert-error">⚠ ${escapeHtml(pendingRow.error)}</span>`;
      errorTr.appendChild(errorTd);
      tbody.appendChild(errorTr);
    }
  }
}

function renderDataTable(payload) {
  const tab = getActiveTab();
  const columns = payload.columns || [];
  const rows = payload.rows || [];
  const selectedRowIndex = state.selectedRowIndexByTab.get(tab?.id);
  const edits = state.editsByTab.get(tab?.id) || new Map();

  const renderCell = (row, column, rowIndex) => {
    const editKey = `${rowIndex}:${column.name}`;
    const edit = edits.get(editKey);
    const rawValue = row[column.name];

    if (edit !== undefined) {
      const cellClass = edit.error ? 'edited-cell-error' : 'edited-cell';
      const content = edit.value === '' ? '<span class="muted-note">NULL</span>' : escapeHtml(edit.value);
      const titleText = edit.error ? edit.error : edit.value;
      return `<td class="${cellClass}" title="${escapeHtml(titleText)}">${content}</td>`;
    }

    const relationMatch = getOutgoingRelationByColumn(payload, column.name);

    if (!relationMatch) {
      return `<td title="${escapeHtml(formatPlainValue(rawValue))}">${formatValue(rawValue)}</td>`;
    }

    return `
      <td class="relation-cell" title="Open ${escapeHtml(relationMatch.relation.toTable)} voor ${escapeHtml(formatPlainValue(rawValue))}">
        <button
          class="relation-value-button"
          data-row-index="${rowIndex}"
          data-relation-kind="outgoing"
          data-relation-index="${relationMatch.index}"
        >
          ${formatValue(rawValue)}
        </button>
      </td>
    `;
  };
  elements.tableMeta.textContent = `${rows.length} rijen geladen, ${columns.length} kolommen`;
  elements.dataTable.innerHTML = `
    <thead>
      <tr>${columns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${
        rows.length
          ? rows
              .map(
                (row, index) => `
                  <tr class="${index === selectedRowIndex ? 'selected-row' : ''}" data-row-index="${index}">
                    ${columns.map((column) => renderCell(row, column, index)).join('')}
                  </tr>
                `
              )
              .join('')
          : `<tr><td colspan="${Math.max(columns.length, 1)}" class="muted-note">Geen rijen gevonden.</td></tr>`
      }
    </tbody>
  `;
  appendPendingRows(tab, columns);
}

function renderRelationRows(rows) {
  if (!rows.length) {
    return '<p class="muted-note">Geen gekoppelde rij gevonden.</p>';
  }

  return `
    <div class="relation-result-rows">
      ${rows
        .map(
          (row) => `
            <dl class="relation-result-row">
              ${Object.entries(row)
                .map(
                  ([key, value]) => `
                    <div>
                      <dt>${escapeHtml(key)}</dt>
                      <dd title="${escapeHtml(formatPlainValue(value))}">${formatValue(value)}</dd>
                    </div>
                  `
                )
                .join('')}
            </dl>
          `
        )
        .join('')}
    </div>
  `;
}

function renderStructureTable(payload) {
  const columns = payload.columns || [];
  elements.tableMeta.textContent = `${columns.length} kolommen in structuur`;
  elements.dataTable.innerHTML = `
    <thead>
      <tr>
        <th>Kolom</th>
        <th>Type</th>
        <th>Nullable</th>
        <th>Default</th>
        <th>Primary key</th>
      </tr>
    </thead>
    <tbody>
      ${columns
        .map(
          (column) => `
            <tr>
              <td>${escapeHtml(column.name)}</td>
              <td>${escapeHtml(column.type || '-')}</td>
              <td>${Number(column.notnull) ? 'Nee' : 'Ja'}</td>
              <td>${formatValue(column.dflt_value)}</td>
              <td>${Number(column.pk) ? 'Ja' : 'Nee'}</td>
            </tr>
          `
        )
        .join('')}
    </tbody>
  `;
}

function renderRelations(payload) {
  const outgoing = payload.relations?.outgoing || [];
  const incoming = payload.relations?.incoming || [];
  const tab = getActiveTab();
  const selectedRowIndex = state.selectedRowIndexByTab.get(tab?.id);
  const selectedRow = Number.isInteger(selectedRowIndex) ? payload.rows?.[selectedRowIndex] : null;
  const lookup = state.relationLookupByTab.get(tab?.id);
  const selectedNote = selectedRow
    ? `Geselecteerde rij ${selectedRowIndex + 1}`
    : 'Klik op een waarde in de foreign-key kolom.';
  const renderCard = (relation, kind, index) => {
    const relationKey = getRelationKey(kind, index);
    const isActive = lookup?.key === relationKey;
    const valueColumn = kind === 'outgoing' ? relation.fromColumn : relation.toColumn;
    const relationValue = selectedRow ? selectedRow[valueColumn] : undefined;
    const label = kind === 'outgoing' ? 'Verwijst naar' : 'Wordt gebruikt door';
    const title = kind === 'outgoing' ? relation.toTable : relation.fromTable;
    const lookupHtml = isActive
      ? `
        <div class="relation-result">
          <div class="relation-result-meta">
            <span>${escapeHtml(valueColumn)} = ${formatValue(lookup.value)}</span>
            <span>${lookup.status === 'loading' ? 'Laden...' : `${lookup.rows?.length || 0} gevonden`}</span>
          </div>
          ${lookup.status === 'error' ? `<p class="muted-note">${escapeHtml(lookup.error)}</p>` : ''}
          ${lookup.status === 'ready' ? renderRelationRows(lookup.rows || []) : ''}
        </div>
      `
      : '';

    return `
      <article class="relation-card ${isActive ? 'active' : ''}">
        <div class="relation-button">
          <span class="relation-kind">${label}</span>
          <strong>${escapeHtml(title)}</strong>
          <span class="relation-line">${escapeHtml(relation.fromTable)}.${escapeHtml(relation.fromColumn)} -> ${escapeHtml(relation.toTable)}.${escapeHtml(relation.toColumn)}</span>
          <span class="relation-value">${selectedRow ? `${escapeHtml(valueColumn)} = ${formatValue(relationValue)}` : escapeHtml(selectedNote)}</span>
        </div>
        ${lookupHtml}
      </article>
    `;
  };
  const cards = [
    ...outgoing.map((relation, index) => renderCard(relation, 'outgoing', index)),
    ...incoming.map((relation, index) => renderCard(relation, 'incoming', index))
  ];

  elements.relationsList.innerHTML = cards.length
    ? cards.join('')
    : '<p class="muted-note">Geen foreign key-relaties gevonden voor deze tabel.</p>';
}

function renderTableView() {
  capturePendingInputValues();

  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const activeConnection = state.connections.find((connection) => connection.id === tab?.connectionId);
  const pendingRows = state.pendingRowsByTab.get(tab?.id) || [];
  const edits = state.editsByTab.get(tab?.id);
  const hasPending = pendingRows.length > 0 || (edits && edits.size > 0);
  const isDataMode = state.mode === 'data';

  elements.emptyState.hidden = Boolean(tab);
  elements.tableView.hidden = !tab;
  elements.refreshButton.disabled = !activeConnection;
  elements.tableActions.hidden = !tab || !payload;
  elements.addRowButton.disabled = !isDataMode;
  elements.pendingActions.hidden = !hasPending || !isDataMode;
  elements.filterArea.hidden = !isDataMode;

  if (!tab) {
    elements.workspaceTitle.textContent = activeConnection ? 'Kies een tabel' : 'Open of maak een connectie';
    elements.activeConnectionLabel.textContent = activeConnection?.name || 'Geen connectie';
    elements.dataTable.innerHTML = '';
    elements.relationsList.innerHTML = '';
    return;
  }

  elements.workspaceTitle.textContent = tab.tableName;
  elements.activeConnectionLabel.textContent = tab.connectionName;
  elements.dataModeButton.classList.toggle('active', isDataMode);
  elements.structureModeButton.classList.toggle('active', state.mode === 'structure');
  elements.filterInput.disabled = !isDataMode;

  if (!payload) {
    elements.tableMeta.textContent = 'Laden...';
    elements.dataTable.innerHTML = '';
    elements.relationsList.innerHTML = '';
    return;
  }

  const cols = payload.columns || [];
  const savedCol = elements.filterColumnSelect.value;
  elements.filterColumnSelect.innerHTML =
    '<option value="">— kolom —</option>' +
    cols.map((col) => `<option value="${escapeHtml(col.name)}">${escapeHtml(col.name)}</option>`).join('');
  elements.filterColumnSelect.value = savedCol;
  updateFilterValueUI();

  if (state.mode === 'structure') {
    renderStructureTable(payload);
  } else {
    renderDataTable(payload);
  }
  renderRelations(payload);
}

async function loadRelationLookup(kind, index) {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  const selectedRowIndex = state.selectedRowIndexByTab.get(tab?.id);
  const selectedRow = Number.isInteger(selectedRowIndex) ? payload?.rows?.[selectedRowIndex] : null;

  if (!tab || !payload || !connection) {
    return;
  }

  if (!selectedRow) {
    showToast('Selecteer eerst een rij in de tabel.');
    return;
  }

  elements.relationsPanel.classList.remove('collapsed');

  const relation = kind === 'outgoing'
    ? payload.relations?.outgoing?.[index]
    : payload.relations?.incoming?.[index];

  if (!relation) {
    return;
  }

  const sourceColumn = kind === 'outgoing' ? relation.fromColumn : relation.toColumn;
  const targetTable = kind === 'outgoing' ? relation.toTable : relation.fromTable;
  const targetColumn = kind === 'outgoing' ? relation.toColumn : relation.fromColumn;
  const value = selectedRow[sourceColumn];
  const key = getRelationKey(kind, index);

  state.relationLookupByTab.set(tab.id, {
    key,
    status: 'loading',
    value,
    rows: []
  });
  renderRelations(payload);

  try {
    const result = await window.sqlBase.loadRelationRows({
      connection,
      tableName: targetTable,
      columnName: targetColumn,
      value
    });

    state.relationLookupByTab.set(tab.id, {
      key,
      status: 'ready',
      value,
      rows: result.rows || []
    });
  } catch (error) {
    state.relationLookupByTab.set(tab.id, {
      key,
      status: 'error',
      value,
      rows: [],
      error: error.message
    });
  }

  renderRelations(payload);
}

async function saveAll() {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || !payload || !connection) return;

  capturePendingInputValues();

  // Process edits (UPDATEs)
  const edits = state.editsByTab.get(tab.id);
  if (edits && edits.size > 0) {
    const editsByRow = new Map();
    for (const [key, edit] of edits) {
      const colonIdx = key.indexOf(':');
      const rowIndex = Number(key.slice(0, colonIdx));
      const colName = key.slice(colonIdx + 1);
      if (!editsByRow.has(rowIndex)) editsByRow.set(rowIndex, {});
      editsByRow.get(rowIndex)[colName] = edit.value === '' ? null : edit.value;
    }

    const pkColumns = payload.columns.filter((col) => Number(col.pk));
    const updateOps = [];
    for (const [rowIndex, setValues] of editsByRow) {
      const originalRow = payload.rows[rowIndex];
      const whereValues = pkColumns.length > 0
        ? Object.fromEntries(pkColumns.map((col) => [col.name, originalRow[col.name]]))
        : { ...originalRow };
      updateOps.push({ rowIndex, setValues, whereValues });
    }

    try {
      const results = await window.sqlBase.updateRows({
        connection,
        tableName: tab.tableName,
        updates: updateOps.map(({ setValues, whereValues }) => ({ setValues, whereValues }))
      });
      const newEdits = new Map(edits);
      for (let i = 0; i < updateOps.length; i++) {
        const { rowIndex, setValues } = updateOps[i];
        if (results[i].ok) {
          for (const colName of Object.keys(setValues)) newEdits.delete(`${rowIndex}:${colName}`);
        } else {
          for (const colName of Object.keys(setValues)) {
            const k = `${rowIndex}:${colName}`;
            if (newEdits.has(k)) newEdits.set(k, { ...newEdits.get(k), error: results[i].error });
          }
        }
      }
      state.editsByTab.set(tab.id, newEdits);
    } catch (error) {
      showToast(error.message);
    }
  }

  // Process pending rows (INSERTs)
  const pendingRows = state.pendingRowsByTab.get(tab.id) || [];
  if (pendingRows.length > 0) {
    try {
      const results = await window.sqlBase.insertRows({
        connection,
        tableName: tab.tableName,
        rows: pendingRows.map((r) => r.values)
      });
      const failedRows = pendingRows
        .map((row, i) => (results[i].ok ? null : { ...row, error: results[i].error }))
        .filter(Boolean);
      state.pendingRowsByTab.set(tab.id, failedRows);
    } catch (error) {
      showToast(error.message);
    }
  }

  const remainingEdits = state.editsByTab.get(tab.id);
  const remainingPending = state.pendingRowsByTab.get(tab.id) || [];
  if ((!remainingEdits || remainingEdits.size === 0) && remainingPending.length === 0) {
    await loadActiveTable();
  } else {
    renderTableView();
  }
}

function render() {
  renderConnections();
  renderTabs();
  renderTableView();
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('sqlbase.theme', next); } catch {}
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('sqlbase.theme'); } catch {}
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
})();

elements.themeToggleButton.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

elements.newConnectionButton.addEventListener('click', () => {
  if (elements.connectionForm.hidden) {
    openConnectionForm('mariadb');
  } else {
    elements.connectionForm.hidden = true;
  }
});

elements.cancelConnectionButton.addEventListener('click', () => {
  elements.connectionForm.hidden = true;
});

elements.saveConnectionButton.addEventListener('click', () => {
  saveConnection(getConnectionFromForm());
});

elements.connectionTypeSelect.addEventListener('change', () => {
  setConnectionFormType(elements.connectionTypeSelect.value);
});

elements.sidebarNav.addEventListener('click', (event) => {
  if (event.target.closest('[data-back-to-connections]')) {
    state.sidebarView = 'connections';
    render();
    return;
  }

  const editButton = event.target.closest('[data-edit-connection-id]');
  if (editButton) {
    const conn = state.connections.find((c) => c.id === editButton.dataset.editConnectionId);
    if (conn) openConnectionForm(conn.type, conn);
  }
});

elements.connectionsList.addEventListener('click', async (event) => {
  const connectionButton = event.target.closest('[data-connection-id]');
  const tableButton = event.target.closest('[data-table-name]');
  const removeButton = event.target.closest('[data-remove-connection-id]');
  const editButton = event.target.closest('[data-edit-connection-id]');

  if (removeButton) {
    const conn = state.connections.find((c) => c.id === removeButton.dataset.removeConnectionId);
    if (conn && !confirm(`Connectie "${conn.name}" verwijderen?`)) return;
    await removeConnection(removeButton.dataset.removeConnectionId);
    return;
  }

  if (editButton) {
    const conn = state.connections.find((c) => c.id === editButton.dataset.editConnectionId);
    if (conn) openConnectionForm(conn.type, conn);
    return;
  }

  if (tableButton) {
    const connection = state.connections.find((item) => item.id === tableButton.dataset.tableConnectionId);
    if (connection) {
      state.activeConnectionId = connection.id;
      await openTable(connection, tableButton.dataset.tableName);
    }
    return;
  }

  if (connectionButton) {
    state.activeConnectionId = connectionButton.dataset.connectionId;
    state.sidebarView = 'tables';
    if (!state.schemaByConnection.has(state.activeConnectionId)) {
      await loadSchemaForActiveConnection();
    }
    render();
  }
});

elements.tabsBar.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-close-tab-id]');
  const tabButton = event.target.closest('[data-tab-id]');

  if (closeButton) {
    event.stopPropagation();
    closeTab(closeButton.dataset.closeTabId);
    return;
  }

  if (tabButton) {
    state.activeTabId = tabButton.dataset.tabId;
    render();
    loadActiveTable();
  }
});

elements.dataModeButton.addEventListener('click', () => {
  state.mode = 'data';
  renderTableView();
});

elements.structureModeButton.addEventListener('click', () => {
  state.mode = 'structure';
  renderTableView();
});

elements.filterInput.addEventListener('input', () => {
  clearTimeout(state.filterTimer);
  state.filterTimer = setTimeout(loadActiveTable, 220);
});

elements.filterModeToggle.addEventListener('click', () => {
  const toColumn = state.filterMode === 'text';
  state.filterMode = toColumn ? 'column' : 'text';
  elements.filterTextMode.hidden = toColumn;
  elements.filterColumnMode.hidden = !toColumn;
  elements.filterModeToggle.classList.toggle('active', toColumn);
  if (!toColumn) {
    state.filterValue = '';
    state.filterValueTo = '';
    elements.filterColumnSelect.value = '';
    elements.filterOperatorSelect.value = '=';
    elements.filterValueInput.value = '';
    loadActiveTable();
  } else {
    elements.filterColumnSelect.focus();
  }
});

elements.filterColumnSelect.addEventListener('change', () => {
  state.filterValue = '';
  state.filterValueTo = '';
  elements.filterValueInput.value = '';
  updateFilterValueUI();
  loadActiveTable();
});

elements.filterOperatorSelect.addEventListener('change', () => {
  state.filterValueTo = '';
  updateFilterValueUI();
  if (state.filterValue.trim()) loadActiveTable();
});

elements.filterValueInput.addEventListener('input', () => {
  state.filterValue = elements.filterValueInput.value;
  clearTimeout(state.filterTimer);
  if (elements.filterColumnSelect.value) state.filterTimer = setTimeout(loadActiveTable, 220);
});

elements.filterValueDateBtn.addEventListener('click', () => {
  const dateType = getFilterColumnType();
  if (!dateType) return;
  openFilterDatePicker(dateType, state.filterValue, elements.filterValueDateBtn, (val) => {
    state.filterValue = val;
    updateFilterValueUI();
    if (elements.filterOperatorSelect.value !== 'BETWEEN' || state.filterValueTo.trim()) loadActiveTable();
  });
});

elements.filterValueToDateBtn.addEventListener('click', () => {
  const dateType = getFilterColumnType();
  if (!dateType) return;
  openFilterDatePicker(dateType, state.filterValueTo, elements.filterValueToDateBtn, (val) => {
    state.filterValueTo = val;
    updateFilterValueUI();
    if (state.filterValue.trim()) loadActiveTable();
  });
});

elements.limitInput.addEventListener('change', loadActiveTable);

elements.dataTable.addEventListener('click', async (event) => {
  const tab = getActiveTab();
  if (!tab) return;

  const removePendingButton = event.target.closest('[data-remove-pending-id]');
  if (removePendingButton) {
    const pendingId = removePendingButton.dataset.removePendingId;
    const pendingRows = state.pendingRowsByTab.get(tab.id) || [];
    state.pendingRowsByTab.set(tab.id, pendingRows.filter((r) => r.id !== pendingId));
    renderTableView();
    return;
  }

  const relationValueButton = event.target.closest('[data-relation-kind]');
  const row = event.target.closest('[data-row-index]');

  if (!row) return;

  // Update selected row class directly — do NOT call renderTableView() here
  // because that would rebuild the DOM and break dblclick-to-edit detection.
  elements.dataTable.querySelector('.selected-row')?.classList.remove('selected-row');
  row.classList.add('selected-row');

  state.selectedRowIndexByTab.set(tab.id, Number(row.dataset.rowIndex));
  state.relationLookupByTab.delete(tab.id);

  const payload = state.tablePayloadByTab.get(tab.id);
  if (payload) renderRelations(payload);

  if (relationValueButton) {
    await loadRelationLookup(
      relationValueButton.dataset.relationKind,
      Number(relationValueButton.dataset.relationIndex)
    );
  }
});

elements.addRowButton.addEventListener('click', () => {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload) return;

  capturePendingInputValues();

  const columns = payload.columns || [];
  const values = Object.fromEntries(columns.map((col) => [col.name, '']));
  const pendingRows = state.pendingRowsByTab.get(tab.id) || [];
  pendingRows.push({ id: crypto.randomUUID(), values, error: null });
  state.pendingRowsByTab.set(tab.id, pendingRows);
  renderTableView();

  const allPendingRows = elements.dataTable.querySelectorAll('.pending-row');
  allPendingRows[allPendingRows.length - 1]?.querySelector('input')?.focus();
});

elements.saveRowsButton.addEventListener('click', saveAll);

elements.discardRowsButton.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  state.pendingRowsByTab.delete(tab.id);
  state.editsByTab.delete(tab.id);
  renderTableView();
});

elements.dataTable.addEventListener('dblclick', (event) => {
  const td = event.target.closest('td');
  const row = td?.closest('tr[data-row-index]');
  if (!td || !row || td.classList.contains('relation-cell')) return;
  if (td.querySelector('input[data-edit-input]')) return;

  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload || state.mode !== 'data') return;

  const rowIndex = Number(row.dataset.rowIndex);
  const colIndex = [...row.children].indexOf(td);
  const column = payload.columns[colIndex];
  if (!column) return;

  const editKey = `${rowIndex}:${column.name}`;
  const existingEdit = state.editsByTab.get(tab.id)?.get(editKey);
  const rawValue = payload.rows[rowIndex]?.[column.name];
  const inputValue = existingEdit !== undefined
    ? existingEdit.value
    : (rawValue === null || rawValue === undefined ? '' : String(rawValue));

  const originalHtml = td.innerHTML;
  const originalClassName = td.className;

  const dateInputType = getDateInputType(column.type);
  if (dateInputType) {
    openDatePicker(td, tab, editKey, inputValue, dateInputType, originalHtml, originalClassName);
    return;
  }

  let done = false;

  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.editInput = '1';
  input.value = inputValue;

  td.innerHTML = '';
  td.classList.add('editing');
  td.classList.remove('edited-cell', 'edited-cell-error');
  td.appendChild(input);
  input.focus();
  input.select();

  const commit = () => {
    if (done) return;
    done = true;
    const val = input.value;

    if (val === inputValue) {
      td.className = originalClassName;
      td.innerHTML = originalHtml;
      return;
    }

    const edits = state.editsByTab.get(tab.id) || new Map();
    edits.set(editKey, { value: val, error: null });
    state.editsByTab.set(tab.id, edits);
    td.classList.remove('editing');
    td.classList.add('edited-cell');
    td.title = val;
    td.innerHTML = val === '' ? '<span class="muted-note">NULL</span>' : escapeHtml(val);
    elements.pendingActions.hidden = false;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (done) return;
      done = true;
      renderTableView();
    }
  });

  input.addEventListener('blur', commit);
});

elements.relationsToggle.addEventListener('click', () => {
  elements.relationsPanel.classList.toggle('collapsed');
});

elements.refreshButton.addEventListener('click', async () => {
  await loadSchemaForActiveConnection();
  await loadActiveTable();
  render();
});

window.sqlBase.onConnectionFileSelected((payload) => {
  openConnectionForm('sqlite', payload);
  saveConnection({ ...payload, type: 'sqlite' });
});

window.sqlBase.onNewMariaDbConnection(() => {
  openConnectionForm('mariadb');
});

setConnectionFormType('mariadb');
loadConnections();
