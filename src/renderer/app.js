const state = {
  connections: [],
  activeConnectionId: null,
  schemaByConnection: new Map(),
  tabs: [],
  activeTabId: null,
  tablePayloadByTab: new Map(),
  tableLoadSeqByTab: new Map(),
  selectedRowsByTab: new Map(),
  anchorRowByTab: new Map(),
  relationLookupByTab: new Map(),
  pendingRowsByTab: new Map(),
  editsByTab: new Map(),
  filterByTab: new Map(),
  sidebarView: 'connections',
  editingConnectionId: null,
  mode: 'data',
  filterTimer: null,
  copiedRows: null,
  draggingConnectionId: null,
  focusGroupId: null,
  contextMenuConnectionId: null,
  contextMenuTable: null,
  contextMenuRowIndex: null,
  sshSessionByTab: new Map(),
  sshOutputByTab: new Map(),
  sshTerminalByTab: new Map(),
  sshFitByTab: new Map(),
  sshResizeObserverByTab: new Map(),
  sortByTab: new Map(),
  sortTimerByTab: new Map(),
  editSelectionSnapshot: null,
  sidebarFilterOpen: false
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

const connectionFormDrag = {
  active: false,
  pointerId: null,
  offsetX: 0,
  offsetY: 0
};

const elements = {
  themeToggleButton: document.querySelector('#themeToggleButton'),
  newConnectionButton: document.querySelector('#newConnectionButton'),
  connectionForm: document.querySelector('#connectionForm'),
  connectionFormHeader: document.querySelector('#connectionForm .connection-form-header'),
  connectionFormBackdrop: document.querySelector('#connectionFormBackdrop'),
  connectionFormCloseButton: document.querySelector('#connectionFormCloseButton'),
  connectionFormError: document.querySelector('#connectionFormError'),
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
  backupButton: document.querySelector('#backupButton'),
  refreshButton: document.querySelector('#refreshButton'),
  tabsBar: document.querySelector('#tabsBar'),
  emptyState: document.querySelector('#emptyState'),
  tableView: document.querySelector('#tableView'),
  sshView: document.querySelector('#sshView'),
  sshTerminalPane: document.querySelector('#sshTerminalPane'),
  dataModeButton: document.querySelector('#dataModeButton'),
  structureModeButton: document.querySelector('#structureModeButton'),
  filterInput: document.querySelector('#filterInput'),
  filterArea: document.querySelector('#filterArea'),
  filterTextMode: document.querySelector('#filterTextMode'),
  filterColumnMode: document.querySelector('#filterColumnMode'),
  filterColumnRows: document.querySelector('#filterColumnRows'),
  filterModeToggle: document.querySelector('#filterModeToggle'),
  limitInput: document.querySelector('#limitInput'),
  tableMeta: document.querySelector('#tableMeta'),
  dataPanel: document.querySelector('.data-panel'),
  tableLoader: document.querySelector('#tableLoader'),
  tableLoaderLabel: document.querySelector('#tableLoaderLabel'),
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
  cellViewerBackdrop: document.querySelector('#cellViewerBackdrop'),
  cellViewerDialog: document.querySelector('#cellViewerDialog'),
  cellViewerTitle: document.querySelector('#cellViewerTitle'),
  cellViewerMeta: document.querySelector('#cellViewerMeta'),
  cellViewerValue: document.querySelector('#cellViewerValue'),
  cellViewerClose: document.querySelector('#cellViewerClose'),
  cellViewerCopy: document.querySelector('#cellViewerCopy'),
  releaseDialog: document.querySelector('#releaseDialog'),
  releaseDialogBackdrop: document.querySelector('#releaseDialogBackdrop'),
  releaseDialogClose: document.querySelector('#releaseDialogClose'),
  releaseDialogEyebrow: document.querySelector('#releaseDialogEyebrow'),
  releaseDialogTitle: document.querySelector('#releaseDialogTitle'),
  releaseDialogBody: document.querySelector('#releaseDialogBody'),
  releaseDialogActions: document.querySelector('#releaseDialogActions'),
  readOnlyBadge: document.querySelector('#readOnlyBadge'),
  connectionReadOnlyRow: document.querySelector('#connectionReadOnlyRow'),
  connectionReadOnlyCheckbox: document.querySelector('#connectionReadOnlyCheckbox'),
  sidebarFilterWrap: document.querySelector('#sidebarFilterWrap'),
  sidebarFilterInput: document.querySelector('#sidebarFilterInput'),
  sidebarFilterClear: document.querySelector('#sidebarFilterClear'),
  errorDialog: document.querySelector('#errorDialog'),
  errorDialogBackdrop: document.querySelector('#errorDialogBackdrop'),
  errorDialogClose: document.querySelector('#errorDialogClose'),
  errorDialogMessage: document.querySelector('#errorDialogMessage')
};

// ── FK picker ────────────────────────────────────────────────────────────────
const fkDropdown = document.createElement('div');
fkDropdown.className = 'fk-picker-dropdown';
fkDropdown.hidden = true;
document.body.appendChild(fkDropdown);

const fkMoreTooltip = document.createElement('div');
fkMoreTooltip.className = 'fk-more-tooltip';
fkMoreTooltip.hidden = true;
document.body.appendChild(fkMoreTooltip);

let activeFkBtn = null;
let activeFkInput = null;

function closeFkDropdown() {
  fkDropdown.hidden = true;
  fkMoreTooltip.hidden = true;
  activeFkBtn = null;
  activeFkInput = null;
}

async function populateFkDropdown(tableName, fkColumn) {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!connection) return;

  fkDropdown.innerHTML = '<div class="fk-status">Laden…</div>';

  let rows, cols;
  try {
    const result = await window.sqlBase.loadTable({ connection, tableName, limit: 500 });
    rows = result.rows || [];
    cols = result.columns || [];
  } catch (err) {
    fkDropdown.innerHTML = `<div class="fk-status fk-status-error">Fout: ${escapeHtml(err.message)}</div>`;
    return;
  }

  const PREVIEW = 4;
  const optionsHtml = rows.length
    ? rows.map((row) => {
        const fkVal = formatPlainValue(row[fkColumn]);
        const searchText = cols.map((c) => formatPlainValue(row[c.name])).join(' ').toLowerCase();
        const previewCols = cols.slice(0, PREVIEW);
        const moreCols = cols.slice(PREVIEW);

        const chips = previewCols.map((col) => {
          const val = formatPlainValue(row[col.name]);
          const short = val.length > 22 ? val.slice(0, 22) + '…' : val;
          return `<span class="fk-chip"><span class="fk-chip-key">${escapeHtml(col.name)}</span><span class="fk-chip-val">${escapeHtml(short)}</span></span>`;
        }).join('');

        const tipHtml = moreCols.map((col) => {
          const val = formatPlainValue(row[col.name]);
          return `<div class="fk-tip-row"><span class="fk-tip-key">${escapeHtml(col.name)}</span><span class="fk-tip-val">${escapeHtml(val)}</span></div>`;
        }).join('');

        return `
          <div class="fk-option" data-value="${escapeHtml(fkVal)}" data-search="${escapeHtml(searchText)}" tabindex="0">
            <div class="fk-option-body">
              <div class="fk-option-chips">${chips}</div>
              ${moreCols.length ? `
                <div class="fk-option-more">
                  <span class="fk-more-badge" data-tip="${escapeHtml(tipHtml)}">+${moreCols.length}</span>
                </div>` : ''}
            </div>
          </div>`;
      }).join('')
    : '<div class="fk-status">Geen rijen gevonden.</div>';

  fkDropdown.innerHTML = `
    <div class="fk-search-wrap">
      <input class="fk-search" type="text" placeholder="Zoeken in ${escapeHtml(tableName)}…" autocomplete="off" spellcheck="false">
    </div>
    <div class="fk-options-list">${optionsHtml}</div>`;

  const searchEl = fkDropdown.querySelector('.fk-search');
  const listEl = fkDropdown.querySelector('.fk-options-list');

  searchEl?.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    for (const opt of listEl.querySelectorAll('.fk-option')) {
      opt.hidden = Boolean(q && !opt.dataset.search.includes(q));
    }
  });

  searchEl?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      listEl.querySelector('.fk-option:not([hidden])')?.focus();
    } else if (e.key === 'Escape') {
      closeFkDropdown();
      activeFkInput?.focus();
    } else if (e.key === 'Enter') {
      const visible = listEl.querySelectorAll('.fk-option:not([hidden])');
      if (visible.length === 1 && activeFkInput) {
        activeFkInput.value = visible[0].dataset.value;
        closeFkDropdown();
      }
    }
  });

  listEl?.addEventListener('keydown', (e) => {
    const opts = [...listEl.querySelectorAll('.fk-option:not([hidden])')];
    const idx = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opts[Math.min(idx + 1, opts.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx <= 0) searchEl?.focus();
      else opts[idx - 1]?.focus();
    } else if (e.key === 'Enter' && document.activeElement?.classList.contains('fk-option') && activeFkInput) {
      activeFkInput.value = document.activeElement.dataset.value;
      closeFkDropdown();
    } else if (e.key === 'Escape') {
      closeFkDropdown();
      activeFkInput?.focus();
    }
  });

  setTimeout(() => searchEl?.focus(), 0);
}

fkDropdown.addEventListener('click', (e) => {
  const opt = e.target.closest('.fk-option[data-value]');
  if (opt && activeFkInput) {
    activeFkInput.value = opt.dataset.value;
    closeFkDropdown();
  }
});

fkDropdown.addEventListener('mouseover', (e) => {
  const badge = e.target.closest('.fk-more-badge[data-tip]');
  if (!badge) return;
  fkMoreTooltip.innerHTML = badge.dataset.tip;
  fkMoreTooltip.hidden = false;
  const r = badge.getBoundingClientRect();
  const ttWidth = 260;
  const left = r.right + 8 + ttWidth > window.innerWidth ? r.left - ttWidth - 8 : r.right + 8;
  fkMoreTooltip.style.left = `${left}px`;
  fkMoreTooltip.style.top = `${r.top - 4}px`;
});

fkDropdown.addEventListener('mouseout', (e) => {
  if (!e.relatedTarget?.closest('.fk-more-badge')) {
    fkMoreTooltip.hidden = true;
  }
});

document.addEventListener('click', (e) => {
  if (!fkDropdown.hidden && !fkDropdown.contains(e.target) && !e.target.closest('.fk-picker-btn')) {
    closeFkDropdown();
  }
});

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 4600);
}

function cleanErrorMessage(message) {
  return String(message || '')
    .replace(/^Error invoking remote method '[^']+': /, '')
    .replace(/^Error: /, '');
}

function showErrorDialog(message) {
  elements.errorDialogMessage.textContent = cleanErrorMessage(message);
  elements.errorDialog.hidden = false;
  elements.errorDialogBackdrop.hidden = false;
  elements.errorDialogClose.focus();
}

function closeErrorDialog() {
  elements.errorDialog.hidden = true;
  elements.errorDialogBackdrop.hidden = true;
}

const releaseDialogState = { onClose: null, closeMode: null };

