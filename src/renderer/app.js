const state = {
  connections: [],
  activeConnectionId: null,
  schemaByConnection: new Map(),
  tabs: [],
  activeTabId: null,
  tablePayloadByTab: new Map(),
  selectedRowsByTab: new Map(),
  anchorRowByTab: new Map(),
  relationLookupByTab: new Map(),
  pendingRowsByTab: new Map(),
  editsByTab: new Map(),
  sidebarView: 'connections',
  editingConnectionId: null,
  mode: 'data',
  filterTimer: null,
  filterMode: 'text',
  filterValue: '',
  filterValueTo: '',
  copiedRows: null,
  draggingConnectionId: null,
  focusGroupId: null,
  openColorConnectionId: null,
  sshSessionByTab: new Map(),
  sshOutputByTab: new Map(),
  sortByTab: new Map()
};

const connectionColorOptions = [
  { value: '#ffffff', label: 'Wit' },
  { value: '#ef4444', label: 'Rood' },
  { value: '#f97316', label: 'Oranje' },
  { value: '#eab308', label: 'Geel' },
  { value: '#22c55e', label: 'Groen' },
  { value: '#3b82f6', label: 'Blauw' },
  { value: '#8b5cf6', label: 'Paars' },
  { value: '#64748b', label: 'Grijs' }
];

const elements = {
  themeToggleButton: document.querySelector('#themeToggleButton'),
  newConnectionButton: document.querySelector('#newConnectionButton'),
  connectionForm: document.querySelector('#connectionForm'),
  connectionFormBackdrop: document.querySelector('#connectionFormBackdrop'),
  connectionFormCloseButton: document.querySelector('#connectionFormCloseButton'),
  connectionTypeSelect: document.querySelector('#connectionTypeSelect'),
  connectionNameInput: document.querySelector('#connectionNameInput'),
  mariaFields: document.querySelector('#mariaFields'),
  mariaConnectionModeSelect: document.querySelector('#mariaConnectionModeSelect'),
  mariaHostInput: document.querySelector('#mariaHostInput'),
  mariaPortInput: document.querySelector('#mariaPortInput'),
  mariaUserInput: document.querySelector('#mariaUserInput'),
  mariaPasswordInput: document.querySelector('#mariaPasswordInput'),
  mariaDatabaseInput: document.querySelector('#mariaDatabaseInput'),
  mariaSshTunnelFields: document.querySelector('#mariaSshTunnelFields'),
  mariaSshHostInput: document.querySelector('#mariaSshHostInput'),
  mariaSshPortInput: document.querySelector('#mariaSshPortInput'),
  mariaSshUserInput: document.querySelector('#mariaSshUserInput'),
  mariaSshPasswordInput: document.querySelector('#mariaSshPasswordInput'),
  mariaSshKeyPathInput: document.querySelector('#mariaSshKeyPathInput'),
  sqlitePathField: document.querySelector('#sqlitePathField'),
  connectionPathInput: document.querySelector('#connectionPathInput'),
  sshFields: document.querySelector('#sshFields'),
  sshHostInput: document.querySelector('#sshHostInput'),
  sshPortInput: document.querySelector('#sshPortInput'),
  sshUserInput: document.querySelector('#sshUserInput'),
  sshPasswordInput: document.querySelector('#sshPasswordInput'),
  sshKeyPathInput: document.querySelector('#sshKeyPathInput'),
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
  sshView: document.querySelector('#sshView'),
  sshTerminalOutput: document.querySelector('#sshTerminalOutput'),
  sshTerminalForm: document.querySelector('#sshTerminalForm'),
  sshTerminalInput: document.querySelector('#sshTerminalInput'),
  sshOpenTerminalButton: document.querySelector('#sshOpenTerminalButton'),
  sshDisconnectButton: document.querySelector('#sshDisconnectButton'),
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
  toast: document.querySelector('#toast'),
  sqlButton: document.querySelector('#sqlButton'),
  sqlBackdrop: document.querySelector('#sqlBackdrop'),
  sqlDialog: document.querySelector('#sqlDialog'),
  sqlDialogTitle: document.querySelector('#sqlDialogTitle'),
  sqlDialogClose: document.querySelector('#sqlDialogClose'),
  sqlTextarea: document.querySelector('#sqlTextarea'),
  sqlRunButton: document.querySelector('#sqlRunButton'),
  sqlResult: document.querySelector('#sqlResult'),
  readOnlyBadge: document.querySelector('#readOnlyBadge'),
  connectionReadOnlyRow: document.querySelector('#connectionReadOnlyRow'),
  connectionReadOnlyCheckbox: document.querySelector('#connectionReadOnlyCheckbox')
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

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ''));
}

