const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sqlBase', {
  listConnections: () => ipcRenderer.invoke('connections:list'),
  addConnection: (connection) => ipcRenderer.invoke('connections:add', connection),
  removeConnection: (connectionId) => ipcRenderer.invoke('connections:remove', connectionId),
  loadSchema: (connection) => ipcRenderer.invoke('database:schema', connection),
  loadTable: (payload) => ipcRenderer.invoke('database:table', payload),
  loadRelationRows: (payload) => ipcRenderer.invoke('database:relation-rows', payload),
  insertRows: (payload) => ipcRenderer.invoke('database:insert-rows', payload),
  updateRows: (payload) => ipcRenderer.invoke('database:update-rows', payload),
  onNewMariaDbConnection: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('connection:new-mariadb', listener);
    return () => ipcRenderer.removeListener('connection:new-mariadb', listener);
  },
  onConnectionFileSelected: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('connection:file-selected', listener);
    return () => ipcRenderer.removeListener('connection:file-selected', listener);
  }
});