function renderBasicMarkdown(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const html = [];
  let inList = false;
  let inCode = false;
  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList();
      inCode = !inCode;
      html.push(inCode ? '<pre><code>' : '</code></pre>');
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(line)}\n`);
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (listItem) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(listItem[1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    html.push(`<p>${escapeHtml(line)}</p>`);
  }

  closeList();
  if (inCode) html.push('</code></pre>');
  return html.join('');
}

function getVersionChangelog(markdown, version) {
  const escapedVersion = String(version || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^##\\s+v?${escapedVersion}(?:\\s+-\\s+.*)?$[\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'im');
  const match = String(markdown || '').match(pattern);
  return (match?.[1] || markdown || '').trim();
}

function closeReleaseDialog() {
  elements.releaseDialog.hidden = true;
  elements.releaseDialogBackdrop.hidden = true;
  const onClose = releaseDialogState.onClose;
  const closeMode = releaseDialogState.closeMode || 'close';
  releaseDialogState.onClose = null;
  releaseDialogState.closeMode = null;
  onClose?.(closeMode);
}

function showReleaseDialog({ eyebrow, title, bodyMarkdown, actions = [] }) {
  return new Promise((resolve) => {
    releaseDialogState.onClose = resolve;
    releaseDialogState.closeMode = 'close';
    elements.releaseDialogEyebrow.textContent = eyebrow || '';
    elements.releaseDialogTitle.textContent = title || '';
    elements.releaseDialogBody.innerHTML = renderBasicMarkdown(bodyMarkdown || '');
    elements.releaseDialogActions.innerHTML = '';

    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'primary-button' : 'ghost-button';
      button.textContent = action.label;
      button.addEventListener('click', async () => {
        releaseDialogState.closeMode = action.mode || action.label;
        await action.onClick?.();
        closeReleaseDialog();
      });
      elements.releaseDialogActions.appendChild(button);
    }

    if (!actions.length) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-button';
      button.textContent = 'OK';
      button.addEventListener('click', () => {
        releaseDialogState.closeMode = 'ok';
        closeReleaseDialog();
      });
      elements.releaseDialogActions.appendChild(button);
    }

    elements.releaseDialog.hidden = false;
    elements.releaseDialogBackdrop.hidden = false;
    elements.releaseDialogClose.focus();
  });
}

async function showChangelogIfNeeded(appInfo) {
  const version = appInfo?.version;
  if (!version || !appInfo?.changelog?.trim()) return;

  const storageKey = 'remysql.changelogSeenVersion';
  let seenVersion = null;
  try { seenVersion = localStorage.getItem(storageKey); } catch {}
  if (seenVersion === version) return;

  const versionChangelog = getVersionChangelog(appInfo.changelog, version);
  const hasReleaseNotes = versionChangelog
    .split(/\r?\n/)
    .some((line) => /^\s*[-*]\s+\S/.test(line));
  if (!hasReleaseNotes) {
    try { localStorage.setItem(storageKey, version); } catch {}
    return;
  }

  await showReleaseDialog({
    eyebrow: `RemySQL ${version}`,
    title: 'Wat is er nieuw?',
    bodyMarkdown: versionChangelog,
    actions: [{ label: 'Begrepen', primary: true, mode: 'seen' }]
  });

  try { localStorage.setItem(storageKey, version); } catch {}
}

async function showUpdateIfAvailable() {
  let update = null;
  try {
    update = await window.sqlBase.checkForUpdates();
  } catch {
    return;
  }

  if (!update?.updateAvailable || !update.latestVersion) return;

  const storageKey = `remysql.updateDismissed.${update.latestVersion}`;
  let dismissed = null;
  try { dismissed = localStorage.getItem(storageKey); } catch {}
  if (dismissed === '1') return;

  await showReleaseDialog({
    eyebrow: `Update beschikbaar · ${update.currentVersion} → ${update.latestVersion}`,
    title: update.releaseName || `RemySQL ${update.latestVersion}`,
    bodyMarkdown: update.releaseNotes || `Er staat een nieuwe versie klaar op GitHub: ${update.latestVersion}.`,
    actions: [
      {
        label: update.assetName ? `Download ${update.assetName}` : 'Open download',
        primary: true,
        mode: 'download',
        onClick: () => window.sqlBase.openExternal(update.downloadUrl || update.releaseUrl)
      },
      { label: 'Later', mode: 'later' }
    ]
  });

  try { localStorage.setItem(storageKey, '1'); } catch {}
}

async function initReleaseAnnouncements() {
  let appInfo = null;
  try {
    appInfo = await window.sqlBase.getAppInfo();
  } catch {
    return;
  }

  await showChangelogIfNeeded(appInfo);
  await showUpdateIfAvailable();
}

function getActiveConnection() {
  return state.connections.find((connection) => connection.id === state.activeConnectionId) || null;
}

function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

function createDefaultColumnFilterState() {
  return {
    column: '',
    operator: '=',
    value: '',
    valueTo: ''
  };
}

function createDefaultFilterState() {
  return {
    mode: 'text',
    text: '',
    columnFilters: [createDefaultColumnFilterState()]
  };
}

function normalizeColumnFilterState(filter) {
  if (!filter) return createDefaultFilterState();

  if (!Array.isArray(filter.columnFilters)) {
    filter.columnFilters = [{
      column: filter.column || '',
      operator: filter.operator || '=',
      value: filter.value || '',
      valueTo: filter.valueTo || ''
    }];
    delete filter.column;
    delete filter.operator;
    delete filter.value;
    delete filter.valueTo;
  }

  if (!filter.columnFilters.length) {
    filter.columnFilters.push(createDefaultColumnFilterState());
  }

  filter.columnFilters = filter.columnFilters.map((item) => ({
    column: item?.column || '',
    operator: ['=', '!=', 'LIKE', 'BETWEEN', '>', '<'].includes(item?.operator) ? item.operator : '=',
    value: item?.value || '',
    valueTo: item?.valueTo || ''
  }));

  return filter;
}

function getFilterForTab(tabId, create = true) {
  if (!tabId) {
    return createDefaultFilterState();
  }
  if (!state.filterByTab.has(tabId) && create) {
    state.filterByTab.set(tabId, createDefaultFilterState());
  }
  return normalizeColumnFilterState(state.filterByTab.get(tabId) || createDefaultFilterState());
}

function getActiveFilter() {
  return getFilterForTab(getActiveTab()?.id);
}

function getColumnFilterAt(index, filter = getActiveFilter()) {
  const normalized = normalizeColumnFilterState(filter);
  return normalized.columnFilters[index] || null;
}

function isRunnableColumnFilter(item) {
  if (!item?.column) return false;
  if (item.operator === 'BETWEEN') {
    return Boolean(String(item.value || '').trim() && String(item.valueTo || '').trim());
  }
  return Boolean(String(item.value || '').trim());
}

function debounceLoadActiveTable() {
  clearTimeout(state.filterTimer);
  state.filterTimer = setTimeout(loadActiveTable, 220);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '<span class="muted-note">NULL</span>';
  }
  return escapeHtml(value);
}

function getHighlightTermForColumn(columnName) {
  if (state.mode !== 'data') {
    return '';
  }

  const filter = getActiveFilter();
  if (filter.mode === 'column') {
    const match = filter.columnFilters.find((item) => (
      item.column === columnName
      && ['=', '!=', 'LIKE'].includes(item.operator)
      && String(item.value || '').trim()
    ));
    return match ? String(match.value || '').trim() : '';
  }

  return String(filter.text || '').trim();
}

function formatValueWithHighlight(value, columnName) {
  if (value === null || value === undefined) {
    return '<span class="muted-note">NULL</span>';
  }

  const text = String(value);
  const term = getHighlightTermForColumn(columnName);
  if (!term) {
    return escapeHtml(text);
  }

  const pattern = new RegExp(`(${escapeRegExp(term)})`, 'ig');
  return text
    .split(pattern)
    .map((part) => (
      part.toLowerCase() === term.toLowerCase()
        ? `<mark class="search-highlight">${escapeHtml(part)}</mark>`
        : escapeHtml(part)
    ))
    .join('');
}

function formatPlainValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return String(value);
}

function quoteSqlIdentifier(connection, value) {
  const text = String(value || '');
  return connection?.type === 'mariadb'
    ? `\`${text.replaceAll('`', '``')}\``
    : `"${text.replaceAll('"', '""')}"`;
}

function quoteSqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function getActiveColumnFilter() {
  const filter = getActiveFilter();
  if (filter.mode !== 'column') return null;
  const filters = filter.columnFilters
    .map((item) => {
      const column = item.column;
      const operator = item.operator;
      if (!column) return null;
      if (operator === 'BETWEEN') {
        return item.value.trim() && item.valueTo.trim()
          ? { column, operator: 'BETWEEN', value: item.value, valueTo: item.valueTo }
          : null;
      }
      return item.value.trim()
        ? { column, operator, value: item.value }
        : null;
    })
    .filter(Boolean);
  return filters.length ? filters : null;
}

function getColumnFilterList(columnFilter) {
  if (!columnFilter) return [];
  return Array.isArray(columnFilter) ? columnFilter : [columnFilter];
}

function appendColumnFilterClauses(clauses, connection, validColumns, columnFilter, castType) {
  getColumnFilterList(columnFilter).forEach((item) => {
    if (!item?.column || !validColumns.has(item.column) || !String(item.value ?? '').trim()) return;
    const col = quoteSqlIdentifier(connection, item.column);
    const val = String(item.value).trim();
    if (item.operator === 'BETWEEN' && String(item.valueTo ?? '').trim()) {
      clauses.push(`${col} BETWEEN ${quoteSqlLiteral(val)} AND ${quoteSqlLiteral(String(item.valueTo).trim())}`);
    } else if (item.operator === '!=') {
      clauses.push(`${col} != ${quoteSqlLiteral(val)}`);
    } else if (item.operator === '>') {
      clauses.push(`${col} > ${quoteSqlLiteral(val)}`);
    } else if (item.operator === '<') {
      clauses.push(`${col} < ${quoteSqlLiteral(val)}`);
    } else if (item.operator === 'LIKE') {
      clauses.push(`CAST(${col} AS ${castType}) LIKE ${quoteSqlLiteral(`%${val}%`)}`);
    } else {
      clauses.push(`${col} = ${quoteSqlLiteral(val)}`);
    }
  });
}

function buildTableSelectQuery(connection, tableName, columns, { filter, limit, columnFilter, sort }) {
  const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 100));
  const validColumns = new Set((columns || []).map((column) => column.name));
  const clauses = [];
  const castType = connection?.type === 'mariadb' ? 'CHAR' : 'TEXT';

  if (String(filter || '').trim()) {
    const needle = quoteSqlLiteral(`%${String(filter).trim()}%`);
    clauses.push(`(${[...validColumns]
      .map((column) => `CAST(${quoteSqlIdentifier(connection, column)} AS ${castType}) LIKE ${needle}`)
      .join(' OR ')})`);
  }

  appendColumnFilterClauses(clauses, connection, validColumns, columnFilter, castType);

  const direction = String(sort?.direction || '').toLowerCase();
  const order = sort?.column && validColumns.has(sort.column) && ['asc', 'desc'].includes(direction)
    ? ` ORDER BY ${quoteSqlIdentifier(connection, sort.column)} ${direction.toUpperCase()}`
    : '';
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';

  return `SELECT * FROM ${quoteSqlIdentifier(connection, tableName)}${where}${order} LIMIT ${safeLimit}`;
}

function formatExpandedCellValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  const text = String(value);
  const trimmed = text.trim();
  if (!trimmed || !['{', '['].includes(trimmed[0])) {
    return text;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {}

  return text;
}

function getCurrentCellValue(rowIndex, columnName) {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload) return undefined;

  const editKey = `${rowIndex}:${columnName}`;
  const existingEdit = state.editsByTab.get(tab.id)?.get(editKey);
  if (existingEdit !== undefined) return existingEdit.value;

  return payload.rows?.[rowIndex]?.[columnName];
}

function getCellEditTargetRows(tab, payload, rowIndex) {
  const snapshot = state.editSelectionSnapshot;
  const snapshotRows = snapshot?.tabId === tab.id
    && snapshot.rowIndex === rowIndex
    && Date.now() - snapshot.createdAt < 1200
    ? snapshot.rows
    : null;
  const selectedRows = snapshotRows || [...(state.selectedRowsByTab.get(tab.id) || [])];
  const targetRows = selectedRows.length > 1 && selectedRows.includes(rowIndex)
    ? selectedRows
    : [rowIndex];

  return [...new Set(targetRows)]
    .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < (payload.rows?.length || 0))
    .sort((left, right) => left - right);
}