function isConnectionColor(value) {
  return connectionColorOptions.some((option) => option.value === String(value || '').toLowerCase());
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
  if (connection.type === 'ssh') {
    return `${connection.user}@${connection.host}:${connection.port || 22}`;
  }

  if (connection.type === 'mariadb') {
    const databaseTarget = `${connection.user}@${connection.host}:${connection.port}/${connection.database}`;
    return connection.sshTunnel
      ? `${databaseTarget} via ${connection.sshTunnel.user}@${connection.sshTunnel.host}:${connection.sshTunnel.port || 22}`
      : databaseTarget;
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

  if (left.type === 'ssh') {
    return left.host === right.host
      && Number(left.port) === Number(right.port)
      && left.user === right.user;
  }

  return left.host === right.host
    && Number(left.port) === Number(right.port)
    && left.user === right.user
    && left.database === right.database;
}

function isConnectionActive(connection) {
  if (connection.type === 'ssh') {
    return state.tabs.some((tab) => (
      tab.connectionId === connection.id
      && state.sshSessionByTab.has(tab.id)
    ));
  }

  return state.schemaByConnection.has(connection.id)
    || state.tabs.some((tab) => tab.connectionId === connection.id);
}

function getConnectionTypeIcon(type) {
  return type === 'ssh'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>';
}

function setConnectionFormType(type) {
  const normalizedType = ['sqlite', 'ssh'].includes(type) ? type : 'mariadb';
  elements.connectionTypeSelect.value = normalizedType;
  elements.mariaFields.hidden = normalizedType !== 'mariadb';
  elements.sqlitePathField.hidden = normalizedType !== 'sqlite';
  elements.sshFields.hidden = normalizedType !== 'ssh';
  elements.mariaSshTunnelFields.hidden = normalizedType !== 'mariadb'
    || elements.mariaConnectionModeSelect.value !== 'ssh';
  elements.connectionReadOnlyRow.hidden = normalizedType === 'ssh';
}

function openConnectionForm(type = 'mariadb', preset = {}) {
  state.editingConnectionId = preset.id || null;
  elements.connectionFormTitle.textContent = state.editingConnectionId ? 'Connectie bewerken' : 'Nieuwe connectie';
  elements.connectionForm.hidden = false;
  elements.connectionFormBackdrop.hidden = false;
  setConnectionFormType(type);
  elements.connectionNameInput.value = preset.name || '';
  elements.connectionPathInput.value = preset.path || '';
  elements.mariaConnectionModeSelect.value = preset.sshTunnel ? 'ssh' : 'direct';
  elements.mariaHostInput.value = preset.host || '127.0.0.1';
  elements.mariaPortInput.value = preset.port || '3306';
  elements.mariaUserInput.value = preset.user || '';
  elements.mariaPasswordInput.value = preset.password || '';
  elements.mariaDatabaseInput.value = preset.database || '';
  elements.mariaSshHostInput.value = preset.sshTunnel?.host || '';
  elements.mariaSshPortInput.value = preset.sshTunnel?.port || '22';
  elements.mariaSshUserInput.value = preset.sshTunnel?.user || '';
  elements.mariaSshPasswordInput.value = preset.sshTunnel?.password || '';
  elements.mariaSshKeyPathInput.value = preset.sshTunnel?.keyPath || '';
  elements.sshHostInput.value = preset.type === 'ssh' ? (preset.host || '') : '';
  elements.sshPortInput.value = preset.type === 'ssh' ? (preset.port || '22') : '22';
  elements.sshUserInput.value = preset.type === 'ssh' ? (preset.user || '') : '';
  elements.sshPasswordInput.value = preset.type === 'ssh' ? (preset.password || '') : '';
  elements.sshKeyPathInput.value = preset.type === 'ssh' ? (preset.keyPath || '') : '';
  elements.connectionReadOnlyCheckbox.checked = preset.readOnly || false;
  setConnectionFormType(type);
  const focusEl = type === 'sqlite'
    ? elements.connectionPathInput
    : type === 'ssh'
      ? elements.sshHostInput
      : elements.mariaUserInput;
  focusEl.focus();
}

function closeConnectionForm() {
  elements.connectionForm.hidden = true;
  elements.connectionFormBackdrop.hidden = true;
}

function resetConnectionForm() {
  state.editingConnectionId = null;
  elements.connectionNameInput.value = '';
  elements.connectionPathInput.value = '';
  elements.mariaConnectionModeSelect.value = 'direct';
  elements.mariaHostInput.value = '127.0.0.1';
  elements.mariaPortInput.value = '3306';
  elements.mariaUserInput.value = '';
  elements.mariaPasswordInput.value = '';
  elements.mariaDatabaseInput.value = '';
  elements.mariaSshHostInput.value = '';
  elements.mariaSshPortInput.value = '22';
  elements.mariaSshUserInput.value = '';
  elements.mariaSshPasswordInput.value = '';
  elements.mariaSshKeyPathInput.value = '';
  elements.sshHostInput.value = '';
  elements.sshPortInput.value = '22';
  elements.sshUserInput.value = '';
  elements.sshPasswordInput.value = '';
  elements.sshKeyPathInput.value = '';
  elements.connectionReadOnlyCheckbox.checked = false;
}

function getConnectionFromForm() {
  const id = state.editingConnectionId || undefined;
  const existingConnection = id ? state.connections.find((connection) => connection.id === id) : null;
  const existingBackgroundColor = existingConnection?.backgroundColor;
  const existingGroup = existingConnection?.groupId
    ? { groupId: existingConnection.groupId, groupName: existingConnection.groupName }
    : {};

  if (elements.connectionTypeSelect.value === 'sqlite') {
    return {
      ...(id ? { id } : {}),
      type: 'sqlite',
      name: elements.connectionNameInput.value,
      path: elements.connectionPathInput.value,
      ...(elements.connectionReadOnlyCheckbox.checked ? { readOnly: true } : {}),
      ...(existingBackgroundColor ? { backgroundColor: existingBackgroundColor } : {}),
      ...existingGroup
    };
  }

  if (elements.connectionTypeSelect.value === 'ssh') {
    return {
      ...(id ? { id } : {}),
      type: 'ssh',
      name: elements.connectionNameInput.value || elements.sshHostInput.value,
      host: elements.sshHostInput.value,
      port: elements.sshPortInput.value || '22',
      user: elements.sshUserInput.value,
      password: elements.sshPasswordInput.value,
      keyPath: elements.sshKeyPathInput.value,
      ...(existingBackgroundColor ? { backgroundColor: existingBackgroundColor } : {}),
      ...existingGroup
    };
  }

  const sshTunnel = elements.mariaConnectionModeSelect.value === 'ssh'
    ? {
        host: elements.mariaSshHostInput.value,
        port: elements.mariaSshPortInput.value || '22',
        user: elements.mariaSshUserInput.value,
        password: elements.mariaSshPasswordInput.value,
        keyPath: elements.mariaSshKeyPathInput.value
      }
    : null;

  return {
    ...(id ? { id } : {}),
    type: 'mariadb',
    name: elements.connectionNameInput.value || elements.mariaDatabaseInput.value,
    host: elements.mariaHostInput.value || '127.0.0.1',
    port: elements.mariaPortInput.value || '3306',
    user: elements.mariaUserInput.value,
    password: elements.mariaPasswordInput.value,
    database: elements.mariaDatabaseInput.value,
    ...(sshTunnel ? { sshTunnel } : {}),
    ...(elements.connectionReadOnlyCheckbox.checked ? { readOnly: true } : {}),
    ...(existingBackgroundColor ? { backgroundColor: existingBackgroundColor } : {}),
    ...existingGroup
  };
}

async function loadConnections() {
  try {
    state.connections = await window.sqlBase.listConnections();
    if (!state.activeConnectionId && state.connections.length) {
      state.activeConnectionId = state.connections[0].id;
      if (state.connections[0].type !== 'ssh') {
        await loadSchemaForActiveConnection();
      }
    }
  } catch (error) {
    state.connections = [];
    state.activeConnectionId = null;
    showToast(error.message);
  }

  render();
}

async function loadSchemaForActiveConnection() {
  const connection = getActiveConnection();
  if (!connection) {
    return;
  }

  if (connection.type === 'ssh') {
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
    if (result.connection.type !== 'ssh') {
      state.schemaByConnection.set(result.connection.id, { tables: result.tables });
    }
    elements.connectionForm.hidden = true;
    elements.connectionFormBackdrop.hidden = true;
    resetConnectionForm();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function removeConnection(connectionId) {
  for (const tab of state.tabs.filter((item) => item.connectionId === connectionId)) {
    const sshSessionId = state.sshSessionByTab.get(tab.id);
    if (sshSessionId) {
      window.sqlBase.stopSsh(sshSessionId);
    }
    state.sshSessionByTab.delete(tab.id);
    state.sshOutputByTab.delete(tab.id);
  }
  state.connections = await window.sqlBase.removeConnection(connectionId);
  state.schemaByConnection.delete(connectionId);
  state.tabs = state.tabs.filter((tab) => tab.connectionId !== connectionId);
  for (const tabId of [...state.selectedRowsByTab.keys()]) {
    if (!state.tabs.some((tab) => tab.id === tabId)) {
      state.selectedRowsByTab.delete(tabId);
      state.anchorRowByTab.delete(tabId);
      state.relationLookupByTab.delete(tabId);
      state.pendingRowsByTab.delete(tabId);
      state.editsByTab.delete(tabId);
    }
  }
  if (state.activeConnectionId === connectionId) {
    state.sidebarView = 'connections';
    state.activeConnectionId = state.connections[0]?.id || null;
    const activeConnection = getActiveConnection();
    if (activeConnection && activeConnection.type !== 'ssh') {
      await loadSchemaForActiveConnection();
    }
  }
  state.activeTabId = state.tabs[0]?.id || null;
  render();
}

async function disconnectConnection(connectionId) {
  const connectionTabs = state.tabs.filter((tab) => tab.connectionId === connectionId);

  for (const tab of connectionTabs) {
    const sshSessionId = state.sshSessionByTab.get(tab.id);
    if (sshSessionId) {
      await window.sqlBase.stopSsh(sshSessionId);
    }
    state.tablePayloadByTab.delete(tab.id);
    state.selectedRowsByTab.delete(tab.id);
    state.anchorRowByTab.delete(tab.id);
    state.relationLookupByTab.delete(tab.id);
    state.pendingRowsByTab.delete(tab.id);
    state.editsByTab.delete(tab.id);
    state.sshSessionByTab.delete(tab.id);
    state.sshOutputByTab.delete(tab.id);
  }

  state.tabs = state.tabs.filter((tab) => tab.connectionId !== connectionId);
  state.schemaByConnection.delete(connectionId);

  if (state.activeConnectionId === connectionId) {
    state.activeConnectionId = null;
    state.sidebarView = 'connections';
  }

  if (!state.tabs.some((tab) => tab.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || null;
  }

  render();
}

async function updateConnectionBackground(connectionId, backgroundColor) {
  if (!isConnectionColor(backgroundColor)) return;

  try {
    state.connections = await window.sqlBase.updateConnectionBackground({ connectionId, backgroundColor });
    renderConnections();
  } catch (error) {
    showToast(error.message);
  }
}

async function groupConnections(sourceConnectionId, targetConnectionId) {
  if (!sourceConnectionId || !targetConnectionId || sourceConnectionId === targetConnectionId) return;

  try {
    const result = await window.sqlBase.groupConnections({ sourceConnectionId, targetConnectionId });
    state.connections = result.connections || state.connections;
    state.focusGroupId = result.groupId || null;
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function updateConnectionGroupName(groupId, groupName) {
  try {
    state.connections = await window.sqlBase.updateConnectionGroupName({ groupId, groupName });
    renderConnections();
  } catch (error) {
    showToast(error.message);
  }
}

async function openSshConnection(connection) {
  const existing = state.tabs.find((tab) => tab.type === 'ssh' && tab.connectionId === connection.id);
  if (existing) {
    state.activeTabId = existing.id;
    render();
    if (!state.sshSessionByTab.has(existing.id)) {
      state.sshOutputByTab.set(existing.id, `${state.sshOutputByTab.get(existing.id) || ''}\nOpnieuw verbinden met ${getConnectionSummary(connection)}...\n`);
      try {
        const { sessionId } = await window.sqlBase.startSsh(connection);
        state.sshSessionByTab.set(existing.id, sessionId);
        renderSshView();
      } catch (error) {
        state.sshOutputByTab.set(existing.id, `${state.sshOutputByTab.get(existing.id) || ''}${error.message}\n`);
        renderSshView();
      }
    }
    return;
  }

  const tab = {
    id: `ssh:${connection.id}:${Date.now()}`,
    type: 'ssh',
    connectionId: connection.id,
    connectionName: connection.name,
    tableName: connection.name
  };

  state.tabs.push(tab);
  state.activeTabId = tab.id;
  state.activeConnectionId = connection.id;
  state.sidebarView = 'connections';
  state.sshOutputByTab.set(tab.id, `Verbinden met ${getConnectionSummary(connection)}...\n`);
  render();

  try {
    const { sessionId } = await window.sqlBase.startSsh(connection);
    state.sshSessionByTab.set(tab.id, sessionId);
    renderSshView();
  } catch (error) {
    state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}${error.message}\n`);
    renderSshView();
  }
}

function getActiveSshSessionId() {
  const tab = getActiveTab();
  return tab?.type === 'ssh' ? state.sshSessionByTab.get(tab.id) : null;
}

function appendSshOutput(sessionId, data) {
  const tab = state.tabs.find((item) => state.sshSessionByTab.get(item.id) === sessionId);
  if (!tab) return;

  state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}${data}`);
  if (state.activeTabId === tab.id) {
    renderSshView();
  }
}

function renderSshView() {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || tab.type !== 'ssh') return;

  elements.emptyState.hidden = true;
  elements.tableView.hidden = true;
  elements.sshView.hidden = false;
  elements.refreshButton.disabled = true;
  elements.workspaceTitle.textContent = tab.tableName;
  elements.activeConnectionLabel.textContent = connection ? `SSH · ${getConnectionSummary(connection)}` : 'SSH';
  elements.sshTerminalOutput.textContent = state.sshOutputByTab.get(tab.id) || '';
  elements.sshTerminalOutput.scrollTop = elements.sshTerminalOutput.scrollHeight;
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
    type: 'database',
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
  if (tab?.type === 'ssh') {
    renderSshView();
    return;
  }
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
    const curSelected = state.selectedRowsByTab.get(tab.id);
    if (curSelected) {
      for (const idx of [...curSelected]) {
        if (idx >= payload.rows.length) curSelected.delete(idx);
      }
      if (!curSelected.size) {
        state.selectedRowsByTab.delete(tab.id);
        state.anchorRowByTab.delete(tab.id);
      }
    }
    renderTableView();
  } catch (error) {
    showToast(error.message);
  }
}

function closeTab(tabId) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  const sshSessionId = state.sshSessionByTab.get(tabId);
  if (sshSessionId) {
    window.sqlBase.stopSsh(sshSessionId);
  }
  state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
  state.tablePayloadByTab.delete(tabId);
  state.sshSessionByTab.delete(tabId);
  state.sshOutputByTab.delete(tabId);
  state.selectedRowsByTab.delete(tabId);
  state.anchorRowByTab.delete(tabId);
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

  if (state.sidebarView === 'tables' && connection && connection.type !== 'ssh') {
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

    const appendConnectionCard = (conn, parent) => {
      const backgroundColor = isHexColor(conn.backgroundColor) ? conn.backgroundColor.toLowerCase() : '#ffffff';
      const typeLabel = conn.type === 'ssh' ? 'SSH' : 'Database';
      const isActive = isConnectionActive(conn);
      const typeIcon = getConnectionTypeIcon(conn.type);
      const item = document.createElement('article');
      item.className = 'connection-item';
      item.dataset.connectionCardId = conn.id;
      item.draggable = true;
      if (isHexColor(conn.backgroundColor)) {
        item.classList.add('has-custom-color');
        item.style.setProperty('--connection-bg', conn.backgroundColor);
      }
      const colorButtons = connectionColorOptions.map((option) => `
        <button
          type="button"
          class="connection-color-swatch connection-color-option ${backgroundColor === option.value ? 'active' : ''}"
          style="--swatch-color: ${option.value}"
          data-connection-color-id="${escapeHtml(conn.id)}"
          data-color="${escapeHtml(option.value)}"
          title="${escapeHtml(option.label)}"
          aria-label="${escapeHtml(option.label)} als achtergrond voor ${escapeHtml(conn.name)}"
        ></button>
      `).join('');
      const paletteOpen = state.openColorConnectionId === conn.id;
      item.innerHTML = `
        <button
          type="button"
          class="connection-status-dot ${isActive ? 'active' : 'inactive'}"
          ${isActive ? `data-disconnect-connection-id="${escapeHtml(conn.id)}"` : 'disabled'}
          title="${isActive ? 'Disconnect' : 'Niet actief'}"
          aria-label="${isActive ? `Disconnect ${escapeHtml(conn.name)}` : `${escapeHtml(conn.name)} is niet actief`}"
        ></button>
        <button class="connection-button" data-connection-id="${escapeHtml(conn.id)}">
          <span class="connection-type-icon ${conn.type === 'ssh' ? 'ssh' : 'database'}" title="${typeLabel}" aria-label="${typeLabel}">
            ${typeIcon}
          </span>
          <span>
            <span class="connection-name">${escapeHtml(conn.name)}</span>
            <span class="connection-path">${escapeHtml(getConnectionSummary(conn))}</span>
            ${conn.readOnly ? '<span class="connection-read-only-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="9" height="9" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Alleen lezen</span>' : ''}
          </span>
        </button>
        <div class="connection-actions">
          <div class="connection-color-palette ${paletteOpen ? 'open' : ''}" aria-label="Achtergrondkleur kiezen">
            <button
              type="button"
              class="connection-color-swatch connection-color-current"
              style="--swatch-color: ${backgroundColor}"
              data-toggle-color-menu-id="${escapeHtml(conn.id)}"
              title="Kleur kiezen"
              aria-label="Kleur kiezen voor ${escapeHtml(conn.name)}"
            ></button>
            ${colorButtons}
          </div>
          <button class="icon-button" data-edit-connection-id="${escapeHtml(conn.id)}" title="Bewerk connectie" aria-label="Bewerk connectie">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-button connection-delete-button" data-remove-connection-id="${escapeHtml(conn.id)}" title="Verwijder connectie" aria-label="Verwijder connectie">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      `;
      parent.appendChild(item);
    };

    const entries = [];
    const groups = new Map();

    for (const conn of state.connections) {
      if (!conn.groupId) {
        entries.push({ type: 'connection', connection: conn });
        continue;
      }

      let group = groups.get(conn.groupId);
      if (!group) {
        group = {
          type: 'group',
          id: conn.groupId,
          name: conn.groupName || 'Groep',
          connections: []
        };
        groups.set(conn.groupId, group);
        entries.push(group);
      }

      group.connections.push(conn);
      if (conn.groupName) group.name = conn.groupName;
    }

    for (const entry of entries) {
      if (entry.type === 'connection') {
        appendConnectionCard(entry.connection, elements.connectionsList);
        continue;
      }

      const groupEl = document.createElement('section');
      groupEl.className = 'connection-group';
      groupEl.dataset.connectionGroupId = entry.id;
      groupEl.innerHTML = `
        <input
          class="connection-group-name"
          value="${escapeHtml(entry.name)}"
          data-group-name-id="${escapeHtml(entry.id)}"
          aria-label="Groepsnaam"
        />
        <div class="connection-group-items"></div>
      `;
      const groupItems = groupEl.querySelector('.connection-group-items');
      for (const conn of entry.connections) {
        appendConnectionCard(conn, groupItems);
      }
      elements.connectionsList.appendChild(groupEl);
    }

    if (state.focusGroupId) {
      const input = elements.connectionsList.querySelector(`[data-group-name-id="${CSS.escape(state.focusGroupId)}"]`);
      if (input) {
        input.focus();
        input.select();
      }
      state.focusGroupId = null;
    }
  }
}

function renderTabs() {
  elements.tabsBar.innerHTML = state.tabs
    .map(
      (tab) => {
        const connection = state.connections.find((item) => item.id === tab.connectionId);
        const type = tab.type === 'ssh' || connection?.type === 'ssh' ? 'ssh' : 'database';
        const typeLabel = type === 'ssh' ? 'SSH' : 'Database';

        return `
        <button class="tab-button ${tab.id === state.activeTabId ? 'active' : ''}" data-tab-id="${escapeHtml(tab.id)}">
          <span class="tab-type-icon ${type}" title="${typeLabel}" aria-label="${typeLabel}">
            ${getConnectionTypeIcon(type)}
          </span>
          <span class="tab-label">${escapeHtml(tab.tableName)}</span>
          <span class="tab-close" data-close-tab-id="${escapeHtml(tab.id)}">x</span>
        </button>
      `;
      }
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
  const selectedRows = state.selectedRowsByTab.get(tab?.id) || new Set();
  const edits = state.editsByTab.get(tab?.id) || new Map();
  const sort = state.sortByTab.get(tab?.id);

  const sortedItems = (() => {
    const items = rows.map((row, i) => ({ row, originalIndex: i }));
    if (sort?.column && sort?.direction) {
      items.sort((a, b) => {
        const va = a.row[sort.column];
        const vb = b.row[sort.column];
        if (va === null && vb === null) return 0;
        if (va === null) return sort.direction === 'asc' ? 1 : -1;
        if (vb === null) return sort.direction === 'asc' ? -1 : 1;
        const na = Number(va);
        const nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) return sort.direction === 'asc' ? na - nb : nb - na;
        const sa = String(va).toLowerCase();
        const sb = String(vb).toLowerCase();
        return sort.direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
    }
    return items;
  })();

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
      <td class="relation-cell" title="Klik om ${escapeHtml(relationMatch.relation.toTable)} te openen voor ${escapeHtml(formatPlainValue(rawValue))}; dubbelklik om te bewerken">
        <button
          type="button"
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
      <tr>${columns.map((column) => {
        const dir = sort?.column === column.name ? sort.direction : null;
        const arrow = dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '⇅';
        return `<th data-sort-col="${escapeHtml(column.name)}" class="${dir ? `sorted-${dir}` : ''}">${escapeHtml(column.name)}<span class="sort-arrow">${arrow}</span></th>`;
      }).join('')}</tr>
    </thead>
    <tbody>
      ${
        sortedItems.length
          ? sortedItems
              .map(
                ({ row, originalIndex }) => `
                  <tr class="${selectedRows.has(originalIndex) ? 'selected-row' : ''}" data-row-index="${originalIndex}">
                    ${columns.map((column) => renderCell(row, column, originalIndex)).join('')}
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
  const anchorRowIndex = state.anchorRowByTab.get(tab?.id);
  const selectedRow = Number.isInteger(anchorRowIndex) ? payload.rows?.[anchorRowIndex] : null;
  const lookup = state.relationLookupByTab.get(tab?.id);
  const selectedNote = selectedRow
    ? `Geselecteerde rij ${anchorRowIndex + 1}`
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
  if (tab?.type === 'ssh') {
    renderSshView();
    return;
  }

  const payload = state.tablePayloadByTab.get(tab?.id);
  const activeConnection = state.connections.find((connection) => connection.id === tab?.connectionId);
  const isReadOnly = Boolean(activeConnection?.readOnly);
  const pendingRows = state.pendingRowsByTab.get(tab?.id) || [];
  const edits = state.editsByTab.get(tab?.id);
  const hasPending = pendingRows.length > 0 || (edits && edits.size > 0);
  const isDataMode = state.mode === 'data';

  elements.emptyState.hidden = Boolean(tab);
  elements.tableView.hidden = !tab;
  elements.sshView.hidden = true;
  elements.refreshButton.disabled = !activeConnection;
  elements.tableActions.hidden = !tab || !payload;
  elements.addRowButton.disabled = !isDataMode || isReadOnly;
  elements.sqlButton.disabled = !tab || !payload || isReadOnly;
  elements.pendingActions.hidden = !hasPending || !isDataMode;
  elements.readOnlyBadge.hidden = !isReadOnly || !tab;
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
  const anchorRowIndex = state.anchorRowByTab.get(tab?.id);
  const selectedRow = Number.isInteger(anchorRowIndex) ? payload?.rows?.[anchorRowIndex] : null;

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
  openConnectionForm('mariadb');
});

elements.cancelConnectionButton.addEventListener('click', () => {
  closeConnectionForm();
});

elements.saveConnectionButton.addEventListener('click', () => {
  saveConnection(getConnectionFromForm());
});

elements.connectionFormCloseButton.addEventListener('click', closeConnectionForm);
elements.connectionFormBackdrop.addEventListener('click', closeConnectionForm);
elements.connectionForm.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeConnectionForm();
  }
});

elements.connectionTypeSelect.addEventListener('change', () => {
  setConnectionFormType(elements.connectionTypeSelect.value);
});

elements.mariaConnectionModeSelect.addEventListener('change', () => {
  setConnectionFormType(elements.connectionTypeSelect.value);
  if (elements.mariaConnectionModeSelect.value === 'ssh') {
    elements.mariaSshHostInput.focus();
  }
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
  const disconnectButton = event.target.closest('[data-disconnect-connection-id]');
  const colorToggle = event.target.closest('[data-toggle-color-menu-id]');
  const colorButton = event.target.closest('[data-connection-color-id][data-color]');
  const connectionButton = event.target.closest('[data-connection-id]');
  const tableButton = event.target.closest('[data-table-name]');
  const removeButton = event.target.closest('[data-remove-connection-id]');
  const editButton = event.target.closest('[data-edit-connection-id]');

  if (disconnectButton) {
    await disconnectConnection(disconnectButton.dataset.disconnectConnectionId);
    return;
  }

  if (colorToggle) {
    const connectionId = colorToggle.dataset.toggleColorMenuId;
    state.openColorConnectionId = state.openColorConnectionId === connectionId ? null : connectionId;
    renderConnections();
    return;
  }

  if (colorButton) {
    state.openColorConnectionId = null;
    await updateConnectionBackground(colorButton.dataset.connectionColorId, colorButton.dataset.color);
    return;
  }

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
    const connection = state.connections.find((item) => item.id === connectionButton.dataset.connectionId);
    if (!connection) return;
    state.activeConnectionId = connection.id;
    if (connection.type === 'ssh') {
      await openSshConnection(connection);
      return;
    }
    state.sidebarView = 'tables';
    if (!state.schemaByConnection.has(state.activeConnectionId)) {
      await loadSchemaForActiveConnection();
    }
    render();
  }
});

elements.connectionsList.addEventListener('keydown', async (event) => {
  const groupNameInput = event.target.closest('[data-group-name-id]');
  if (!groupNameInput || event.key !== 'Enter') return;

  event.preventDefault();
  await updateConnectionGroupName(groupNameInput.dataset.groupNameId, groupNameInput.value);
  groupNameInput.blur();
});

function clearConnectionDropTargets() {
  elements.connectionsList.querySelectorAll('.connection-item.drop-target').forEach((item) => {
    item.classList.remove('drop-target');
  });
}

elements.connectionsList.addEventListener('dragstart', (event) => {
  if (event.target.closest('.connection-actions')) return;

  const item = event.target.closest('[data-connection-card-id]');
  if (!item) return;

  state.draggingConnectionId = item.dataset.connectionCardId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', state.draggingConnectionId);
  item.classList.add('dragging');
});

elements.connectionsList.addEventListener('dragover', (event) => {
  const item = event.target.closest('[data-connection-card-id]');
  if (!item || item.dataset.connectionCardId === state.draggingConnectionId) return;

  event.preventDefault();
  clearConnectionDropTargets();
  item.classList.add('drop-target');
});

elements.connectionsList.addEventListener('dragleave', (event) => {
  const item = event.target.closest('[data-connection-card-id]');
  if (item && !item.contains(event.relatedTarget)) {
    item.classList.remove('drop-target');
  }
});

elements.connectionsList.addEventListener('drop', async (event) => {
  const item = event.target.closest('[data-connection-card-id]');
  const sourceConnectionId = event.dataTransfer.getData('text/plain') || state.draggingConnectionId;

  clearConnectionDropTargets();

  if (!item || !sourceConnectionId) return;
  event.preventDefault();
  await groupConnections(sourceConnectionId, item.dataset.connectionCardId);
});

elements.connectionsList.addEventListener('dragend', () => {
  const item = elements.connectionsList.querySelector('.connection-item.dragging');
  item?.classList.remove('dragging');
  clearConnectionDropTargets();
  state.draggingConnectionId = null;
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
    state.mode = 'data';
    render();
    const tab = getActiveTab();
    if (tab?.type !== 'ssh') {
      loadActiveTable();
    }
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

function selectRow(tab, rowIndex, event = null) {
  const existing = state.selectedRowsByTab.get(tab.id) || new Set();

  if (event?.shiftKey && state.anchorRowByTab.has(tab.id)) {
    const anchor = state.anchorRowByTab.get(tab.id);
    const allRowEls = [...elements.dataTable.querySelectorAll('tbody tr[data-row-index]')];
    const anchorPos = allRowEls.findIndex((tr) => Number(tr.dataset.rowIndex) === anchor);
    const targetPos = allRowEls.findIndex((tr) => Number(tr.dataset.rowIndex) === rowIndex);
    if (anchorPos !== -1 && targetPos !== -1) {
      const lo = Math.min(anchorPos, targetPos);
      const hi = Math.max(anchorPos, targetPos);
      const newSet = new Set();
      for (let i = lo; i <= hi; i++) newSet.add(Number(allRowEls[i].dataset.rowIndex));
      state.selectedRowsByTab.set(tab.id, newSet);
    } else {
      state.selectedRowsByTab.set(tab.id, new Set([rowIndex]));
      state.anchorRowByTab.set(tab.id, rowIndex);
    }
  } else if (event?.metaKey || event?.ctrlKey) {
    if (existing.has(rowIndex)) existing.delete(rowIndex);
    else existing.add(rowIndex);
    state.selectedRowsByTab.set(tab.id, existing);
    state.anchorRowByTab.set(tab.id, rowIndex);
  } else {
    state.selectedRowsByTab.set(tab.id, new Set([rowIndex]));
    state.anchorRowByTab.set(tab.id, rowIndex);
  }

  state.relationLookupByTab.delete(tab.id);

  for (const el of elements.dataTable.querySelectorAll('.selected-row')) {
    el.classList.remove('selected-row');
  }
  const currentSelected = state.selectedRowsByTab.get(tab.id);
  for (const idx of currentSelected) {
    elements.dataTable.querySelector(`tr[data-row-index="${idx}"]`)?.classList.add('selected-row');
  }

  const anchor = state.anchorRowByTab.get(tab.id);
  elements.dataTable.querySelector(`tr[data-row-index="${anchor}"]`)?.scrollIntoView({ block: 'nearest' });

  const payload = state.tablePayloadByTab.get(tab.id);
  if (payload) renderRelations(payload);
}

function addPendingRow(tab, payload, values) {
  capturePendingInputValues();
  const columns = payload.columns || [];
  const filled = Object.fromEntries(columns.map((col) => [col.name, values?.[col.name] ?? '']));
  const pendingRows = state.pendingRowsByTab.get(tab.id) || [];
  pendingRows.push({ id: crypto.randomUUID(), values: filled, error: null });
  state.pendingRowsByTab.set(tab.id, pendingRows);
  renderTableView();
  const allPendingRows = elements.dataTable.querySelectorAll('.pending-row');
  allPendingRows[allPendingRows.length - 1]?.querySelector('input')?.focus();
}

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const isArrow = e.key === 'ArrowDown' || e.key === 'ArrowUp';
  const isCopy = (e.metaKey || e.ctrlKey) && e.key === 'c';
  const isPaste = (e.metaKey || e.ctrlKey) && e.key === 'v';
  if (!isArrow && !isCopy && !isPaste) return;

  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload) return;

  const rows = payload.rows || [];
  const cur = state.anchorRowByTab.get(tab.id) ?? -1;

  if (isArrow) {
    if (!rows.length) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown'
      ? (cur < 0 ? 0 : Math.min(cur + 1, rows.length - 1))
      : Math.max(cur - 1, 0);
    selectRow(tab, next);
  } else if (isCopy) {
    const selectedRows = state.selectedRowsByTab.get(tab.id);
    if (!selectedRows?.size) return;
    const pkCols = new Set(payload.columns.filter((col) => Number(col.pk)).map((col) => col.name));
    const nonPkCols = payload.columns.filter((col) => !pkCols.has(col.name));
    state.copiedRows = [...selectedRows]
      .filter((idx) => idx >= 0 && idx < rows.length)
      .sort((a, b) => a - b)
      .map((idx) => Object.fromEntries(nonPkCols.map((col) => [col.name, rows[idx][col.name] ?? ''])));
    if (!state.copiedRows.length) return;
    e.preventDefault();
    showToast(state.copiedRows.length === 1 ? 'Rij gekopieerd' : `${state.copiedRows.length} rijen gekopieerd`);
  } else if (isPaste) {
    if (!state.copiedRows?.length) return;
    const pasteConnection = state.connections.find((c) => c.id === tab.connectionId);
    if (pasteConnection?.readOnly) return;
    e.preventDefault();
    for (const row of state.copiedRows) {
      addPendingRow(tab, payload, row);
    }
  }
});

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

  const sortHeader = event.target.closest('th[data-sort-col]');
  if (sortHeader) {
    const col = sortHeader.dataset.sortCol;
    const cur = state.sortByTab.get(tab.id);
    if (cur?.column === col) {
      if (cur.direction === 'asc') state.sortByTab.set(tab.id, { column: col, direction: 'desc' });
      else state.sortByTab.delete(tab.id);
    } else {
      state.sortByTab.set(tab.id, { column: col, direction: 'asc' });
    }
    const payload = state.tablePayloadByTab.get(tab.id);
    if (payload) renderDataTable(payload);
    return;
  }

  const relationValueButton = event.target.closest('[data-relation-kind]');
  const row = event.target.closest('[data-row-index]');

  if (!row) return;

  selectRow(tab, Number(row.dataset.rowIndex), event);

  if (relationValueButton && event.detail < 2) {
    await loadRelationLookup(
      relationValueButton.dataset.relationKind,
      Number(relationValueButton.dataset.relationIndex)
    );
  }
});

elements.dataTable.addEventListener('mousedown', (e) => {
  if (e.shiftKey && e.target.closest('tbody tr[data-row-index]')) e.preventDefault();
});

elements.addRowButton.addEventListener('click', () => {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload) return;
  addPendingRow(tab, payload, {});
});

elements.saveRowsButton.addEventListener('click', saveAll);

elements.discardRowsButton.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  state.pendingRowsByTab.delete(tab.id);
  state.editsByTab.delete(tab.id);
  renderTableView();
});

elements.sshTerminalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const tab = getActiveTab();
  const sessionId = getActiveSshSessionId();
  const command = elements.sshTerminalInput.value;
  if (!tab || !sessionId || !command) return;

  state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}$ ${command}\n`);
  elements.sshTerminalInput.value = '';
  renderSshView();
  await window.sqlBase.writeSsh({ sessionId, data: `${command}\n` });
});

elements.sshOpenTerminalButton.addEventListener('click', async () => {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || tab.type !== 'ssh' || !connection) return;

  try {
    await window.sqlBase.openSshInTerminal(connection);
    state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}\nGeopend in macOS Terminal. Voor password-auth vraagt Terminal zelf om je wachtwoord.\n`);
    renderSshView();
  } catch (error) {
    showToast(error.message);
  }
});

elements.sshDisconnectButton.addEventListener('click', async () => {
  const tab = getActiveTab();
  const sessionId = getActiveSshSessionId();
  if (!tab || !sessionId) return;

  await window.sqlBase.stopSsh(sessionId);
  state.sshSessionByTab.delete(tab.id);
  state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}\nVerbinding verbroken.\n`);
  renderSshView();
});

elements.dataTable.addEventListener('dblclick', (event) => {
  const td = event.target.closest('td');
  const row = td?.closest('tr[data-row-index]');
  if (!td || !row) return;
  if (td.querySelector('input[data-edit-input]')) return;

  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload || state.mode !== 'data') return;

  const activeConnection = state.connections.find((c) => c.id === tab.connectionId);
  if (activeConnection?.readOnly) return;

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

window.sqlBase.onNewSshConnection(() => {
  openConnectionForm('ssh');
});

window.sqlBase.onSshData(({ sessionId, data }) => {
  appendSshOutput(sessionId, data);
});

window.sqlBase.onSshExit(({ sessionId, code }) => {
  const tab = state.tabs.find((item) => state.sshSessionByTab.get(item.id) === sessionId);
  if (!tab) return;

  state.sshSessionByTab.delete(tab.id);
  const statusText = code
    ? `[SSH niet gelukt, exit-code ${code}]`
    : '[SSH sessie afgesloten]';
  state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}\n${statusText}\n`);
  if (state.activeTabId === tab.id) {
    renderSshView();
  }
});

function openSqlDialog() {
  const tab = getActiveTab();
  const connection = state.connections.find((c) => c.id === tab?.connectionId);
  if (!tab || !connection) return;
  elements.sqlDialogTitle.textContent = `${connection.name} · ${tab.tableName}`;
  elements.sqlResult.hidden = true;
  elements.sqlResult.innerHTML = '';
  elements.sqlDialog.hidden = false;
  elements.sqlBackdrop.hidden = false;
  elements.sqlTextarea.focus();
}

function closeSqlDialog() {
  elements.sqlDialog.hidden = true;
  elements.sqlBackdrop.hidden = true;
}

async function executeSql() {
  const tab = getActiveTab();
  const connection = state.connections.find((c) => c.id === tab?.connectionId);
  if (!tab || !connection) return;
  const sql = elements.sqlTextarea.value.trim();
  if (!sql) return;

  elements.sqlRunButton.disabled = true;
  elements.sqlResult.hidden = false;
  elements.sqlResult.innerHTML = '<p class="sql-result-meta">Laden...</p>';

  try {
    const result = await window.sqlBase.runSql({ connection, sql });
    if (result.rows.length > 0) {
      const cols = Object.keys(result.rows[0]);
      elements.sqlResult.innerHTML = `
        <div class="table-scroll">
          <table>
            <thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
            <tbody>${result.rows.map((row) => `
              <tr>${cols.map((c) => `<td title="${escapeHtml(formatPlainValue(row[c]))}">${formatValue(row[c])}</td>`).join('')}</tr>
            `).join('')}</tbody>
          </table>
        </div>
        <p class="sql-result-meta">${result.rows.length} rij${result.rows.length !== 1 ? 'en' : ''} teruggegeven</p>
      `;
    } else if (result.affectedRows !== null) {
      elements.sqlResult.innerHTML = `<p class="sql-result-meta">${result.affectedRows} rij${result.affectedRows !== 1 ? 'en' : ''} beïnvloed</p>`;
    } else {
      elements.sqlResult.innerHTML = '<p class="sql-result-meta">Query uitgevoerd.</p>';
    }
  } catch (error) {
    elements.sqlResult.innerHTML = `<p class="sql-result-error">${escapeHtml(error.message)}</p>`;
  } finally {
    elements.sqlRunButton.disabled = false;
  }
}

elements.sqlButton.addEventListener('click', openSqlDialog);
elements.sqlBackdrop.addEventListener('click', closeSqlDialog);
elements.sqlDialogClose.addEventListener('click', closeSqlDialog);
elements.sqlRunButton.addEventListener('click', executeSql);
elements.sqlTextarea.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); executeSql(); }
  if (e.key === 'Escape') { e.preventDefault(); closeSqlDialog(); }
});

setConnectionFormType('mariadb');
loadConnections();
