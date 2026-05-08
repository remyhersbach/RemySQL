const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { execFile } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const mariadb = require('mariadb');

let mainWindow;

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
const quoteSqliteIdentifier = (name) => `"${String(name).replaceAll('"', '""')}"`;
const quoteMariaIdentifier = (name) => `\`${String(name).replaceAll('`', '``')}\``;
const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

function getConnectionsPath() {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'connections.json');
}

function readConnections() {
  const filePath = getConnectionsPath();
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeConnections(connections) {
  writeFileSync(getConnectionsPath(), JSON.stringify(connections, null, 2));
}

function runSqlite(databasePath, sql) {
  return new Promise((resolve, reject) => {
    execFile('sqlite3', ['-json', databasePath, sql], { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      try {
        resolve(stdout.trim() ? JSON.parse(stdout) : []);
      } catch (parseError) {
        reject(new Error(`Kon sqlite output niet lezen: ${parseError.message}`));
      }
    });
  });
}

function normalizeDbValue(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('hex');
  }

  return value;
}

function normalizeDbRows(rows) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeDbValue(value)])
  ));
}

async function runMariaDb(connection, sql, values = []) {
  let client;

  try {
    client = await mariadb.createConnection({
      host: connection.host,
      port: Number(connection.port),
      user: connection.user,
      password: connection.password || '',
      database: connection.database,
      connectTimeout: 5000,
      charset: 'utf8mb4',
      dateStrings: true,
      bigIntAsNumber: false,
      decimalAsNumber: false
    });

    const rows = await client.query(sql, values);
    return Array.isArray(rows) ? normalizeDbRows(rows) : [];
  } catch (error) {
    throw new Error(error.sqlMessage || error.message || 'MariaDB query mislukt.');
  } finally {
    if (client) {
      await client.end();
    }
  }
}

async function getSqliteTables(databasePath) {
  return runSqlite(
    databasePath,
    "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;"
  );
}

async function getSqliteColumns(databasePath, tableName) {
  return runSqlite(databasePath, `PRAGMA table_info(${quoteSqliteIdentifier(tableName)});`);
}

async function getSqliteForeignKeys(databasePath, tableName) {
  return runSqlite(databasePath, `PRAGMA foreign_key_list(${quoteSqliteIdentifier(tableName)});`);
}

async function getSqliteIncomingForeignKeys(databasePath, tableName) {
  const tables = await getSqliteTables(databasePath);
  const incoming = [];

  for (const table of tables) {
    const keys = await getSqliteForeignKeys(databasePath, table.name);
    for (const key of keys) {
      if (key.table === tableName) {
        incoming.push({
          fromTable: table.name,
          fromColumn: key.from,
          toTable: key.table,
          toColumn: key.to,
          onUpdate: key.on_update,
          onDelete: key.on_delete
        });
      }
    }
  }

  return incoming;
}

async function getSqliteData(databasePath, tableName, filter, limit) {
  const safeLimit = clamp(limit, 1, 500);
  const columns = await getSqliteColumns(databasePath, tableName);
  const searchableColumns = columns.map((column) => column.name);
  const where = String(filter || '').trim()
    ? ` WHERE ${searchableColumns
        .map((columnName) => `CAST(${quoteSqliteIdentifier(columnName)} AS TEXT) LIKE ${quoteLiteral(`%${filter.trim()}%`)}`)
        .join(' OR ')}`
    : '';

  return runSqlite(databasePath, `SELECT * FROM ${quoteSqliteIdentifier(tableName)}${where} LIMIT ${safeLimit};`);
}

async function getMariaTables(connection) {
  return runMariaDb(
    connection,
    `SELECT TABLE_NAME AS name, LOWER(TABLE_TYPE) AS type
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_TYPE, TABLE_NAME;`
  );
}

async function getMariaColumns(connection, tableName) {
  return runMariaDb(
    connection,
    `SELECT
       ORDINAL_POSITION - 1 AS cid,
       COLUMN_NAME AS name,
       COLUMN_TYPE AS type,
       IF(IS_NULLABLE = 'NO', 1, 0) AS notnull,
       COLUMN_DEFAULT AS dflt_value,
       IF(COLUMN_KEY = 'PRI', 1, 0) AS pk,
       EXTRA AS extra
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION;`,
    [tableName]
  );
}

async function getMariaForeignKeys(connection, tableName) {
  return runMariaDb(
    connection,
    `SELECT
       kcu.COLUMN_NAME AS fromColumn,
       kcu.REFERENCED_TABLE_NAME AS toTable,
       kcu.REFERENCED_COLUMN_NAME AS toColumn,
       rc.UPDATE_RULE AS onUpdate,
       rc.DELETE_RULE AS onDelete
     FROM information_schema.KEY_COLUMN_USAGE kcu
     LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME = ?
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION;`,
    [tableName]
  );
}

async function getMariaIncomingForeignKeys(connection, tableName) {
  return runMariaDb(
    connection,
    `SELECT
       kcu.TABLE_NAME AS fromTable,
       kcu.COLUMN_NAME AS fromColumn,
       kcu.REFERENCED_TABLE_NAME AS toTable,
       kcu.REFERENCED_COLUMN_NAME AS toColumn,
       rc.UPDATE_RULE AS onUpdate,
       rc.DELETE_RULE AS onDelete
     FROM information_schema.KEY_COLUMN_USAGE kcu
     LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = DATABASE()
       AND kcu.REFERENCED_TABLE_SCHEMA = DATABASE()
       AND kcu.REFERENCED_TABLE_NAME = ?
     ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION;`,
    [tableName]
  );
}