function syncSelectedRowClasses(tab) {
  for (const el of elements.dataTable.querySelectorAll('.selected-row')) {
    el.classList.remove('selected-row');
  }

  const currentSelected = state.selectedRowsByTab.get(tab.id) || new Set();
  for (const idx of currentSelected) {
    elements.dataTable.querySelector(`tr[data-row-index="${idx}"]`)?.classList.add('selected-row');
  }
}

function applyCellEditValue(tab, payload, rowIndex, columnName, value, sourceInputValue, targetRowsOverride = null) {
  const targetRows = (targetRowsOverride || getCellEditTargetRows(tab, payload, rowIndex))
    .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < (payload.rows?.length || 0));
  if (targetRows.length <= 1 && value === sourceInputValue) {
    return 0;
  }

  if (targetRows.length > 1) {
    state.selectedRowsByTab.set(tab.id, new Set(targetRows));
    syncSelectedRowClasses(tab);
  }

  const edits = state.editsByTab.get(tab.id) || new Map();
  for (const targetRowIndex of targetRows) {
    edits.set(`${targetRowIndex}:${columnName}`, { value, error: null });
  }
  state.editsByTab.set(tab.id, edits);
  elements.pendingActions.hidden = false;

  if (targetRows.length > 1) {
    showToast(`${targetRows.length} rijen aangepast in ${columnName}`);
  }

  return targetRows.length;
}

function openCellViewer(rowIndex, columnName) {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const column = payload?.columns?.find((item) => item.name === columnName);
  if (!tab || !payload || !column) return;

  const value = getCurrentCellValue(rowIndex, columnName);
  elements.cellViewerTitle.textContent = columnName;
  elements.cellViewerMeta.textContent = `${tab.tableName} · rij ${rowIndex + 1}${column.type ? ` · ${column.type}` : ''}`;
  elements.cellViewerValue.value = formatExpandedCellValue(value);
  elements.cellViewerBackdrop.hidden = false;
  elements.cellViewerDialog.hidden = false;
  elements.cellViewerValue.focus();
  elements.cellViewerValue.setSelectionRange(0, 0);
}

function closeCellViewer() {
  elements.cellViewerDialog.hidden = true;
  elements.cellViewerBackdrop.hidden = true;
}

function isBlockingDialogOpen() {
  return !elements.connectionForm.hidden
    || !elements.sqlDialog.hidden
    || !elements.cellViewerDialog.hidden
    || !elements.datePicker.hidden
    || !elements.releaseDialog.hidden
    || !elements.errorDialog.hidden;
}

async function copyCellViewerValue() {
  const text = elements.cellViewerValue.value;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    elements.cellViewerValue.focus();
    elements.cellViewerValue.select();
    document.execCommand('copy');
  }
  showToast('Celinhoud gekopieerd');
}

