const state = {
  connections: [],
  activeConnectionId: null,
  schemaByConnection: new Map(),
  tabs: [],
  activeTabId: null,
  tablePayloadByTab: new Map(),
  selectedRowIndexByTab: new Map(),
  relationLookupByTab: new Map(),
  mode: 'data',
  filterTimer: null
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
  limitInput: document.querySelector('#limitInput'),
  tableMeta: document.querySelector('#tableMeta'),
  dataTable: document.querySelector('#dataTable'),
  relationsList: document.querySelector('#relationsList'),
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
  elements.connectionNameInput.value = '';
  elements.connectionPathInput.value = '';
  elements.mariaHostInput.value = '127.0.0.1';
  elements.mariaPortInput.value = '3306';
  elements.mariaUserInput.value = '';
  elements.mariaPasswordInput.value = '';
  elements.mariaDatabaseInput.value = '';
}

function getConnectionFromForm() {
  if (elements.connectionTypeSelect.value === 'sqlite') {
    return {
      type: 'sqlite',
      name: elements.connectionNameInput.value,
      path: elements.connectionPathInput.value
    };
  }

  return {
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
    }
  }
  if (state.activeConnectionId === connectionId) {
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
  elements.filterInput.value = '';
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
      limit: elements.limitInput.value
    });
    state.tablePayloadByTab.set(tab.id, payload);
    state.relationLookupByTab.delete(tab.id);
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

  if (state.activeTabId === tabId) {
    state.activeTabId = state.tabs[Math.max(0, index - 1)]?.id || state.tabs[0]?.id || null;
  }

  render();
  renderTableView();
}

function renderConnections() {
  const scrollPositions = new Map();
  for (const item of elements.connectionsList.querySelectorAll('.connection-item')) {
    const idEl = item.querySelector('[data-connection-id]');
    const list = item.querySelector('.tables-list');
    if (idEl && list && list.scrollTop > 0) {
      scrollPositions.set(idEl.dataset.connectionId, list.scrollTop);
    }
  }

  elements.connectionsList.innerHTML = '';

  if (!state.connections.length) {
    elements.connectionsList.innerHTML = '<p class="muted-note">Nog geen connecties. Maak er linksboven een aan.</p>';
    return;
  }

  for (const connection of state.connections) {
    const schema = state.schemaByConnection.get(connection.id);
    const item = document.createElement('article');
    item.className = 'connection-item';
    item.innerHTML = `
      <button class="connection-button ${connection.id === state.activeConnectionId ? 'active' : ''}" data-connection-id="${escapeHtml(connection.id)}">
        <span>
          <span class="connection-name">${escapeHtml(connection.name)}</span>
          <span class="connection-path">${escapeHtml(getConnectionSummary(connection))}</span>
        </span>
      </button>
      <div class="connection-actions">
        <button class="remove-button" data-remove-connection-id="${escapeHtml(connection.id)}">Verwijder</button>
      </div>
      <div class="tables-list">
        ${(schema?.tables || [])
          .map(
            (table) => `
              <button class="table-button ${getActiveTab()?.connectionId === connection.id && getActiveTab()?.tableName === table.name ? 'active' : ''}" data-table-name="${escapeHtml(table.name)}" data-table-connection-id="${escapeHtml(connection.id)}">
                <span>
                  <span class="table-name">${escapeHtml(table.name)}</span>
                  <span class="table-kind">${escapeHtml(table.type)}</span>
                </span>
              </button>
            `
          )
          .join('')}
      </div>
    `;

    elements.connectionsList.appendChild(item);
  }

  for (const item of elements.connectionsList.querySelectorAll('.connection-item')) {
    const idEl = item.querySelector('[data-connection-id]');
    const list = item.querySelector('.tables-list');
    const saved = idEl ? scrollPositions.get(idEl.dataset.connectionId) : undefined;
    if (list && saved) {
      list.scrollTop = saved;
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

function renderDataTable(payload) {
  const tab = getActiveTab();
  const columns = payload.columns || [];
  const rows = payload.rows || [];
  const selectedRowIndex = state.selectedRowIndexByTab.get(tab?.id);
  const renderCell = (row, column, rowIndex) => {
    const relationMatch = getOutgoingRelationByColumn(payload, column.name);
    const value = row[column.name];

    if (!relationMatch) {
      return `<td title="${escapeHtml(formatPlainValue(value))}">${formatValue(value)}</td>`;
    }

    return `
      <td class="relation-cell" title="Open ${escapeHtml(relationMatch.relation.toTable)} voor ${escapeHtml(formatPlainValue(value))}">
        <button
          class="relation-value-button"
          data-row-index="${rowIndex}"
          data-relation-kind="outgoing"
          data-relation-index="${relationMatch.index}"
        >
          ${formatValue(value)}
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
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const activeConnection = state.connections.find((connection) => connection.id === tab?.connectionId);

  elements.emptyState.hidden = Boolean(tab);
  elements.tableView.hidden = !tab;
  elements.refreshButton.disabled = !activeConnection;

  if (!tab) {
    elements.workspaceTitle.textContent = activeConnection ? 'Kies een tabel' : 'Open of maak een connectie';
    elements.activeConnectionLabel.textContent = activeConnection?.name || 'Geen connectie';
    elements.dataTable.innerHTML = '';
    elements.relationsList.innerHTML = '';
    return;
  }

  elements.workspaceTitle.textContent = tab.tableName;
  elements.activeConnectionLabel.textContent = tab.connectionName;
  elements.dataModeButton.classList.toggle('active', state.mode === 'data');
  elements.structureModeButton.classList.toggle('active', state.mode === 'structure');
  elements.filterInput.disabled = state.mode !== 'data';

  if (!payload) {
    elements.tableMeta.textContent = 'Laden...';
    elements.dataTable.innerHTML = '';
    elements.relationsList.innerHTML = '';
    return;
  }

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

elements.connectionsList.addEventListener('click', async (event) => {
  const connectionButton = event.target.closest('[data-connection-id]');
  const tableButton = event.target.closest('[data-table-name]');
  const removeButton = event.target.closest('[data-remove-connection-id]');

  if (removeButton) {
    await removeConnection(removeButton.dataset.removeConnectionId);
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

elements.limitInput.addEventListener('change', loadActiveTable);

elements.dataTable.addEventListener('click', async (event) => {
  const relationValueButton = event.target.closest('[data-relation-kind]');
  const row = event.target.closest('[data-row-index]');
  const tab = getActiveTab();

  if (!row || !tab) {
    return;
  }

  state.selectedRowIndexByTab.set(tab.id, Number(row.dataset.rowIndex));
  state.relationLookupByTab.delete(tab.id);
  renderTableView();

  if (relationValueButton) {
    await loadRelationLookup(
      relationValueButton.dataset.relationKind,
      Number(relationValueButton.dataset.relationIndex)
    );
  }
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
