const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sqlBase', {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  listConnections: () => ipcRenderer.invoke('connections:list'),
  addConnection: (connection) => ipcRenderer.invoke('connections:add', connection),
  removeConnection: (connectionId) => ipcRenderer.invoke('connections:remove', connectionId),
  duplicateConnection: (connectionId) => ipcRenderer.invoke('connections:duplicate', connectionId),
  updateConnectionBackground: (payload) => ipcRenderer.invoke('connections:update-background', payload),
  groupConnections: (payload) => ipcRenderer.invoke('connections:group', payload),
  moveConnection: (payload) => ipcRenderer.invoke('connections:move', payload),
  updateConnectionGroupName: (payload) => ipcRenderer.invoke('connections:update-group-name', payload),
  startSsh: (connection) => ipcRenderer.invoke('ssh:start', connection),
  openSshInTerminal: (connection) => ipcRenderer.invoke('ssh:open-terminal', connection),
  writeSsh: (payload) => ipcRenderer.invoke('ssh:write', payload),
  resizeSsh: (payload) => ipcRenderer.invoke('ssh:resize', payload),
  stopSsh: (sessionId) => ipcRenderer.invoke('ssh:stop', sessionId),
  loadSchema: (connection) => ipcRenderer.invoke('database:schema', connection),
  loadTable: (payload) => ipcRenderer.invoke('database:table', payload),
  loadRelationRows: (payload) => ipcRenderer.invoke('database:relation-rows', payload),
  insertRows: (payload) => ipcRenderer.invoke('database:insert-rows', payload),
  updateRows: (payload) => ipcRenderer.invoke('database:update-rows', payload),
  deleteRows: (payload) => ipcRenderer.invoke('database:delete-rows', payload),
  runSql: (payload) => ipcRenderer.invoke('database:run-sql', payload),
  backupTable: (payload) => ipcRenderer.invoke('database:backup-table', payload),
  onNewMariaDbConnection: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('connection:new-mariadb', listener);
    return () => ipcRenderer.removeListener('connection:new-mariadb', listener);
  },
  onNewSshConnection: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('connection:new-ssh', listener);
    return () => ipcRenderer.removeListener('connection:new-ssh', listener);
  },
  onConnectionFileSelected: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('connection:file-selected', listener);
    return () => ipcRenderer.removeListener('connection:file-selected', listener);
  },
  onSshData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ssh:data', listener);
    return () => ipcRenderer.removeListener('ssh:data', listener);
  },
  onSshExit: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ssh:exit', listener);
    return () => ipcRenderer.removeListener('ssh:exit', listener);
  }
});