async function getMariaData(connection, tableName, filter, limit) {
  const safeLimit = clamp(limit, 1, 500);
  const columns = await getMariaColumns(connection, tableName);
  const searchableColumns = columns.map((column) => column.name);
  const where = String(filter || '').trim()
    ? ` WHERE ${searchableColumns
        .map((columnName) => `CAST(${quoteMariaIdentifier(columnName)} AS CHAR) LIKE ?`)
        .join(' OR ')}`
    : '';
  const values = String(filter || '').trim() ? searchableColumns.map(() => `%${filter.trim()}%`) : [];

  return runMariaDb(connection, `SELECT * FROM ${quoteMariaIdentifier(tableName)}${where} LIMIT ${safeLimit};`, values);
}

function getConnectionLabel(connection) {
  if (connection.type === 'mariadb') {
    return `${connection.user}@${connection.host}:${connection.port}/${connection.database}`;
  }

  return connection.path;
}

async function getTables(connection) {
  return connection.type === 'mariadb' ? getMariaTables(connection) : getSqliteTables(connection.path);
}

async function getColumns(connection, tableName) {
  return connection.type === 'mariadb' ? getMariaColumns(connection, tableName) : getSqliteColumns(connection.path, tableName);
}

async function getData(connection, tableName, filter, limit) {
  return connection.type === 'mariadb'
    ? getMariaData(connection, tableName, filter, limit)
    : getSqliteData(connection.path, tableName, filter, limit);
}

async function getOutgoingForeignKeys(connection, tableName) {
  if (connection.type === 'mariadb') {
    const keys = await getMariaForeignKeys(connection, tableName);
    return keys.map((key) => ({
      fromTable: tableName,
      fromColumn: key.fromColumn,
      toTable: key.toTable,
      toColumn: key.toColumn,
      onUpdate: key.onUpdate,
      onDelete: key.onDelete
    }));
  }

  const keys = await getSqliteForeignKeys(connection.path, tableName);
  return keys.map((key) => ({
    fromTable: tableName,
    fromColumn: key.from,
    toTable: key.table,
    toColumn: key.to,
    onUpdate: key.on_update,
    onDelete: key.on_delete
  }));
}

async function getIncomingForeignKeys(connection, tableName) {
  return connection.type === 'mariadb'
    ? getMariaIncomingForeignKeys(connection, tableName)
    : getSqliteIncomingForeignKeys(connection.path, tableName);
}

function normalizeConnection(connection) {
  const type = connection.type === 'sqlite' ? 'sqlite' : 'mariadb';

  if (type === 'sqlite') {
    const normalized = {
      id: connection.id || randomUUID(),
      type,
      name: String(connection.name || path.basename(connection.path || 'SQLite database')),
      path: String(connection.path || ''),
      createdAt: connection.createdAt || new Date().toISOString()
    };

    if (!normalized.path || !existsSync(normalized.path)) {
      throw new Error('Databasebestand bestaat niet.');
    }

    return normalized;
  }

  const normalized = {
    id: connection.id || randomUUID(),
    type,
    name: String(connection.name || connection.database || 'MariaDB database'),
    host: String(connection.host || '127.0.0.1'),
    port: clamp(connection.port || 3306, 1, 65535),
    user: String(connection.user || ''),
    password: String(connection.password || ''),
    database: String(connection.database || ''),
    createdAt: connection.createdAt || new Date().toISOString()
  };

  if (!normalized.user || !normalized.database) {
    throw new Error('MariaDB user en database zijn verplicht.');
  }

  return normalized;
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    title: 'SQL Base Manager',
    backgroundColor: '#f4f6f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

async function openConnectionDialog() {
  if (!mainWindow) {
    return;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Nieuwe SQLite connectie',
    buttonLabel: 'Gebruik database',
    properties: ['openFile'],
    filters: [
      { name: 'SQLite databases', extensions: ['sqlite', 'sqlite3', 'db'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return;
  }

  const databasePath = result.filePaths[0];
  mainWindow.webContents.send('connection:file-selected', {
    name: path.basename(databasePath),
    path: databasePath
  });
}

function createMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'Connecties',
      submenu: [
        {
          label: 'Nieuwe MariaDB connectie...',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('connection:new-mariadb')
        },
        {
          label: 'Nieuwe SQLite connectie...',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: openConnectionDialog
        },
        { type: 'separator' },
        {
          label: 'Herlaad venster',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload()
        }
      ]
    },
    {
      label: 'Beeld',
      submenu: [
        { role: 'toggleDevTools' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('connections:list', () => readConnections());

ipcMain.handle('connections:add', async (_event, connection) => {
  const normalized = normalizeConnection(connection);
  const tables = await getTables(normalized);
  const connections = readConnections();
  const nextConnections = [
    normalized,
    ...connections.filter((item) => item.id !== normalized.id && !sameConnection(item, normalized))
  ];
  writeConnections(nextConnections);

  return { connection: normalized, tables };
});

ipcMain.handle('connections:remove', (_event, connectionId) => {
  const nextConnections = readConnections().filter((connection) => connection.id !== connectionId);
  writeConnections(nextConnections);
  return nextConnections;
});

ipcMain.handle('database:schema', async (_event, connection) => {
  const tables = await getTables(connection);
  return { tables };
});

ipcMain.handle('database:table', async (_event, { connection, tableName, filter, limit }) => {
  const [columns, rows, outgoingKeys, incomingKeys] = await Promise.all([
    getColumns(connection, tableName),
    getData(connection, tableName, filter, limit),
    getOutgoingForeignKeys(connection, tableName),
    getIncomingForeignKeys(connection, tableName)
  ]);

  return {
    columns,
    rows,
    relations: {
      outgoing: outgoingKeys,
      incoming: incomingKeys
    },
    label: getConnectionLabel(connection)
  };
});

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