function setTableLoading(isLoading, label = 'Laden...') {
  elements.dataPanel?.classList.toggle('is-loading', isLoading);
  elements.dataPanel?.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  if (elements.tableLoader) {
    elements.tableLoader.hidden = !isLoading;
  }
  if (elements.tableLoaderLabel && isLoading) {
    elements.tableLoaderLabel.textContent = label;
  }
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
    ? '<span class="terminal-glyph" aria-hidden="true">&gt;_</span>'
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

function clearConnectionFormError() {
  elements.connectionFormError.textContent = '';
  elements.connectionFormError.hidden = true;
}

function showConnectionFormError(message) {
  elements.connectionFormError.textContent = cleanErrorMessage(message);
  elements.connectionFormError.hidden = false;
  elements.connectionFormError.scrollIntoView({ block: 'nearest' });
}

function resetConnectionFormPosition() {
  elements.connectionForm.style.left = '50%';
  elements.connectionForm.style.top = '50%';
  elements.connectionForm.style.transform = 'translate(-50%, -50%)';
}

function moveConnectionForm(left, top) {
  const rect = elements.connectionForm.getBoundingClientRect();
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
  elements.connectionForm.style.left = `${Math.min(Math.max(margin, left), maxLeft)}px`;
  elements.connectionForm.style.top = `${Math.min(Math.max(margin, top), maxTop)}px`;
  elements.connectionForm.style.transform = 'none';
}

function openConnectionForm(type = 'mariadb', preset = {}) {
  state.editingConnectionId = preset.id || null;
  clearConnectionFormError();
  elements.connectionFormTitle.textContent = state.editingConnectionId ? 'Connectie bewerken' : 'Nieuwe connectie';
  elements.connectionForm.hidden = false;
  elements.connectionFormBackdrop.hidden = false;
  resetConnectionFormPosition();
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
  clearConnectionFormError();
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
    ? {
        groupId: existingConnection.groupId,
        groupName: existingConnection.groupName,
        ...(Number.isFinite(Number(existingConnection.groupPosition)) ? { groupPosition: Number(existingConnection.groupPosition) } : {})
      }
    : {};
  const existingPosition = Number.isFinite(Number(existingConnection?.position))
    ? { position: Number(existingConnection.position) }
    : {};

  if (elements.connectionTypeSelect.value === 'sqlite') {
    return {
      ...(id ? { id } : {}),
      type: 'sqlite',
      name: elements.connectionNameInput.value,
      path: elements.connectionPathInput.value,
      ...(elements.connectionReadOnlyCheckbox.checked ? { readOnly: true } : {}),
      ...(existingBackgroundColor ? { backgroundColor: existingBackgroundColor } : {}),
      ...existingPosition,
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
      ...existingPosition,
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
    ...existingPosition,
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

async function fetchSchemaForConnection(connection) {
  if (!connection) {
    return null;
  }

  if (connection.type === 'ssh') {
    return null;
  }

  const schema = await window.sqlBase.loadSchema(connection);
  state.schemaByConnection.set(connection.id, schema);
  return schema;
}

async function loadSchemaForActiveConnection() {
  const connection = getActiveConnection();

  try {
    await fetchSchemaForConnection(connection);
  } catch (error) {
    showToast(error.message);
  }
}

async function saveConnection(connection) {
  clearConnectionFormError();
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
    showConnectionFormError(error.message);
  }
}

async function removeConnection(connectionId) {
  for (const tab of state.tabs.filter((item) => item.connectionId === connectionId)) {
    const sshSessionId = state.sshSessionByTab.get(tab.id);
    if (sshSessionId) {
      window.sqlBase.stopSsh(sshSessionId);
    }
    clearTimeout(state.sortTimerByTab.get(tab.id));
    state.sortTimerByTab.delete(tab.id);
    state.tablePayloadByTab.delete(tab.id);
    state.tableLoadSeqByTab.delete(tab.id);
    state.sshSessionByTab.delete(tab.id);
    state.sshOutputByTab.delete(tab.id);
    disposeSshTerminal(tab.id);
  }
  state.connections = await window.sqlBase.removeConnection(connectionId);
  state.schemaByConnection.delete(connectionId);
  state.tabs = state.tabs.filter((tab) => tab.connectionId !== connectionId);
  for (const tabId of [...state.selectedRowsByTab.keys()]) {
    if (!state.tabs.some((tab) => tab.id === tabId)) {
      clearTimeout(state.sortTimerByTab.get(tabId));
      state.sortTimerByTab.delete(tabId);
      state.tablePayloadByTab.delete(tabId);
      state.tableLoadSeqByTab.delete(tabId);
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

async function duplicateConnection(connectionId) {
  try {
    const result = await window.sqlBase.duplicateConnection(connectionId);
    state.connections = [
      result.connection,
      ...state.connections.filter((item) => item.id !== result.connection.id)
    ];
    state.activeConnectionId = result.connection.id;
    if (result.connection.type !== 'ssh') {
      state.schemaByConnection.set(result.connection.id, { tables: result.tables });
    }
    state.sidebarView = 'connections';
    render();
    showToast(`Connectie gedupliceerd: ${result.connection.name}`);
  } catch (error) {
    showToast(error.message);
  }
}

async function disconnectConnection(connectionId) {
  const connectionTabs = state.tabs.filter((tab) => tab.connectionId === connectionId);

  for (const tab of connectionTabs) {
    const sshSessionId = state.sshSessionByTab.get(tab.id);
    if (sshSessionId) {
      await window.sqlBase.stopSsh(sshSessionId);
    }
    clearTimeout(state.sortTimerByTab.get(tab.id));
    state.sortTimerByTab.delete(tab.id);
    state.tablePayloadByTab.delete(tab.id);
    state.tableLoadSeqByTab.delete(tab.id);
    state.selectedRowsByTab.delete(tab.id);
    state.anchorRowByTab.delete(tab.id);
    state.relationLookupByTab.delete(tab.id);
    state.pendingRowsByTab.delete(tab.id);
    state.editsByTab.delete(tab.id);
    state.sshSessionByTab.delete(tab.id);
    state.sshOutputByTab.delete(tab.id);
    disposeSshTerminal(tab.id);
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

async function moveConnection(payload) {
  if (!payload?.sourceConnectionId) return;

  try {
    state.connections = await window.sqlBase.moveConnection(payload);
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
        renderSshView();
        const { cols, rows } = getSshTerminalSize(existing.id);
        const { sessionId } = await window.sqlBase.startSsh({ connection, cols, rows });
        state.sshSessionByTab.set(existing.id, sessionId);
        fitSshTerminal(existing.id);
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
    renderSshView();
    const { cols, rows } = getSshTerminalSize(tab.id);
    const { sessionId } = await window.sqlBase.startSsh({ connection, cols, rows });
    state.sshSessionByTab.set(tab.id, sessionId);
    fitSshTerminal(tab.id);
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

function getSshTerminalSize(tabId) {
  const terminal = state.sshTerminalByTab.get(tabId);
  const size = fitSshTerminal(tabId);
  return {
    cols: size?.cols || terminal?.cols || 100,
    rows: size?.rows || terminal?.rows || 30
  };
}

function disposeSshTerminal(tabId) {
  state.sshResizeObserverByTab.get(tabId)?.disconnect();
  state.sshResizeObserverByTab.delete(tabId);
  state.sshFitByTab.delete(tabId);
  state.sshTerminalByTab.get(tabId)?.dispose();
  state.sshTerminalByTab.delete(tabId);
}

function fitSshTerminal(tabId) {
  const terminal = state.sshTerminalByTab.get(tabId);
  const fitAddon = state.sshFitByTab.get(tabId);
  if (!terminal || !fitAddon || elements.sshView.hidden) return null;

  fitAddon.fit();
  const sessionId = state.sshSessionByTab.get(tabId);
  if (sessionId) {
    window.sqlBase.resizeSsh({ sessionId, cols: terminal.cols, rows: terminal.rows });
  }
  return { cols: terminal.cols, rows: terminal.rows };
}

function getTerminalConstructor() {
  if (typeof window.Terminal === 'function') {
    return window.Terminal;
  }
  if (typeof window.Terminal?.Terminal === 'function') {
    return window.Terminal.Terminal;
  }
  return null;
}

function getFitAddonConstructor() {
  if (typeof window.FitAddon === 'function') {
    return window.FitAddon;
  }
  if (typeof window.FitAddon?.FitAddon === 'function') {
    return window.FitAddon.FitAddon;
  }
  return null;
}

function ensureSshTerminal(tab) {
  let terminal = state.sshTerminalByTab.get(tab.id);
  if (terminal) {
    if (!elements.sshTerminalPane.contains(terminal.element)) {
      elements.sshTerminalPane.innerHTML = '';
      elements.sshTerminalPane.appendChild(terminal.element);
    }
    setTimeout(() => {
      fitSshTerminal(tab.id);
      terminal.focus();
    }, 0);
    return terminal;
  }

  const TerminalConstructor = getTerminalConstructor();
  const FitAddonConstructor = getFitAddonConstructor();

  if (!TerminalConstructor || !FitAddonConstructor) {
    elements.sshTerminalPane.textContent = 'Terminal component kon niet worden geladen.';
    return null;
  }

  terminal = new TerminalConstructor({
    cursorBlink: true,
    convertEol: false,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: 12,
    lineHeight: 1.2,
    scrollback: 5000,
    theme: {
      background: '#07111f',
      foreground: '#d8e6f3',
      cursor: '#f8fafc',
      selectionBackground: '#1e3a5f',
      black: '#0f172a',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#38bdf8',
      magenta: '#a78bfa',
      cyan: '#22d3ee',
      white: '#e2e8f0',
      brightBlack: '#64748b',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#fde047',
      brightBlue: '#7dd3fc',
      brightMagenta: '#c4b5fd',
      brightCyan: '#67e8f9',
      brightWhite: '#ffffff'
    }
  });
  const fitAddon = new FitAddonConstructor();
  terminal.loadAddon(fitAddon);

  elements.sshTerminalPane.innerHTML = '';
  terminal.open(elements.sshTerminalPane);
  state.sshTerminalByTab.set(tab.id, terminal);
  state.sshFitByTab.set(tab.id, fitAddon);

  terminal.onData((data) => {
    const sessionId = state.sshSessionByTab.get(tab.id);
    if (sessionId) {
      window.sqlBase.writeSsh({ sessionId, data });
    }
  });
  terminal.onResize(({ cols, rows }) => {
    const sessionId = state.sshSessionByTab.get(tab.id);
    if (sessionId) {
      window.sqlBase.resizeSsh({ sessionId, cols, rows });
    }
  });

  const observer = new ResizeObserver(() => fitSshTerminal(tab.id));
  observer.observe(elements.sshTerminalPane);
  state.sshResizeObserverByTab.set(tab.id, observer);

  const bufferedOutput = state.sshOutputByTab.get(tab.id);
  if (bufferedOutput) {
    terminal.write(bufferedOutput.replace(/\n/g, '\r\n'));
    state.sshOutputByTab.set(tab.id, '');
  }

  setTimeout(() => {
    fitSshTerminal(tab.id);
    terminal.focus();
  }, 0);

  return terminal;
}

function appendSshOutput(sessionId, data) {
  const tab = state.tabs.find((item) => state.sshSessionByTab.get(item.id) === sessionId);
  if (!tab) return;

  const terminal = state.sshTerminalByTab.get(tab.id);
  if (terminal) {
    terminal.write(data);
  } else {
    state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}${data}`);
  }

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
  elements.backupButton.disabled = true;
  elements.workspaceTitle.textContent = tab.tableName;
  elements.activeConnectionLabel.textContent = connection ? `SSH · ${getConnectionSummary(connection)}` : 'SSH';
  ensureSshTerminal(tab);
}

async function openTable(connection, tableName) {
  const existing = state.tabs.find((tab) => tab.connectionId === connection.id && tab.tableName === tableName);
  if (existing) {
    state.activeTabId = existing.id;
    state.activeConnectionId = connection.id;
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
  state.filterByTab.set(tab.id, createDefaultFilterState());
  render();
  await loadActiveTable();
}

async function loadActiveTable() {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (tab?.type === 'ssh') {
    renderSshView();
    return null;
  }
  if (!tab || !connection) {
    return null;
  }

  const loadSeq = (state.tableLoadSeqByTab.get(tab.id) || 0) + 1;
  state.tableLoadSeqByTab.set(tab.id, loadSeq);
  setTableLoading(true);

  try {
    const filter = getFilterForTab(tab.id);
    const sort = state.sortByTab.get(tab.id) || null;
    const columnFilter = getActiveColumnFilter();
    const payload = await window.sqlBase.loadTable({
      connection,
      tableName: tab.tableName,
      filter: filter.mode === 'text' ? filter.text : '',
      limit: elements.limitInput.value,
      sort,
      columnFilter
    });
    if (state.tableLoadSeqByTab.get(tab.id) !== loadSeq) {
      return null;
    }
    if (sort?.column && sort?.direction && payload.columns?.some((column) => column.name === sort.column)) {
      const query = buildTableSelectQuery(connection, tab.tableName, payload.columns, {
        filter: filter.mode === 'text' ? filter.text : '',
        limit: elements.limitInput.value,
        columnFilter,
        sort
      });
      const result = await window.sqlBase.runSql({ connection, sql: query });
      if (state.tableLoadSeqByTab.get(tab.id) !== loadSeq) {
        return null;
      }
      payload.rows = result.rows || [];
      payload.query = query;
    }
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
    return payload;
  } catch (error) {
    if (state.tableLoadSeqByTab.get(tab.id) === loadSeq) {
      showToast(error.message);
    }
    return null;
  } finally {
    if (state.tableLoadSeqByTab.get(tab.id) === loadSeq) {
      setTableLoading(false);
    }
  }
}

async function loadSortedActiveTable() {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  const payload = state.tablePayloadByTab.get(tab?.id);
  const sort = state.sortByTab.get(tab?.id);
  if (!tab || !connection || !payload?.columns?.length || !sort?.column || !sort?.direction) {
    return loadActiveTable();
  }

  const filter = getFilterForTab(tab.id);
  const query = buildTableSelectQuery(connection, tab.tableName, payload.columns, {
    filter: filter.mode === 'text' ? filter.text : '',
    limit: elements.limitInput.value,
    columnFilter: getActiveColumnFilter(),
    sort
  });

  const loadSeq = (state.tableLoadSeqByTab.get(tab.id) || 0) + 1;
  state.tableLoadSeqByTab.set(tab.id, loadSeq);
  setTableLoading(true, 'Sorteren...');

  try {
    const result = await window.sqlBase.runSql({ connection, sql: query });
    if (state.tableLoadSeqByTab.get(tab.id) !== loadSeq) {
      return null;
    }

    state.tablePayloadByTab.set(tab.id, {
      ...payload,
      rows: result.rows || [],
      query,
      isSqlResult: false
    });
    state.relationLookupByTab.delete(tab.id);
    state.selectedRowsByTab.delete(tab.id);
    state.anchorRowByTab.delete(tab.id);
    renderTableView();
    return state.tablePayloadByTab.get(tab.id);
  } catch (error) {
    if (state.tableLoadSeqByTab.get(tab.id) === loadSeq) {
      showToast(error.message);
    }
    return null;
  } finally {
    if (state.tableLoadSeqByTab.get(tab.id) === loadSeq) {
      setTableLoading(false);
    }
  }
}

function closeTab(tabId) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  clearTimeout(state.sortTimerByTab.get(tabId));
  state.sortTimerByTab.delete(tabId);
  const sshSessionId = state.sshSessionByTab.get(tabId);
  if (sshSessionId) {
    window.sqlBase.stopSsh(sshSessionId);
  }
  state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
  state.tablePayloadByTab.delete(tabId);
  state.tableLoadSeqByTab.delete(tabId);
  state.sshSessionByTab.delete(tabId);
  state.sshOutputByTab.delete(tabId);
  disposeSshTerminal(tabId);
  state.selectedRowsByTab.delete(tabId);
  state.anchorRowByTab.delete(tabId);
  state.relationLookupByTab.delete(tabId);
  state.pendingRowsByTab.delete(tabId);
  state.editsByTab.delete(tabId);
  state.filterByTab.delete(tabId);

  if (state.activeTabId === tabId) {
    state.activeTabId = state.tabs[Math.max(0, index - 1)]?.id || state.tabs[0]?.id || null;
  }

  render();
  renderTableView();
}

function closeAllTabs() {
  for (const tab of state.tabs) {
    clearTimeout(state.sortTimerByTab.get(tab.id));
    const sshSessionId = state.sshSessionByTab.get(tab.id);
    if (sshSessionId) {
      window.sqlBase.stopSsh(sshSessionId);
    }
    disposeSshTerminal(tab.id);
  }

  state.tabs = [];
  state.activeTabId = null;
  state.tablePayloadByTab.clear();
  state.tableLoadSeqByTab.clear();
  state.sshSessionByTab.clear();
  state.sshOutputByTab.clear();
  state.selectedRowsByTab.clear();
  state.anchorRowByTab.clear();
  state.relationLookupByTab.clear();
  state.pendingRowsByTab.clear();
  state.editsByTab.clear();
  state.filterByTab.clear();
  state.sortByTab.clear();
  state.sortTimerByTab.clear();

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

function openDatePicker(td, tab, payload, rowIndex, columnName, rawInputValue, inputType, originalHtml, originalClassName, targetRowsOverride = null) {
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
    const changedRows = applyCellEditValue(tab, payload, rowIndex, columnName, val, original, targetRowsOverride);

    if (!changedRows) {
      td.className = originalClassName;
      td.innerHTML = originalHtml;
      return;
    }

    renderTableView();
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

function getFilterColumnType(index = 0) {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const filter = getColumnFilterAt(index);
  const col = payload?.columns?.find((c) => c.name === filter?.column);
  return col ? getDateInputType(col.type) : null;
}

function getFilterColumnOptionsHtml(selectedValue) {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const cols = payload?.columns || [];
  return '<option value="">— kolom —</option>' +
    cols
      .map((col) => {
        const selected = col.name === selectedValue ? ' selected' : '';
        return `<option value="${escapeHtml(col.name)}"${selected}>${escapeHtml(col.name)}</option>`;
      })
      .join('');
}

function getFilterOperatorOptionsHtml(selectedValue) {
  const options = [
    ['=', 'is gelijk aan'],
    ['!=', 'is niet gelijk aan'],
    ['>', 'groter dan'],
    ['<', 'kleiner dan'],
    ['LIKE', 'bevat'],
    ['BETWEEN', 'tussen']
  ];
  return options
    .map(([value, label]) => `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${label}</option>`)
    .join('');
}

function renderColumnFilterRows() {
  const filter = normalizeColumnFilterState(getActiveFilter());
  elements.filterColumnRows.innerHTML = filter.columnFilters
    .map((item, index) => {
      const dateType = item.column ? getFilterColumnType(index) : null;
      const isDate = Boolean(dateType);
      const isBetween = item.operator === 'BETWEEN';
      const valueButtonText = item.value || (isBetween ? 'Van…' : 'Kies datum…');
      const valueToButtonText = item.valueTo || 'Tot…';
      const addButton = index === filter.columnFilters.length - 1
        ? `<button class="filter-chain-button add" type="button" data-filter-action="add" title="Filter toevoegen" aria-label="Filter toevoegen">+</button>`
        : '';
      const removeButton = filter.columnFilters.length > 1
        ? `<button class="filter-chain-button" type="button" data-filter-action="remove" data-filter-index="${index}" title="Filter verwijderen" aria-label="Filter verwijderen">×</button>`
        : '';

      return `
        <div class="filter-column-row ${isBetween ? 'is-between' : ''}" data-filter-index="${index}">
          <select data-filter-field="column">${getFilterColumnOptionsHtml(item.column)}</select>
          <select data-filter-field="operator">${getFilterOperatorOptionsHtml(item.operator)}</select>
          <input data-filter-field="value" type="text" placeholder="Waarde..." value="${escapeHtml(item.value)}"${isDate ? ' hidden' : ''} />
          <button data-filter-action="date-from" class="filter-date-btn" type="button"${isDate ? '' : ' hidden'}>${escapeHtml(valueButtonText)}</button>
          <span class="filter-between-sep"${isBetween ? '' : ' hidden'}>en</span>
          <input data-filter-field="valueTo" type="text" placeholder="Tot..." value="${escapeHtml(item.valueTo)}"${isBetween && !isDate ? '' : ' hidden'} />
          <button data-filter-action="date-to" class="filter-date-btn" type="button"${isBetween && isDate ? '' : ' hidden'}>${escapeHtml(valueToButtonText)}</button>
          ${addButton}
          ${removeButton}
        </div>
      `;
    })
    .join('');
}

function syncFilterControls() {
  const filter = getActiveFilter();
  elements.filterInput.value = filter.text;
  elements.filterTextMode.hidden = filter.mode === 'column';
  elements.filterColumnMode.hidden = filter.mode !== 'column';
  elements.filterModeToggle.classList.toggle('active', filter.mode === 'column');
  renderColumnFilterRows();
}

elements.datePickerConfirm.addEventListener('click', () => datePickerState.onCommit?.());
elements.datePickerCancel.addEventListener('click', () => datePickerState.onCancel?.());

elements.datePickerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); datePickerState.onCommit?.(); }
  if (e.key === 'Escape') { e.preventDefault(); datePickerState.onCancel?.(); }
});

elements.datePickerBackdrop.addEventListener('click', () => datePickerState.onCancel?.());

function isTruncatableTableType(type) {
  const normalized = String(type || '').toLowerCase();
  return normalized === 'table' || normalized === 'base table';
}

function getSidebarTableKindLabel(type) {
  const normalized = String(type || '').toLowerCase();
  if (isTruncatableTableType(normalized)) return '';
  return normalized;
}

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

    elements.sidebarFilterWrap.hidden = !state.sidebarFilterOpen;

    const tables = schema?.tables || [];
    const filterQ = elements.sidebarFilterInput.value.toLowerCase().trim();
    const visibleTables = filterQ ? tables.filter((t) => t.name.toLowerCase().includes(filterQ)) : tables;
    elements.connectionsList.innerHTML = visibleTables.length
      ? visibleTables.map((table) => {
          const kindLabel = getSidebarTableKindLabel(table.type);
          return `
            <button class="table-button ${activeTab?.connectionId === connection.id && activeTab?.tableName === table.name ? 'active' : ''}"
                    data-table-name="${escapeHtml(table.name)}"
                    data-table-type="${escapeHtml(table.type || '')}"
                    data-table-connection-id="${escapeHtml(connection.id)}">
              <span>
                <span class="table-name">${escapeHtml(table.name)}</span>
                ${kindLabel ? `<span class="table-kind">${escapeHtml(kindLabel)}</span>` : ''}
              </span>
            </button>
          `;
        }).join('')
      : `<p class="muted-note">${filterQ ? 'Geen resultaten.' : 'Geen tabellen gevonden.'}</p>`;

    elements.connectionsList.dataset.view = 'tables';
  } else {
    elements.sidebarFilterInput.value = '';
    elements.sidebarFilterWrap.hidden = true;
    state.sidebarFilterOpen = false;
    elements.sidebarNav.innerHTML = '<div class="section-title">Connecties</div>';
    elements.connectionsList.innerHTML = '';
    elements.connectionsList.dataset.view = 'connections';

    if (!state.connections.length) {
      elements.connectionsList.innerHTML = '<p class="muted-note">Nog geen connecties. Maak er linksboven een aan.</p>';
      return;
    }

    const appendConnectionCard = (conn, parent) => {
      const isTerminal = conn.type === 'ssh';
      const typeLabel = isTerminal ? 'Terminal' : 'Database';
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
      item.innerHTML = `
        <button
          type="button"
          class="connection-status-dot ${isActive ? 'active' : 'inactive'}"
          ${isActive ? `data-disconnect-connection-id="${escapeHtml(conn.id)}"` : 'disabled'}
          title="${isActive ? 'Disconnect' : 'Niet actief'}"
          aria-label="${isActive ? `Disconnect ${escapeHtml(conn.name)}` : `${escapeHtml(conn.name)} is niet actief`}"
        ></button>
        <button class="connection-button" data-connection-id="${escapeHtml(conn.id)}">
          <span class="connection-type-icon ${isTerminal ? 'ssh' : 'database'}" title="${typeLabel}" aria-label="${typeLabel}">
            ${typeIcon}
          </span>
          <span class="connection-details">
            <span class="connection-title-row">
              <span class="connection-name">${escapeHtml(conn.name)}</span>
              ${conn.readOnly ? '<span class="connection-read-only-badge" title="Alleen lezen" aria-label="Alleen lezen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="9" height="9" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' : ''}
            </span>
            <span class="connection-path">${escapeHtml(getConnectionSummary(conn))}</span>
          </span>
        </button>
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
  const closeAllIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  elements.tabsBar.innerHTML = `${state.tabs
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
    .join('')}${
      state.tabs.length
        ? `<button class="tabs-close-all" type="button" data-close-all-tabs title="Sluit alle tabs" aria-label="Sluit alle tabs">${closeAllIcon}</button>`
        : ''
    }`;
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

function appendPendingRows(tab, columns, payload) {
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
      const fkRel = payload ? getOutgoingRelationByColumn(payload, column.name) : null;

      if (fkRel) {
        const wrapper = document.createElement('div');
        wrapper.className = 'fk-picker';

        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.col = column.name;
        input.value = pendingRow.values[column.name] ?? '';
        input.placeholder = column.name;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fk-picker-btn';
        btn.dataset.fkTable = fkRel.relation.toTable;
        btn.dataset.fkColumn = fkRel.relation.toColumn;
        btn.title = `Kies uit ${fkRel.relation.toTable}`;
        btn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8L5 7z"/></svg>';

        wrapper.appendChild(input);
        wrapper.appendChild(btn);
        td.appendChild(wrapper);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.col = column.name;
        input.value = pendingRow.values[column.name] ?? '';
        input.placeholder = column.name;
        td.appendChild(input);
      }

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
    if (pendingRow.error) tr.classList.add('pending-row-failed');
    tbody.appendChild(tr);
  }
}

function renderDataTable(payload) {
  const tab = getActiveTab();
  const columns = payload.columns || [];
  const rows = payload.rows || [];
  const selectedRows = state.selectedRowsByTab.get(tab?.id) || new Set();
  const edits = state.editsByTab.get(tab?.id) || new Map();
  const sort = payload.isSqlResult ? null : state.sortByTab.get(tab?.id);

  const renderCellViewButton = (rowIndex, columnName) => `
    <button
      type="button"
      class="cell-expand-button"
      data-view-cell-row-index="${rowIndex}"
      data-view-cell-column="${escapeHtml(columnName)}"
      title="Bekijk celinhoud groot"
      aria-label="Bekijk celinhoud van ${escapeHtml(columnName)} groot"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 3h6v6"/>
        <path d="M10 14 21 3"/>
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>
      </svg>
    </button>
  `;

  const renderCell = (row, column, rowIndex) => {
    const editKey = `${rowIndex}:${column.name}`;
    const edit = edits.get(editKey);
    const rawValue = row[column.name];

    if (edit !== undefined) {
      const cellClass = edit.error ? 'edited-cell-error' : 'edited-cell';
      const content = edit.value === '' ? '<span class="muted-note">NULL</span>' : escapeHtml(edit.value);
      const titleText = edit.error ? edit.error : edit.value;
      return `
        <td class="data-cell ${cellClass}" title="${escapeHtml(titleText)}">
          <span class="cell-content">${content}</span>
          ${renderCellViewButton(rowIndex, column.name)}
        </td>
      `;
    }

    const relationMatch = getOutgoingRelationByColumn(payload, column.name);
    const content = formatValueWithHighlight(rawValue, column.name);

    if (!relationMatch) {
      return `
        <td class="data-cell" title="${escapeHtml(formatPlainValue(rawValue))}">
          <span class="cell-content">${content}</span>
          ${renderCellViewButton(rowIndex, column.name)}
        </td>
      `;
    }

    return `
      <td class="data-cell relation-cell" title="Klik om ${escapeHtml(relationMatch.relation.toTable)} te openen voor ${escapeHtml(formatPlainValue(rawValue))}; dubbelklik om te bewerken">
        <span class="cell-content">
          <button
            type="button"
            class="relation-value-button"
            data-row-index="${rowIndex}"
            data-relation-kind="outgoing"
            data-relation-index="${relationMatch.index}"
          >
            ${content}
          </button>
        </span>
        ${renderCellViewButton(rowIndex, column.name)}
      </td>
    `;
  };

  elements.tableMeta.textContent = `${rows.length} rijen geladen, ${columns.length} kolommen`;
  elements.dataTable.innerHTML = `
    <thead>
      <tr>${columns.map((column) => {
        const dir = sort?.column === column.name ? sort.direction : null;
        const arrow = dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '⇅';
        return payload.isSqlResult
          ? `<th>${escapeHtml(column.name)}</th>`
          : `<th data-sort-col="${escapeHtml(column.name)}" class="${dir ? `sorted-${dir}` : ''}">${escapeHtml(column.name)}<span class="sort-arrow">${arrow}</span></th>`;
      }).join('')}</tr>
    </thead>
    <tbody>
      ${
        rows.length
          ? rows
              .map((row, originalIndex) => ({ row, originalIndex }))
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
  appendPendingRows(tab, columns, payload);
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
  const relationItems = [
    ...outgoing.map((relation, index) => ({ relation, kind: 'outgoing', index })),
    ...incoming.map((relation, index) => ({ relation, kind: 'incoming', index }))
  ];
  const cards = relationItems
    .sort((a, b) => {
      const aIsActive = lookup?.key === getRelationKey(a.kind, a.index);
      const bIsActive = lookup?.key === getRelationKey(b.kind, b.index);
      return Number(bIsActive) - Number(aIsActive);
    })
    .map(({ relation, kind, index }) => renderCard(relation, kind, index));

  elements.relationsList.innerHTML = cards.length
    ? cards.join('')
    : '<p class="muted-note">Geen foreign key-relaties gevonden voor deze tabel.</p>';
  if (lookup && cards.length) {
    elements.relationsList.scrollTop = 0;
  }
}

function renderTableView() {
  capturePendingInputValues();

  const tab = getActiveTab();
  if (tab?.type === 'ssh') {
    renderSshView();
    return;
  }

  const payload = state.tablePayloadByTab.get(tab?.id);
  const activeConnection = tab
    ? state.connections.find((connection) => connection.id === tab.connectionId)
    : getActiveConnection();
  const isReadOnly = Boolean(activeConnection?.readOnly);
  const pendingRows = state.pendingRowsByTab.get(tab?.id) || [];
  const edits = state.editsByTab.get(tab?.id);
  const hasPending = pendingRows.length > 0 || (edits && edits.size > 0);
  const isDataMode = state.mode === 'data';
  const isSqlResult = Boolean(payload?.isSqlResult);

  elements.emptyState.hidden = Boolean(tab);
  elements.tableView.hidden = !tab;
  elements.sshView.hidden = true;
  const hasDatabaseConnection = Boolean(activeConnection && activeConnection.type !== 'ssh');
  elements.refreshButton.disabled = !hasDatabaseConnection;
  elements.backupButton.disabled = !(tab?.type === 'database' && payload && hasDatabaseConnection && !isSqlResult);
  elements.tableActions.hidden = !tab || !payload;
  elements.addRowButton.disabled = !isDataMode || isReadOnly || isSqlResult;
  elements.sqlButton.disabled = !tab || !payload || isReadOnly;
  elements.pendingActions.hidden = !hasPending || !isDataMode || isSqlResult;
  elements.readOnlyBadge.hidden = !isReadOnly || !tab;
  elements.filterArea.hidden = !isDataMode;

  if (!tab) {
    setTableLoading(false);
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
    syncFilterControls();
    elements.tableMeta.textContent = 'Laden...';
    elements.dataTable.innerHTML = '';
    elements.relationsList.innerHTML = '';
    return;
  }

  syncFilterControls();

  if (state.mode === 'structure') {
    renderStructureTable(payload);
  } else {
    renderDataTable(payload);
  }
  renderRelations(isSqlResult ? { ...payload, relations: { outgoing: [], incoming: [] } } : payload);
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
      if (failedRows.length > 0) {
        const msg = failedRows.length === 1
          ? failedRows[0].error
          : failedRows.map((r, i) => `Rij ${i + 1}: ${r.error}`).join('\n');
        showErrorDialog(msg);
      }
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

function closeConnectionContextMenu() {
  document.querySelector('.connection-context-menu:not(.row-context-menu):not(.table-context-menu)')?.remove();
  state.contextMenuConnectionId = null;
}

function closeTableContextMenu() {
  document.querySelector('.table-context-menu')?.remove();
  state.contextMenuTable = null;
}

function closeRowContextMenu() {
  document.querySelector('.row-context-menu')?.remove();
  state.contextMenuRowIndex = null;
}

function positionContextMenu(menu, event) {
  const rect = menu.getBoundingClientRect();
  const left = Math.min(event.clientX, window.innerWidth - rect.width - 8);
  const top = Math.min(event.clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

function openRowContextMenu(event, rowIndex) {
  event.preventDefault();
  closeConnectionContextMenu();
  closeTableContextMenu();
  closeRowContextMenu();

  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || !payload || !connection || state.mode !== 'data' || payload.isSqlResult) return;

  const selectedRows = state.selectedRowsByTab.get(tab.id) || new Set();
  if (!selectedRows.has(rowIndex)) {
    selectRow(tab, rowIndex);
  }

  const rowCount = getDeleteRowIndexes(tab, payload, rowIndex).length;
  state.contextMenuRowIndex = rowIndex;

  const menu = document.createElement('div');
  menu.className = 'connection-context-menu row-context-menu';
  menu.innerHTML = `
    <button type="button" data-row-context-action="delete" class="danger" ${connection.readOnly ? 'disabled' : ''}>
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </span>
      ${rowCount === 1 ? 'Verwijder rij' : `Verwijder ${rowCount} rijen`}
    </button>
  `;
  document.body.appendChild(menu);
  positionContextMenu(menu, event);
}

function openTableContextMenu(event, connectionId, tableName, tableType) {
  event.preventDefault();
  closeConnectionContextMenu();
  closeTableContextMenu();
  closeRowContextMenu();

  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection || !tableName) return;

  const canTruncate = !connection.readOnly && isTruncatableTableType(tableType);
  state.contextMenuTable = { connectionId, tableName, tableType };

  const menu = document.createElement('div');
  menu.className = 'connection-context-menu table-context-menu';
  menu.innerHTML = `
    <button type="button" data-table-context-action="truncate" class="danger" ${canTruncate ? '' : 'disabled'}>
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>
      </span>
      Truncate table
    </button>
  `;
  document.body.appendChild(menu);
  positionContextMenu(menu, event);
}

function openConnectionContextMenu(event, connectionId) {
  event.preventDefault();
  closeConnectionContextMenu();
  closeTableContextMenu();
  closeRowContextMenu();
  state.contextMenuConnectionId = connectionId;
  const conn = state.connections.find((item) => item.id === connectionId);
  const backgroundColor = isHexColor(conn?.backgroundColor) ? conn.backgroundColor.toLowerCase() : '#ffffff';
  const colorButtons = connectionColorOptions.map((option) => `
    <button
      type="button"
      class="connection-color-swatch connection-color-option ${backgroundColor === option.value ? 'active' : ''}"
      style="--swatch-color: ${option.value}"
      data-context-color="${escapeHtml(option.value)}"
      title="${escapeHtml(option.label)}"
      aria-label="${escapeHtml(option.label)} als achtergrond"
    ></button>
  `).join('');

  const menu = document.createElement('div');
  menu.className = 'connection-context-menu';
  menu.innerHTML = `
    <button type="button" data-context-action="edit">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </span>
      Bewerk connectie
    </button>
    <button type="button" data-context-action="duplicate">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </span>
      Dupliceer connectie
    </button>
    <div class="connection-context-colors" role="group" aria-label="Achtergrondkleur kiezen">
      ${colorButtons}
    </div>
    <button type="button" data-context-action="remove" class="danger">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </span>
      Verwijder connectie
    </button>
  `;
  document.body.appendChild(menu);
  positionContextMenu(menu, event);
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('sqlbase.theme', next); } catch {}
}

async function backupActiveTable() {
  const tab = getActiveTab();
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || tab.type !== 'database' || !connection) {
    return;
  }

  try {
    const result = await window.sqlBase.backupTable({ connection, tableName: tab.tableName });
    if (result?.canceled) {
      return;
    }

    showToast(`Tabelbackup klaar: ${result.filePath}`);
  } catch (error) {
    showToast(error.message);
  }
}

async function truncateSidebarTable(context) {
  const { connectionId, tableName, tableType } = context || {};
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection || !tableName) return;

  if (connection.readOnly) {
    showToast('Alleen lezen staat aan voor deze connectie.');
    return;
  }

  if (!isTruncatableTableType(tableType)) {
    showToast('Alleen echte tabellen kunnen worden geleegd.');
    return;
  }

  if (!confirm(`Alle rijen uit "${tableName}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
    return;
  }

  try {
    await window.sqlBase.truncateTable({ connection, tableName });

    for (const tab of state.tabs) {
      if (tab.connectionId === connectionId && tab.tableName === tableName) {
        state.tablePayloadByTab.delete(tab.id);
        state.selectedRowsByTab.delete(tab.id);
        state.anchorRowByTab.delete(tab.id);
        state.relationLookupByTab.delete(tab.id);
        state.pendingRowsByTab.delete(tab.id);
        state.editsByTab.delete(tab.id);
      }
    }

    const activeTab = getActiveTab();
    if (activeTab?.connectionId === connectionId && activeTab?.tableName === tableName) {
      await loadActiveTable();
    } else {
      renderTableView();
    }

    showToast(`Tabel "${tableName}" geleegd.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshActiveView() {
  const tab = getActiveTab();
  const connection = tab?.type === 'database'
    ? state.connections.find((item) => item.id === tab.connectionId)
    : getActiveConnection();

  if (!connection || connection.type === 'ssh') {
    return;
  }

  const originalText = elements.refreshButton.textContent;
  elements.refreshButton.textContent = 'Verversen...';
  elements.refreshButton.disabled = true;
  if (tab?.type === 'database') {
    elements.tableMeta.textContent = 'Verversen...';
  }

  try {
    state.activeConnectionId = connection.id;
    const schema = await fetchSchemaForConnection(connection);
    if (tab?.type === 'database') {
      const payload = await loadActiveTable();
      if (!payload) {
        return;
      }
      const rowCount = payload?.rows?.length ?? 0;
      const columnCount = payload?.columns?.length ?? 0;
      showToast(`${tab.tableName} ververst: ${rowCount} rijen, ${columnCount} kolommen`);
    } else {
      render();
      showToast(`Schema ververst: ${schema?.tables?.length || 0} tabellen`);
    }
  } catch (error) {
    showToast(error.message);
    renderTableView();
  } finally {
    elements.refreshButton.textContent = originalText;
    renderTableView();
  }
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

elements.backupButton.addEventListener('click', backupActiveTable);

elements.connectionFormHeader.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.target.closest('button')) return;
  const rect = elements.connectionForm.getBoundingClientRect();
  connectionFormDrag.active = true;
  connectionFormDrag.pointerId = event.pointerId;
  connectionFormDrag.offsetX = event.clientX - rect.left;
  connectionFormDrag.offsetY = event.clientY - rect.top;
  elements.connectionForm.classList.add('dragging');
  elements.connectionFormHeader.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

elements.connectionFormHeader.addEventListener('pointermove', (event) => {
  if (!connectionFormDrag.active || connectionFormDrag.pointerId !== event.pointerId) return;
  moveConnectionForm(
    event.clientX - connectionFormDrag.offsetX,
    event.clientY - connectionFormDrag.offsetY
  );
});

function stopConnectionFormDrag(event) {
  if (!connectionFormDrag.active || connectionFormDrag.pointerId !== event.pointerId) return;
  connectionFormDrag.active = false;
  connectionFormDrag.pointerId = null;
  elements.connectionForm.classList.remove('dragging');
  elements.connectionFormHeader.releasePointerCapture?.(event.pointerId);
}

elements.connectionFormHeader.addEventListener('pointerup', stopConnectionFormDrag);
elements.connectionFormHeader.addEventListener('pointercancel', stopConnectionFormDrag);

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

document.addEventListener('click', async (event) => {
  const menu = event.target.closest('.connection-context-menu');
  if (!menu) {
    closeConnectionContextMenu();
    closeTableContextMenu();
    return;
  }

  const actionButton = event.target.closest('[data-context-action]');
  const tableActionButton = event.target.closest('[data-table-context-action]');
  const colorButton = event.target.closest('[data-context-color]');
  if (colorButton && state.contextMenuConnectionId) {
    const connectionId = state.contextMenuConnectionId;
    const color = colorButton.dataset.contextColor;
    closeConnectionContextMenu();
    await updateConnectionBackground(connectionId, color);
    return;
  }

  if (actionButton?.dataset.contextAction === 'edit' && state.contextMenuConnectionId) {
    const connectionId = state.contextMenuConnectionId;
    const conn = state.connections.find((item) => item.id === connectionId);
    closeConnectionContextMenu();
    if (conn) openConnectionForm(conn.type, conn);
    return;
  }

  if (actionButton?.dataset.contextAction === 'duplicate' && state.contextMenuConnectionId) {
    const connectionId = state.contextMenuConnectionId;
    closeConnectionContextMenu();
    duplicateConnection(connectionId);
    return;
  }

  if (actionButton?.dataset.contextAction === 'remove' && state.contextMenuConnectionId) {
    const connectionId = state.contextMenuConnectionId;
    const conn = state.connections.find((item) => item.id === connectionId);
    closeConnectionContextMenu();
    if (conn && !confirm(`Connectie "${conn.name}" verwijderen?`)) return;
    await removeConnection(connectionId);
  }

  if (tableActionButton?.dataset.tableContextAction === 'truncate' && state.contextMenuTable) {
    const context = state.contextMenuTable;
    closeTableContextMenu();
    await truncateSidebarTable(context);
  }
});

document.addEventListener('click', async (event) => {
  const menu = event.target.closest('.row-context-menu');
  if (!menu) {
    closeRowContextMenu();
    return;
  }

  const actionButton = event.target.closest('[data-row-context-action]');
  if (actionButton?.dataset.rowContextAction === 'delete' && state.contextMenuRowIndex !== null) {
    const rowIndex = state.contextMenuRowIndex;
    closeRowContextMenu();
    await deleteSelectedRows(rowIndex);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeConnectionContextMenu();
    closeTableContextMenu();
    closeRowContextMenu();
  }
});

window.addEventListener('resize', () => {
  closeConnectionContextMenu();
  closeTableContextMenu();
  closeRowContextMenu();
  if (!elements.connectionForm.hidden && elements.connectionForm.style.transform === 'none') {
    const rect = elements.connectionForm.getBoundingClientRect();
    moveConnectionForm(rect.left, rect.top);
  }
});
window.addEventListener('blur', () => {
  closeConnectionContextMenu();
  closeTableContextMenu();
  closeRowContextMenu();
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
  const connectionButton = event.target.closest('[data-connection-id]');
  const tableButton = event.target.closest('[data-table-name]');
  const removeButton = event.target.closest('[data-remove-connection-id]');

  if (disconnectButton) {
    await disconnectConnection(disconnectButton.dataset.disconnectConnectionId);
    return;
  }

  if (removeButton) {
    const conn = state.connections.find((c) => c.id === removeButton.dataset.removeConnectionId);
    if (conn && !confirm(`Connectie "${conn.name}" verwijderen?`)) return;
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

elements.connectionsList.addEventListener('contextmenu', (event) => {
  const tableButton = event.target.closest('[data-table-name]');
  if (tableButton) {
    openTableContextMenu(
      event,
      tableButton.dataset.tableConnectionId,
      tableButton.dataset.tableName,
      tableButton.dataset.tableType
    );
    return;
  }

  const card = event.target.closest('[data-connection-card-id]');
  if (!card) {
    closeConnectionContextMenu();
    closeTableContextMenu();
    return;
  }

  openConnectionContextMenu(event, card.dataset.connectionCardId);
});

elements.connectionsList.addEventListener('keydown', async (event) => {
  const groupNameInput = event.target.closest('[data-group-name-id]');
  if (!groupNameInput || event.key !== 'Enter') return;

  event.preventDefault();
  await updateConnectionGroupName(groupNameInput.dataset.groupNameId, groupNameInput.value);
  groupNameInput.blur();
});

function getConnectionDropPlacement(event, targetEl) {
  const rect = targetEl.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
  if (ratio < 0.28) return 'before';
  if (ratio > 0.72) return 'after';
  return 'inside';
}

function getGroupDropPlacement(event, groupEl) {
  const rect = groupEl.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function setConnectionDropTarget(targetEl, placement) {
  clearConnectionDropTargets();
  targetEl.classList.add(`drop-${placement}`);
}

function clearConnectionDropTargets() {
  elements.connectionsList
    .querySelectorAll('.drop-before, .drop-after, .drop-inside')
    .forEach((item) => {
      item.classList.remove('drop-before', 'drop-after', 'drop-inside');
    });
}

async function handleConnectionDrop(event) {
  const sourceConnectionId = event.dataTransfer.getData('text/plain') || state.draggingConnectionId;
  if (!sourceConnectionId) return;

  const item = event.target.closest('[data-connection-card-id]');
  if (item?.dataset.connectionCardId === sourceConnectionId) return;
  if (item && item.dataset.connectionCardId !== sourceConnectionId) {
    event.preventDefault();
    const placement = getConnectionDropPlacement(event, item);
    if (placement === 'inside') {
      await groupConnections(sourceConnectionId, item.dataset.connectionCardId);
    } else {
      await moveConnection({
        sourceConnectionId,
        targetConnectionId: item.dataset.connectionCardId,
        placement
      });
    }
    return;
  }

  const groupEl = event.target.closest('[data-connection-group-id]');
  if (groupEl) {
    event.preventDefault();
    await moveConnection({
      sourceConnectionId,
      targetGroupId: groupEl.dataset.connectionGroupId,
      placement: getGroupDropPlacement(event, groupEl)
    });
  }
}

function updateConnectionDragTarget(event) {
  const sourceConnectionId = state.draggingConnectionId;
  if (!sourceConnectionId) return false;

  const item = event.target.closest('[data-connection-card-id]');
  if (item?.dataset.connectionCardId === sourceConnectionId) {
    clearConnectionDropTargets();
    return false;
  }
  if (item && item.dataset.connectionCardId !== sourceConnectionId) {
    const placement = getConnectionDropPlacement(event, item);
    setConnectionDropTarget(item, placement);
    return true;
  }

  const groupEl = event.target.closest('[data-connection-group-id]');
  if (groupEl) {
    const placement = getGroupDropPlacement(event, groupEl);
    setConnectionDropTarget(groupEl, placement);
    return true;
  }

  clearConnectionDropTargets();
  return false;
}

elements.connectionsList.addEventListener('dragstart', (event) => {
  const item = event.target.closest('[data-connection-card-id]');
  if (!item) return;

  state.draggingConnectionId = item.dataset.connectionCardId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', state.draggingConnectionId);
  item.classList.add('dragging');
});

elements.connectionsList.addEventListener('dragover', (event) => {
  if (!updateConnectionDragTarget(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
});

elements.connectionsList.addEventListener('dragleave', (event) => {
  const target = event.target.closest('[data-connection-card-id], [data-connection-group-id]');
  if (target && !target.contains(event.relatedTarget)) {
    target.classList.remove('drop-before', 'drop-after', 'drop-inside');
  }
});

elements.connectionsList.addEventListener('drop', async (event) => {
  clearConnectionDropTargets();
  await handleConnectionDrop(event);
});

elements.connectionsList.addEventListener('dragend', () => {
  const item = elements.connectionsList.querySelector('.connection-item.dragging');
  item?.classList.remove('dragging');
  clearConnectionDropTargets();
  state.draggingConnectionId = null;
});

elements.tabsBar.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-close-tab-id]');
  const closeAllButton = event.target.closest('[data-close-all-tabs]');
  const tabButton = event.target.closest('[data-tab-id]');

  if (closeAllButton) {
    event.stopPropagation();
    closeAllTabs();
    return;
  }

  if (closeButton) {
    event.stopPropagation();
    closeTab(closeButton.dataset.closeTabId);
    return;
  }

  if (tabButton) {
    state.activeTabId = tabButton.dataset.tabId;
    state.mode = 'data';
    const nextTab = getActiveTab();
    if (nextTab?.connectionId) {
      state.activeConnectionId = nextTab.connectionId;
    }
    render();
    if (nextTab?.type !== 'ssh') {
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
  getActiveFilter().text = elements.filterInput.value;
  debounceLoadActiveTable();
});

elements.filterModeToggle.addEventListener('click', () => {
  const filter = getActiveFilter();
  const toColumn = filter.mode === 'text';
  filter.mode = toColumn ? 'column' : 'text';
  if (!toColumn) {
    filter.columnFilters = [createDefaultColumnFilterState()];
    syncFilterControls();
    loadActiveTable();
  } else {
    syncFilterControls();
    elements.filterColumnRows.querySelector('select[data-filter-field="column"]')?.focus();
  }
});

elements.filterColumnRows.addEventListener('change', (event) => {
  const target = event.target;
  const row = target.closest('.filter-column-row');
  if (!row) return;

  const index = Number(row.dataset.filterIndex);
  const item = getColumnFilterAt(index);
  if (!item) return;

  const wasRunnable = isRunnableColumnFilter(item);

  if (target.dataset.filterField === 'column') {
    item.column = target.value;
    syncFilterControls();
    if (wasRunnable || isRunnableColumnFilter(item)) {
      clearTimeout(state.filterTimer);
      loadActiveTable();
    }
  } else if (target.dataset.filterField === 'operator') {
    item.operator = target.value;
    item.valueTo = '';
    syncFilterControls();
    if (wasRunnable || isRunnableColumnFilter(item)) {
      clearTimeout(state.filterTimer);
      loadActiveTable();
    }
  }
});

elements.filterColumnRows.addEventListener('input', (event) => {
  const target = event.target;
  const field = target.dataset.filterField;
  if (field !== 'value' && field !== 'valueTo') return;

  const row = target.closest('.filter-column-row');
  const index = Number(row?.dataset.filterIndex);
  const item = getColumnFilterAt(index);
  if (!item) return;

  const wasRunnable = isRunnableColumnFilter(item);
  item[field] = target.value;
  if (wasRunnable || isRunnableColumnFilter(item)) {
    debounceLoadActiveTable();
  } else {
    clearTimeout(state.filterTimer);
  }
});

elements.filterColumnRows.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter-action]');
  if (!button) return;

  const action = button.dataset.filterAction;
  const filter = getActiveFilter();
  const row = button.closest('.filter-column-row');
  const index = Number(button.dataset.filterIndex ?? row?.dataset.filterIndex);

  if (action === 'add') {
    filter.columnFilters.push(createDefaultColumnFilterState());
    syncFilterControls();
    elements.filterColumnRows
      .querySelector(`.filter-column-row[data-filter-index="${filter.columnFilters.length - 1}"] select[data-filter-field="column"]`)
      ?.focus();
    return;
  }

  if (action === 'remove') {
    if (filter.columnFilters.length <= 1 || !Number.isInteger(index)) return;
    const removedWasRunnable = isRunnableColumnFilter(filter.columnFilters[index]);
    filter.columnFilters.splice(index, 1);
    syncFilterControls();
    if (removedWasRunnable) loadActiveTable();
    return;
  }

  if (action !== 'date-from' && action !== 'date-to') return;
  if (!Number.isInteger(index)) return;

  const dateType = getFilterColumnType(index);
  if (!dateType) return;

  const tabId = getActiveTab()?.id;
  const item = getColumnFilterAt(index);
  const dateField = action === 'date-to' ? 'valueTo' : 'value';
  openFilterDatePicker(dateType, item?.[dateField] || '', button, (val) => {
    const targetItem = getColumnFilterAt(index, getFilterForTab(tabId));
    if (!targetItem) return;
    targetItem[dateField] = val;
    if (state.activeTabId === tabId) {
      syncFilterControls();
      if (dateField === 'valueTo') {
        if (targetItem.value.trim()) loadActiveTable();
      } else if (targetItem.operator !== 'BETWEEN' || targetItem.valueTo.trim()) {
        loadActiveTable();
      }
    }
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
  syncSelectedRowClasses(tab);

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

function getDeleteRowIndexes(tab, payload, preferredRowIndex = null) {
  const selectedRows = state.selectedRowsByTab.get(tab.id) || new Set();
  const rowCount = payload.rows?.length || 0;
  const indexes = selectedRows.size && (preferredRowIndex === null || selectedRows.has(preferredRowIndex))
    ? [...selectedRows]
    : [preferredRowIndex];

  return [...new Set(indexes)]
    .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < rowCount)
    .sort((left, right) => left - right);
}

function buildDeleteOperations(payload, rowIndexes) {
  const pkColumns = payload.columns.filter((col) => Number(col.pk));
  const keyColumns = pkColumns.length ? pkColumns : payload.columns;

  return rowIndexes.map((rowIndex) => {
    const originalRow = payload.rows[rowIndex];
    return {
      whereValues: Object.fromEntries(keyColumns.map((col) => [col.name, originalRow[col.name] ?? null])),
      limitOne: pkColumns.length === 0
    };
  });
}

async function deleteSelectedRows(preferredRowIndex = null) {
  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  const connection = state.connections.find((item) => item.id === tab?.connectionId);
  if (!tab || !payload || !connection || state.mode !== 'data') return;

  if (payload.isSqlResult) {
    showToast('Rijen uit een SQL-resultaat kunnen niet direct worden verwijderd.');
    return;
  }

  if (connection.readOnly) {
    showToast('Alleen lezen staat aan voor deze connectie.');
    return;
  }

  const rowIndexes = getDeleteRowIndexes(tab, payload, preferredRowIndex);
  if (!rowIndexes.length) return;

  const label = rowIndexes.length === 1 ? '1 rij' : `${rowIndexes.length} rijen`;
  if (!confirm(`${label} verwijderen uit "${tab.tableName}"?`)) return;

  try {
    const results = await window.sqlBase.deleteRows({
      connection,
      tableName: tab.tableName,
      rows: buildDeleteOperations(payload, rowIndexes)
    });
    const failed = results
      .map((result, index) => (result.ok ? null : `Rij ${index + 1}: ${result.error}`))
      .filter(Boolean);

    if (failed.length) {
      showErrorDialog(failed.join('\n'));
      state.selectedRowsByTab.delete(tab.id);
      state.anchorRowByTab.delete(tab.id);
      state.relationLookupByTab.delete(tab.id);
      await loadActiveTable();
    } else {
      showToast(rowIndexes.length === 1 ? 'Rij verwijderd' : `${rowIndexes.length} rijen verwijderd`);
      state.selectedRowsByTab.delete(tab.id);
      state.anchorRowByTab.delete(tab.id);
      state.relationLookupByTab.delete(tab.id);
      await loadActiveTable();
    }
  } catch (error) {
    showToast(error.message);
  }
}

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const isArrow = e.key === 'ArrowDown' || e.key === 'ArrowUp';
  const isCopy = (e.metaKey || e.ctrlKey) && e.key === 'c';
  const isPaste = (e.metaKey || e.ctrlKey) && e.key === 'v';
  const isDelete = e.key === 'Delete';
  if (!isArrow && !isCopy && !isPaste && !isDelete) return;
  if (isBlockingDialogOpen()) return;

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
  } else if (isDelete) {
    const selectedRows = state.selectedRowsByTab.get(tab.id);
    if (!selectedRows?.size) return;
    e.preventDefault();
    deleteSelectedRows();
  }
});

elements.dataTable.addEventListener('click', async (event) => {
  const tab = getActiveTab();
  if (!tab) return;

  const cellExpandButton = event.target.closest('.cell-expand-button');
  if (cellExpandButton) {
    event.preventDefault();
    event.stopPropagation();
    openCellViewer(
      Number(cellExpandButton.dataset.viewCellRowIndex),
      cellExpandButton.dataset.viewCellColumn
    );
    return;
  }

  const fkBtn = event.target.closest('.fk-picker-btn');
  if (fkBtn) {
    event.stopPropagation();
    if (activeFkBtn === fkBtn) {
      closeFkDropdown();
      return;
    }
    const wrapper = fkBtn.closest('.fk-picker');
    activeFkInput = wrapper.querySelector('input[data-col]');
    activeFkBtn = fkBtn;
    const rect = wrapper.getBoundingClientRect();
    const dropdownH = 300; // max-height uit CSS
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = spaceBelow >= dropdownH || spaceBelow >= spaceAbove
      ? rect.bottom + 3
      : rect.top - Math.min(dropdownH, spaceAbove) - 3;
    fkDropdown.style.top = `${top}px`;
    fkDropdown.style.left = `${rect.left}px`;
    fkDropdown.style.minWidth = `${Math.max(300, rect.width + 28)}px`;
    fkDropdown.hidden = false;
    await populateFkDropdown(fkBtn.dataset.fkTable, fkBtn.dataset.fkColumn);
    return;
  }

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
    clearTimeout(state.sortTimerByTab.get(tab.id));
    state.sortTimerByTab.delete(tab.id);
    if (state.sortByTab.has(tab.id)) {
      const payload = state.tablePayloadByTab.get(tab.id);
      if (payload) renderDataTable(payload);
      await loadSortedActiveTable();
    } else {
      await loadActiveTable();
    }
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
  const row = e.target.closest('tbody tr[data-row-index]');
  if (!row) return;

  const tab = getActiveTab();
  if (tab) {
    const rowIndex = Number(row.dataset.rowIndex);
    const existingSnapshot = state.editSelectionSnapshot;
    const keepSnapshot = existingSnapshot?.tabId === tab.id
      && existingSnapshot.rowIndex === rowIndex
      && Date.now() - existingSnapshot.createdAt < 700;

    if (!keepSnapshot) {
      const selectedRows = state.selectedRowsByTab.get(tab.id);
      state.editSelectionSnapshot = selectedRows?.size > 1 && selectedRows.has(rowIndex)
        ? { tabId: tab.id, rowIndex, rows: [...selectedRows], createdAt: Date.now() }
        : null;
    }
  }

  if (e.shiftKey) e.preventDefault();
});

elements.dataTable.addEventListener('contextmenu', (event) => {
  const row = event.target.closest('tbody tr[data-row-index]');
  if (!row) return;
  openRowContextMenu(event, Number(row.dataset.rowIndex));
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

elements.sshTerminalPane.addEventListener('mousedown', () => {
  const tab = getActiveTab();
  if (tab?.type === 'ssh') {
    state.sshTerminalByTab.get(tab.id)?.focus();
  }
});

elements.dataTable.addEventListener('dblclick', (event) => {
  if (event.target.closest('.cell-expand-button')) return;

  const td = event.target.closest('td');
  const row = td?.closest('tr[data-row-index]');
  if (!td || !row) return;
  if (td.querySelector('input[data-edit-input]')) return;

  const tab = getActiveTab();
  const payload = state.tablePayloadByTab.get(tab?.id);
  if (!tab || !payload || state.mode !== 'data') return;
  if (payload.isSqlResult) return;

  const activeConnection = state.connections.find((c) => c.id === tab.connectionId);
  if (activeConnection?.readOnly) return;

  const rowIndex = Number(row.dataset.rowIndex);
  const colIndex = [...row.children].indexOf(td);
  const column = payload.columns[colIndex];
  if (!column) return;

  const targetRows = getCellEditTargetRows(tab, payload, rowIndex);
  if (targetRows.length > 1) {
    state.selectedRowsByTab.set(tab.id, new Set(targetRows));
    syncSelectedRowClasses(tab);
  }

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
    openDatePicker(td, tab, payload, rowIndex, column.name, inputValue, dateInputType, originalHtml, originalClassName, targetRows);
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
    const changedRows = applyCellEditValue(tab, payload, rowIndex, column.name, val, inputValue, targetRows);

    if (!changedRows) {
      td.className = originalClassName;
      td.innerHTML = originalHtml;
      return;
    }

    renderTableView();
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

elements.refreshButton.addEventListener('click', refreshActiveView);

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
  const terminal = state.sshTerminalByTab.get(tab.id);
  if (terminal) {
    terminal.write(`\r\n${statusText}\r\n`);
  } else {
    state.sshOutputByTab.set(tab.id, `${state.sshOutputByTab.get(tab.id) || ''}\r\n${statusText}\r\n`);
  }
  if (state.activeTabId === tab.id) {
    renderSshView();
  }
});

function openSqlDialog() {
  const tab = getActiveTab();
  const connection = state.connections.find((c) => c.id === tab?.connectionId);
  if (!tab || !connection) return;
  const payload = state.tablePayloadByTab.get(tab.id);
  elements.sqlDialogTitle.textContent = `${connection.name} · ${tab.tableName}`;
  elements.sqlTextarea.value = payload?.query || `SELECT * FROM ${tab.tableName} LIMIT ${elements.limitInput.value || 100}`;
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

function isReadOnlySqlQuery(sql) {
  return /^(select|with|pragma|show|describe|desc|explain)\b/i.test(String(sql || '').trim());
}

function getSqlResultColumns(rows) {
  const names = [];
  const seen = new Set();
  for (const row of rows || []) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(key);
    }
  }
  return names.map((name) => ({ name, type: '', notnull: 0, dflt_value: null, pk: 0 }));
}

function renderSqlResultInActiveTab(tab, connection, sql, rows) {
  state.tableLoadSeqByTab.set(tab.id, (state.tableLoadSeqByTab.get(tab.id) || 0) + 1);
  clearTimeout(state.sortTimerByTab.get(tab.id));
  state.sortTimerByTab.delete(tab.id);
  state.tablePayloadByTab.set(tab.id, {
    columns: getSqlResultColumns(rows),
    rows: rows || [],
    relations: { outgoing: [], incoming: [] },
    label: getConnectionSummary(connection),
    query: sql,
    isSqlResult: true
  });
  state.sortByTab.delete(tab.id);
  state.selectedRowsByTab.delete(tab.id);
  state.anchorRowByTab.delete(tab.id);
  state.relationLookupByTab.delete(tab.id);
  state.pendingRowsByTab.delete(tab.id);
  state.editsByTab.delete(tab.id);
  state.mode = 'data';
  setTableLoading(false);
  closeSqlDialog();
  renderTableView();
}

async function executeSql() {
  const tab = getActiveTab();
  const connection = state.connections.find((c) => c.id === tab?.connectionId);
  if (!tab || !connection) return;
  const sql = elements.sqlTextarea.value.trim();
  if (!sql) return;

  elements.sqlRunButton.disabled = true;
  elements.sqlResult.hidden = true;
  elements.sqlResult.innerHTML = '';

  try {
    const result = await window.sqlBase.runSql({ connection, sql });
    const rows = result.rows || [];
    if (rows.length > 0 || isReadOnlySqlQuery(sql)) {
      renderSqlResultInActiveTab(tab, connection, sql, rows);
      showToast(`${rows.length} rij${rows.length !== 1 ? 'en' : ''} teruggegeven`);
    } else if (result.affectedRows !== null) {
      closeSqlDialog();
      await loadActiveTable();
      showToast(`${result.affectedRows} rij${result.affectedRows !== 1 ? 'en' : ''} beïnvloed`);
    } else {
      closeSqlDialog();
      await loadActiveTable();
      showToast('Query uitgevoerd');
    }
  } catch (error) {
    elements.sqlResult.hidden = true;
    showErrorDialog(error.message);
  } finally {
    elements.sqlRunButton.disabled = false;
  }
}

elements.errorDialogClose.addEventListener('click', closeErrorDialog);
elements.errorDialogBackdrop.addEventListener('click', closeErrorDialog);
elements.errorDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closeErrorDialog(); }
});

elements.sqlButton.addEventListener('click', openSqlDialog);
elements.sqlBackdrop.addEventListener('click', closeSqlDialog);
elements.sqlDialogClose.addEventListener('click', closeSqlDialog);
elements.sqlRunButton.addEventListener('click', executeSql);
elements.sqlTextarea.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); executeSql(); }
  if (e.key === 'Escape') { e.preventDefault(); closeSqlDialog(); }
});
elements.cellViewerBackdrop.addEventListener('click', closeCellViewer);
elements.cellViewerClose.addEventListener('click', closeCellViewer);
elements.cellViewerCopy.addEventListener('click', copyCellViewerValue);
elements.cellViewerDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeCellViewer();
  }
});
elements.releaseDialogBackdrop.addEventListener('click', closeReleaseDialog);
elements.releaseDialogClose.addEventListener('click', closeReleaseDialog);
elements.releaseDialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeReleaseDialog();
  }
});

let lastFocusArea = 'workspace';

document.querySelector('.connections-panel').addEventListener('mousedown', () => {
  lastFocusArea = 'sidebar';
});

document.querySelector('.workspace').addEventListener('mousedown', () => {
  lastFocusArea = 'workspace';
});

function closeSidebarFilter() {
  state.sidebarFilterOpen = false;
  elements.sidebarFilterInput.value = '';
  elements.sidebarFilterClear.hidden = true;
  elements.sidebarFilterWrap.hidden = true;
  renderConnections();
}

elements.sidebarFilterInput.addEventListener('input', () => {
  const hasValue = Boolean(elements.sidebarFilterInput.value);
  elements.sidebarFilterClear.hidden = !hasValue;
  renderConnections();
});

elements.sidebarFilterInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSidebarFilter();
  }
});

elements.sidebarFilterInput.addEventListener('blur', () => {
  if (!elements.sidebarFilterInput.value.trim()) closeSidebarFilter();
});

elements.sidebarFilterClear.addEventListener('mousedown', (e) => {
  e.preventDefault();
});

elements.sidebarFilterClear.addEventListener('click', () => {
  closeSidebarFilter();
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    if (lastFocusArea === 'sidebar' && state.sidebarView === 'tables') {
      e.preventDefault();
      state.sidebarFilterOpen = true;
      elements.sidebarFilterWrap.hidden = false;
      elements.sidebarFilterInput.focus();
      elements.sidebarFilterInput.select();
    } else if (!elements.tableView.hidden && state.mode === 'data') {
      e.preventDefault();
      elements.filterInput.focus();
      elements.filterInput.select();
    }
  }
}, true);

setConnectionFormType('mariadb');
loadConnections().finally(() => {
  initReleaseAnnouncements();
});
