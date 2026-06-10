const { app, BrowserWindow, Menu, dialog, ipcMain, nativeImage, safeStorage, shell } = require('electron');
const { execFile, spawn } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, unlinkSync, readdirSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { createCipheriv, createDecipheriv, randomBytes, randomUUID } = require('node:crypto');
app.name = 'RemySQL';

let mariadb;
let pty;

let mainWindow;
const sshSessions = new Map();

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

function ensurePtySpawnHelperExecutable() {
  if (process.platform !== 'darwin') {
    return;
  }

  try {
    const prebuildsPath = path.join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds');
    if (!existsSync(prebuildsPath)) {
      return;
    }

    for (const dir of readdirSync(prebuildsPath)) {
      if (!dir.startsWith('darwin-')) continue;
      const helperPath = path.join(prebuildsPath, dir, 'spawn-helper');
      if (existsSync(helperPath)) {
        chmodSync(helperPath, 0o755);
      }
    }
  } catch (error) {
    console.warn('node-pty spawn-helper kon niet uitvoerbaar worden gemaakt:', error.message);
  }
}

function getPty() {
  if (!pty) {
    ensurePtySpawnHelperExecutable();
    pty = require('node-pty');
  }
  return pty;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
const quoteSqliteIdentifier = (name) => `"${String(name).replaceAll('"', '""')}"`;
const quoteMariaIdentifier = (name) => `\`${String(name).replaceAll('`', '``')}\``;
const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ''));
const connectionColors = new Set(['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#64748b']);
const isConnectionColor = (value) => connectionColors.has(String(value || '').toLowerCase());
const encryptedConnectionsVersion = 2;
let connectionsCache = null;
let connectionsCryptoKey = null;
let encryptedConnectionsKey = null;
const packageJson = require('../package.json');
const githubRepo = getGitHubRepoFromPackage(packageJson);

function getGitHubRepoFromPackage(pkg) {
  const rawUrl = String(pkg?.repository?.url || pkg?.homepage || '').trim();
  const match = rawUrl.match(/github\.com[:/](.+?)(?:\.git)?(?:[#?].*)?$/i);
  return match ? match[1].replace(/^\/+|\/+$/g, '') : null;
}

function getChangelogPath() {
  return path.join(__dirname, '..', 'CHANGELOG.md');
}

function readChangelog() {
  try {
    return readFileSync(getChangelogPath(), 'utf8');
  } catch {
    return '';
  }
}

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function compareVersions(left, right) {
  const a = normalizeVersion(left).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const b = normalizeVersion(right).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return 1;
    if ((a[i] || 0) < (b[i] || 0)) return -1;
  }
  return 0;
}

function getPreferredReleaseAsset(assets = []) {
  const platformExt = process.platform === 'darwin'
    ? ['.dmg', '.zip']
    : process.platform === 'win32'
      ? ['.exe', '.msi']
      : ['.appimage', '.deb', '.rpm', '.tar.gz'];
  return assets.find((asset) => {
    const name = String(asset?.name || '').toLowerCase();
    return platformExt.some((ext) => name.endsWith(ext));
  }) || assets[0] || null;
}

async function checkForUpdates() {
  if (!githubRepo) {
    return { configured: false, updateAvailable: false, currentVersion: app.getVersion() };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `${app.name}/${app.getVersion()}`
      },
      signal: controller.signal
    });

    if (response.status === 404) {
      return { configured: true, updateAvailable: false, currentVersion: app.getVersion(), error: 'Geen GitHub release gevonden.' };
    }
    if (!response.ok) {
      throw new Error(`GitHub gaf status ${response.status}.`);
    }

    const release = await response.json();
    const latestVersion = normalizeVersion(release.tag_name || release.name);
    const currentVersion = app.getVersion();
    const asset = getPreferredReleaseAsset(release.assets || []);
    const updateAvailable = latestVersion && compareVersions(latestVersion, currentVersion) > 0;

    return {
      configured: true,
      updateAvailable,
      currentVersion,
      latestVersion,
      releaseName: release.name || release.tag_name || latestVersion,
      releaseNotes: release.body || '',
      releaseUrl: release.html_url || `https://github.com/${githubRepo}/releases/latest`,
      downloadUrl: asset?.browser_download_url || release.html_url || `https://github.com/${githubRepo}/releases/latest`,
      assetName: asset?.name || ''
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getConnectionsPath() {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'connections.json');
}

function assertCanEncryptConnections() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Connecties kunnen niet veilig worden opgeslagen: OS-versleuteling is niet beschikbaar.');
  }
}

function decryptConnectionsKey(encryptedKey) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Connecties kunnen niet worden gelezen: OS-versleuteling is niet beschikbaar.');
  }

  const keyText = safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
  const key = Buffer.from(keyText, 'base64');
  if (key.length !== 32) {
    throw new Error('Opgeslagen connectiesleutel heeft een ongeldig formaat.');
  }
  return key;
}

function ensureConnectionsCryptoKey(payload = null) {
  if (connectionsCryptoKey) {
    return connectionsCryptoKey;
  }

  if (payload?.version === 2 && payload?.key) {
    encryptedConnectionsKey = payload.key;
    connectionsCryptoKey = decryptConnectionsKey(payload.key);
    return connectionsCryptoKey;
  }

  assertCanEncryptConnections();
  connectionsCryptoKey = randomBytes(32);
  encryptedConnectionsKey = safeStorage.encryptString(connectionsCryptoKey.toString('base64')).toString('base64');
  return connectionsCryptoKey;
}

function encryptConnections(connections) {
  const key = ensureConnectionsCryptoKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(connections), 'utf8'),
    cipher.final()
  ]);

  return {
    version: encryptedConnectionsVersion,
    encrypted: true,
    algorithm: 'aes-256-gcm',
    key: encryptedConnectionsKey,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64')
  };
}

function decryptConnections(payload) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Connecties kunnen niet worden gelezen: OS-versleuteling is niet beschikbaar.');
  }

  if (payload?.version === 2 && payload?.key && payload?.iv && payload?.tag && payload?.data) {
    const key = ensureConnectionsCryptoKey(payload);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final()
    ]).toString('utf8');
    const connections = JSON.parse(decrypted);
    return Array.isArray(connections) ? connections : [];
  }

  const decrypted = safeStorage.decryptString(Buffer.from(payload.data, 'base64'));
  const connections = JSON.parse(decrypted);
  return Array.isArray(connections) ? connections : [];
}

function cloneConnections(connections) {
  return connections.map((connection) => ({
    ...connection,
    ...(connection.sshTunnel ? { sshTunnel: { ...connection.sshTunnel } } : {})
  }));
}

function readConnections() {
  if (connectionsCache) {
    return cloneConnections(connectionsCache);
  }

  const filePath = getConnectionsPath();
  if (!existsSync(filePath)) {
    connectionsCache = [];
    return [];
  }

  try {
    const payload = JSON.parse(readFileSync(filePath, 'utf8'));
    const connections = payload?.encrypted && payload?.data ? decryptConnections(payload) : [];
    connectionsCache = normalizeConnectionPositions(connections);
    return cloneConnections(connectionsCache);
  } catch (error) {
    throw new Error(`Connecties konden niet worden gelezen: ${error.message}`);
  }
}

function writeConnections(connections) {
  const normalized = normalizeConnectionPositions(connections);
  writeFileSync(getConnectionsPath(), JSON.stringify(encryptConnections(normalized), null, 2));
  connectionsCache = normalized;
}

function getNextGroupName(connections) {
  const highest = connections.reduce((max, connection) => {
    const match = String(connection.groupName || '').match(/^Groep\s+(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `Groep ${highest + 1}`;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getConnectionEntries(connections) {
  const groups = new Map();
  const entries = [];

  connections.forEach((connection, index) => {
    if (!connection.groupId) {
      entries.push({
        type: 'connection',
        position: finiteNumber(connection.position, index),
        originalIndex: index,
        connection
      });
      return;
    }

    let group = groups.get(connection.groupId);
    if (!group) {
      group = {
        type: 'group',
        id: connection.groupId,
        name: connection.groupName || 'Groep',
        position: finiteNumber(connection.groupPosition, finiteNumber(connection.position, index)),
        originalIndex: index,
        connections: []
      };
      groups.set(connection.groupId, group);
      entries.push(group);
    }

    group.connections.push({
      connection,
      position: finiteNumber(connection.position, group.connections.length),
      originalIndex: index
    });

    if (connection.groupName) {
      group.name = connection.groupName;
    }
  });

  return entries
    .sort((left, right) => left.position - right.position || left.originalIndex - right.originalIndex)
    .map((entry) => {
      if (entry.type !== 'group') return entry;

      return {
        ...entry,
        connections: entry.connections.sort((left, right) => (
          left.position - right.position || left.originalIndex - right.originalIndex
        ))
      };
    });
}

function normalizeConnectionPositions(connections) {
  const entries = getConnectionEntries(connections);
  const nextConnections = [];

  entries.forEach((entry, entryIndex) => {
    if (entry.type === 'connection') {
      const { groupId, groupName, groupPosition, ...connection } = entry.connection;
      nextConnections.push({ ...connection, position: entryIndex });
      return;
    }

    if (entry.connections.length < 2) {
      entry.connections.forEach(({ connection }) => {
        const { groupId, groupName, groupPosition, ...ungroupedConnection } = connection;
        nextConnections.push({ ...ungroupedConnection, position: entryIndex });
      });
      return;
    }

    entry.connections.forEach(({ connection }, connectionIndex) => {
      nextConnections.push({
        ...connection,
        groupId: entry.id,
        groupName: entry.name,
        groupPosition: entryIndex,
        position: connectionIndex
      });
    });
  });

  return nextConnections;
}

function getConnectionEntryPosition(connections, connectionId) {
  const entry = getConnectionEntries(connections).find((item) => (
    item.type === 'connection'
      ? item.connection.id === connectionId
      : item.connections.some(({ connection }) => connection.id === connectionId)
  ));

  return entry ? finiteNumber(entry.position, 0) : 0;
}

function getConnectionGroupName(connection) {
  return connection?.groupName || 'Groep';
}

function stripGroupFields(connection) {
  const { groupId, groupName, groupPosition, ...ungroupedConnection } = connection;
  return ungroupedConnection;
}

function groupConnectionList(connections, sourceConnectionId, targetConnectionId) {
  if (!sourceConnectionId || !targetConnectionId || sourceConnectionId === targetConnectionId) {
    return { connections: normalizeConnectionPositions(connections), groupId: null };
  }

  const source = connections.find((connection) => connection.id === sourceConnectionId);
  const target = connections.find((connection) => connection.id === targetConnectionId);

  if (!source || !target) {
    return { connections: normalizeConnectionPositions(connections), groupId: null };
  }

  const groupId = target.groupId || source.groupId || randomUUID();
  const groupName = target.groupName || source.groupName || getNextGroupName(connections);
  const groupsToMerge = new Set([source.groupId, target.groupId].filter(Boolean));
  const groupPosition = getConnectionEntryPosition(connections, target.id);

  const nextConnections = normalizeConnectionPositions(connections.map((connection) => {
    const joinsGroup = connection.id === source.id
      || connection.id === target.id
      || groupsToMerge.has(connection.groupId);

    return joinsGroup
      ? { ...connection, groupId, groupName, groupPosition }
      : connection;
  }));

  return { connections: nextConnections, groupId };
}

function resolveHomePath(filePath) {
  return String(filePath || '').startsWith('~/')
    ? path.join(app.getPath('home'), String(filePath).slice(2))
    : String(filePath || '');
}

const executableSearchPaths = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin'
];

function getSpawnEnv(extra = {}) {
  const existingPath = String(process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
  const pathValue = [...new Set([...existingPath, ...executableSearchPaths])].join(path.delimiter);
  return { ...process.env, PATH: pathValue, ...extra };
}

function resolveExecutable(command) {
  if (!command || path.isAbsolute(command)) {
    return command;
  }

  const searchPaths = String(getSpawnEnv().PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
  const match = searchPaths
    .map((dir) => path.join(dir, command))
    .find((candidate) => existsSync(candidate));

  return match || command;
}

function buildSshCommand(connection, sessionId) {
  const authMode = connection.keyPath
    ? 'key'
    : connection.password
      ? 'password'
      : 'ssh-agent/default key';
  const command = resolveExecutable('ssh');
  const args = [
    '-tt',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-p', String(connection.port || 22)
  ];

  if (connection.keyPath) {
    args.push('-i', resolveHomePath(connection.keyPath));
  }

  args.push(`${connection.user}@${connection.host}`);

  if (connection.password && !connection.keyPath) {
    const askpassPath = path.join(app.getPath('userData'), `ssh-askpass-${sessionId}.sh`);
    writeFileSync(askpassPath, '#!/bin/sh\nprintf "%s\\n" "$REMYSQL_SSH_PASSWORD"\n');
    chmodSync(askpassPath, 0o700);

    return {
      command,
      args,
      authMode,
      env: {
        SSH_ASKPASS: askpassPath,
        SSH_ASKPASS_REQUIRE: 'force',
        DISPLAY: process.env.DISPLAY || ':0',
        REMYSQL_SSH_PASSWORD: connection.password
      },
      cleanup: () => {
        try { unlinkSync(askpassPath); } catch {}
      }
    };
  }

  return { command, args, authMode };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function buildSshTerminalCommand(connection) {
  const args = [
    '-tt',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-p', String(connection.port || 22)
  ];

  if (connection.keyPath) {
    args.push('-i', resolveHomePath(connection.keyPath));
  }

  args.push(`${connection.user}@${connection.host}`);
  return [resolveExecutable('ssh'), ...args].map(shellQuote).join(' ');
}

function getSshFailureHint(output, code, command, authMode) {
  const text = String(output || '').toLowerCase();

  if (/permission denied/.test(text)) {
    return 'Authenticatie geweigerd. Controleer username, wachtwoord, SSH key en of de key toegang heeft op deze server.';
  }

  if (/connection refused/.test(text)) {
    return 'Connectie geweigerd. Controleer of SSH draait op deze host en poort.';
  }

  if (/connection timed out|operation timed out|no route to host|network is unreachable/.test(text)) {
    return 'Server is niet bereikbaar. Controleer host, poort, VPN/firewall en netwerkverbinding.';
  }

  if (/could not resolve hostname|name or service not known|nodename nor servname/.test(text)) {
    return 'Hostnaam kon niet worden gevonden. Controleer de hostnaam of DNS.';
  }

  if (/identity file .* not accessible|no such file or directory/.test(text)) {
    return 'SSH key-bestand kon niet worden gevonden. Controleer het key pad.';
  }

  if (/bad permissions|unprotected private key file/.test(text)) {
    return 'SSH key heeft onveilige bestandsrechten. Zet meestal chmod 600 op de private key.';
  }

  if (/host key verification failed/.test(text)) {
    return 'Host key verificatie faalde. Controleer of de server bekend/vertrouwd is en ruim eventueel de oude known_hosts entry op.';
  }

  if (/too many authentication failures/.test(text)) {
    return 'Te veel SSH keys geprobeerd. Gebruik een specifieke key of beperk je SSH agent.';
  }

  if (/no supported authentication methods available/.test(text)) {
    return 'Geen bruikbare authenticatiemethode beschikbaar. Configureer een SSH key of schakel password-auth in op de server.';
  }

  if (code === 1 && !text.trim()) {
    return `SSH stopte zonder fouttekst. Controleer host/poort/user en probeer dezelfde verbinding in Terminal. Authenticatie in de app gebruikt nu: ${authMode}.`;
  }

  if (code === 1) {
    return `Algemene SSH-fout. Controleer host, poort, user en authenticatie. Authenticatie in de app gebruikt nu: ${authMode}.`;
  }

  if (code === 255) {
    return 'SSH kon geen sessie opzetten. Bekijk de regels hierboven voor de exacte netwerk- of authenticatiefout.';
  }

  return code ? `SSH stopte met code ${code}. Bekijk de regels hierboven voor de exacte fout.` : '';
}

function getFreeLocalPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function waitForLocalPort(port, child, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const onExit = (code) => {
      fail(new Error(`SSH-tunnel stopte voordat de database bereikbaar was${code ? ` (code ${code})` : ''}.`));
    };
    const onError = (error) => {
      fail(error);
    };

    child.once('close', onExit);
    child.once('error', onError);

    const attempt = () => {
      if (settled) return;
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        settled = true;
        child.off('close', onExit);
        child.off('error', onError);
        socket.end();
        resolve();
      });
      socket.once('error', (error) => {
        lastError = error;
        socket.destroy();
        if (Date.now() >= deadline) {
          fail(lastError || new Error('SSH-tunnel kwam niet op tijd online.'));
          return;
        }
        setTimeout(attempt, 100);
      });
    };

    attempt();
  });
}

async function startDatabaseSshTunnel(connection) {
  const tunnel = connection.sshTunnel;
  if (!tunnel) {
    return null;
  }

  const sessionId = randomUUID();
  const localPort = await getFreeLocalPort();
  const authMode = tunnel.keyPath
    ? 'key'
    : tunnel.password
      ? 'password'
      : 'ssh-agent/default key';
  const args = [
    '-N',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-L', `127.0.0.1:${localPort}:${connection.host}:${connection.port}`,
    '-p', String(tunnel.port || 22)
  ];

  if (tunnel.keyPath) {
    args.push('-i', resolveHomePath(tunnel.keyPath));
  }

  args.push(`${tunnel.user}@${tunnel.host}`);

  let cleanup = null;
  const env = {};
  if (tunnel.password && !tunnel.keyPath) {
    const askpassPath = path.join(app.getPath('userData'), `ssh-tunnel-askpass-${sessionId}.sh`);
    writeFileSync(askpassPath, '#!/bin/sh\nprintf "%s\\n" "$REMYSQL_SSH_PASSWORD"\n');
    chmodSync(askpassPath, 0o700);
    env.SSH_ASKPASS = askpassPath;
    env.SSH_ASKPASS_REQUIRE = 'force';
    env.DISPLAY = process.env.DISPLAY || ':0';
    env.REMYSQL_SSH_PASSWORD = tunnel.password;
    cleanup = () => {
      try { unlinkSync(askpassPath); } catch {}
    };
  }

  const command = resolveExecutable('ssh');
  const child = spawn(command, args, {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: getSpawnEnv(env),
    detached: false
  });

  let diagnosticOutput = `auth=${authMode}; command=${command}; ssh=${tunnel.user}@${tunnel.host}:${tunnel.port}; target=${connection.host}:${connection.port}`;
  child.stderr.on('data', (data) => {
    diagnosticOutput = `${diagnosticOutput}${data.toString()}`.slice(-6000);
  });

  const closeTunnel = () => {
    if (!child.killed) {
      child.kill();
    }
    cleanup?.();
  };

  try {
    await waitForLocalPort(localPort, child);
    return { host: '127.0.0.1', port: localPort, close: closeTunnel };
  } catch (error) {
    closeTunnel();
    const hint = getSshFailureHint(diagnosticOutput, 1, 'ssh', authMode);
    throw new Error(`SSH-tunnel kon niet worden opgezet. ${hint || error.message}`);
  }
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

async function openMariaDbClient(connection) {
  if (!mariadb) mariadb = await import('mariadb');
  const tunnel = await startDatabaseSshTunnel(connection);
  let client;

  const cleanup = async () => {
    if (client) {
      await client.end();
    }
    tunnel?.close();
  };

  try {
    client = await mariadb.createConnection({
      host: tunnel?.host || connection.host,
      port: Number(tunnel?.port || connection.port),
      user: connection.user,
      password: connection.password || '',
      database: connection.database,
      connectTimeout: 5000,
      charset: 'utf8mb4',
      dateStrings: true,
      bigIntAsNumber: false,
      decimalAsNumber: false
    });

    return { client, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function runMariaDb(connection, sql, values = []) {
  let handle;

  try {
    handle = await openMariaDbClient(connection);
    const rows = await handle.client.query(sql, values);
    return Array.isArray(rows) ? normalizeDbRows(rows) : [];
  } catch (error) {
    throw new Error(error.sqlMessage || error.message || 'MariaDB query mislukt.');
  } finally {
    if (handle) {
      await handle.cleanup();
    }
  }
}

function runSqliteText(databasePath, args) {
  return new Promise((resolve, reject) => {
    execFile('sqlite3', [databasePath, ...args], { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

function getTimestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
}

function getSafeFilename(value) {
  return String(value || 'database')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'database';
}

function quoteSqliteDotArgument(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function quoteDumpString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return `'${String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "''")
    .replaceAll('\0', '\\0')}'`;
}

function getMariaDumpValue(value) {
  return quoteDumpString(value);
}

async function getSqliteTableDump(connection, tableName) {
  return runSqliteText(resolveHomePath(connection.path), [`.dump ${quoteSqliteDotArgument(tableName)}`]);
}

async function getMariaCreateStatement(connection, table) {
  const rows = await runMariaDb(connection, `SHOW CREATE ${table.type === 'view' ? 'VIEW' : 'TABLE'} ${quoteMariaIdentifier(table.name)};`);
  const row = rows[0] || {};
  return row['Create Table'] || row['Create View'] || row[`Create ${table.type === 'view' ? 'View' : 'Table'}`] || '';
}

async function getMariaTableDump(connection, tableName) {
  const tables = await getMariaTables(connection);
  const table = tables.find((item) => item.name === tableName);
  if (!table) {
    throw new Error('Tabel niet gevonden.');
  }

  const lines = [
    `-- RemySQL tabelbackup voor ${connection.database}.${tableName}`,
    `-- Gemaakt op ${new Date().toISOString()}`,
    'SET FOREIGN_KEY_CHECKS=0;',
    ''
  ];

  const createStatement = await getMariaCreateStatement(connection, table);
  if (table.type === 'view') {
    lines.push(`DROP VIEW IF EXISTS ${quoteMariaIdentifier(table.name)};`);
    if (createStatement) {
      lines.push(`${createStatement};`);
    }
  } else {
    lines.push(`DROP TABLE IF EXISTS ${quoteMariaIdentifier(table.name)};`);
    if (createStatement) {
      lines.push(`${createStatement};`);
    }

    const rows = await runMariaDb(connection, `SELECT * FROM ${quoteMariaIdentifier(table.name)};`);
    if (rows.length) {
      const columns = Object.keys(rows[0]);
      const columnSql = columns.map(quoteMariaIdentifier).join(', ');
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const valuesSql = rows.slice(i, i + batchSize)
          .map((row) => `(${columns.map((column) => getMariaDumpValue(row[column])).join(', ')})`)
          .join(',\n');
        lines.push(`INSERT INTO ${quoteMariaIdentifier(table.name)} (${columnSql}) VALUES\n${valuesSql};`);
      }
    }
  }

  lines.push('');
  lines.push('SET FOREIGN_KEY_CHECKS=1;');
  return `${lines.join('\n')}\n`;
}

async function getTableDump(connection, tableName) {
  return connection.type === 'mariadb'
    ? getMariaTableDump(connection, tableName)
    : getSqliteTableDump(connection, tableName);
}

async function saveTableDump(connection, tableName) {
  const databaseName = connection.type === 'mariadb' ? connection.database : connection.name;
  const safeName = getSafeFilename(`${databaseName}-${tableName}`);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Tabelbackup maken',
    defaultPath: `${safeName}-table-backup-${getTimestampSlug()}.sql`,
    filters: [
      { name: 'SQL tabelbackup', extensions: ['sql'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const sql = await getTableDump(connection, tableName);
  writeFileSync(result.filePath, sql, 'utf8');
  return { canceled: false, filePath: result.filePath };
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

function normalizeSort(sort, columns) {
  const direction = String(sort?.direction || '').toLowerCase();
  if (!['asc', 'desc'].includes(direction)) {
    return null;
  }

  const column = columns.find((item) => item.name === sort?.column);
  if (!column) {
    return null;
  }

  return { column: column.name, direction };
}

function interpolateSql(sql, values) {
  let index = 0;
  return sql.replace(/\?/g, () => (
    index < values.length ? quoteLiteral(values[index++]) : '?'
  ));
}

function getColumnFilterList(columnFilter) {
  if (!columnFilter) return [];
  return Array.isArray(columnFilter) ? columnFilter : [columnFilter];
}

function appendSqliteColumnFilterClauses(clauses, columns, columnFilter) {
  const validColumns = new Set((columns || []).map((column) => column.name));
  getColumnFilterList(columnFilter).forEach((item) => {
    if (!item?.column || !validColumns.has(item.column) || !String(item.value ?? '').trim()) return;
    const col = quoteSqliteIdentifier(item.column);
    const val = String(item.value).trim();
    if (item.operator === 'BETWEEN' && String(item.valueTo ?? '').trim()) {
      clauses.push(`${col} BETWEEN ${quoteLiteral(val)} AND ${quoteLiteral(String(item.valueTo).trim())}`);
    } else if (item.operator === '!=') {
      clauses.push(`${col} != ${quoteLiteral(val)}`);
    } else if (item.operator === '>') {
      clauses.push(`${col} > ${quoteLiteral(val)}`);
    } else if (item.operator === '<') {
      clauses.push(`${col} < ${quoteLiteral(val)}`);
    } else if (item.operator === 'LIKE') {
      clauses.push(`CAST(${col} AS TEXT) LIKE ${quoteLiteral(`%${val}%`)}`);
    } else {
      clauses.push(`${col} = ${quoteLiteral(val)}`);
    }
  });
}

async function getSqliteData(databasePath, tableName, filter, limit, columnFilter, sort) {
  const safeLimit = clamp(limit, 1, 5000);
  const columns = await getSqliteColumns(databasePath, tableName);
  const searchableColumns = columns.map((column) => column.name);
  const clauses = [];

  if (String(filter || '').trim()) {
    clauses.push(`(${searchableColumns
      .map((col) => `CAST(${quoteSqliteIdentifier(col)} AS TEXT) LIKE ${quoteLiteral(`%${filter.trim()}%`)}`)
      .join(' OR ')})`);
  }

  appendSqliteColumnFilterClauses(clauses, columns, columnFilter);

  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const normalizedSort = normalizeSort(sort, columns);
  const order = normalizedSort
    ? ` ORDER BY ${quoteSqliteIdentifier(normalizedSort.column)} ${normalizedSort.direction.toUpperCase()}`
    : '';
  const query = `SELECT * FROM ${quoteSqliteIdentifier(tableName)}${where}${order} LIMIT ${safeLimit};`;
  const rows = await runSqlite(databasePath, query);
  return { rows, query };
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

function appendMariaColumnFilterClauses(clauses, values, columns, columnFilter) {
  const validColumns = new Set((columns || []).map((column) => column.name));
  getColumnFilterList(columnFilter).forEach((item) => {
    if (!item?.column || !validColumns.has(item.column) || !String(item.value ?? '').trim()) return;
    const col = quoteMariaIdentifier(item.column);
    const val = String(item.value).trim();
    if (item.operator === 'BETWEEN' && String(item.valueTo ?? '').trim()) {
      clauses.push(`${col} BETWEEN ? AND ?`);
      values.push(val, String(item.valueTo).trim());
    } else if (item.operator === '!=') {
      clauses.push(`${col} != ?`); values.push(val);
    } else if (item.operator === '>') {
      clauses.push(`${col} > ?`); values.push(val);
    } else if (item.operator === '<') {
      clauses.push(`${col} < ?`); values.push(val);
    } else if (item.operator === 'LIKE') {
      clauses.push(`CAST(${col} AS CHAR) LIKE ?`); values.push(`%${val}%`);
    } else {
      clauses.push(`${col} = ?`); values.push(val);
    }
  });
}

async function getMariaData(connection, tableName, filter, limit, columnFilter, sort) {
  const safeLimit = clamp(limit, 1, 5000);
  const columns = await getMariaColumns(connection, tableName);
  const searchableColumns = columns.map((column) => column.name);
  const clauses = [];
  const values = [];

  if (String(filter || '').trim()) {
    clauses.push(`(${searchableColumns
      .map((col) => `CAST(${quoteMariaIdentifier(col)} AS CHAR) LIKE ?`)
      .join(' OR ')})`);
    searchableColumns.forEach(() => values.push(`%${filter.trim()}%`));
  }

  appendMariaColumnFilterClauses(clauses, values, columns, columnFilter);

  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const normalizedSort = normalizeSort(sort, columns);
  const order = normalizedSort
    ? ` ORDER BY ${quoteMariaIdentifier(normalizedSort.column)} ${normalizedSort.direction.toUpperCase()}`
    : '';
  const query = `SELECT * FROM ${quoteMariaIdentifier(tableName)}${where}${order} LIMIT ${safeLimit};`;
  const rows = await runMariaDb(connection, query, values);
  return { rows, query: interpolateSql(query, values) };
}

function getConnectionLabel(connection) {
  if (connection.type === 'mariadb') {
    const databaseTarget = `${connection.user}@${connection.host}:${connection.port}/${connection.database}`;
    return connection.sshTunnel
      ? `${databaseTarget} via ${connection.sshTunnel.user}@${connection.sshTunnel.host}:${connection.sshTunnel.port || 22}`
      : databaseTarget;
  }

  return connection.path;
}

async function getTables(connection) {
  return connection.type === 'mariadb' ? getMariaTables(connection) : getSqliteTables(connection.path);
}

async function getColumns(connection, tableName) {
  return connection.type === 'mariadb' ? getMariaColumns(connection, tableName) : getSqliteColumns(connection.path, tableName);
}

async function getData(connection, tableName, filter, limit, columnFilter, sort) {
  return connection.type === 'mariadb'
    ? getMariaData(connection, tableName, filter, limit, columnFilter, sort)
    : getSqliteData(connection.path, tableName, filter, limit, columnFilter, sort);
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

async function getSqliteRelationRows(databasePath, tableName, columnName, value) {
  if (value === null || value === undefined) {
    return runSqlite(
      databasePath,
      `SELECT * FROM ${quoteSqliteIdentifier(tableName)} WHERE ${quoteSqliteIdentifier(columnName)} IS NULL LIMIT 50;`
    );
  }

  return runSqlite(
    databasePath,
    `SELECT * FROM ${quoteSqliteIdentifier(tableName)} WHERE ${quoteSqliteIdentifier(columnName)} = ${quoteLiteral(value)} LIMIT 50;`
  );
}

async function getMariaRelationRows(connection, tableName, columnName, value) {
  if (value === null || value === undefined) {
    return runMariaDb(
      connection,
      `SELECT * FROM ${quoteMariaIdentifier(tableName)} WHERE ${quoteMariaIdentifier(columnName)} IS NULL LIMIT 50;`
    );
  }

  return runMariaDb(
    connection,
    `SELECT * FROM ${quoteMariaIdentifier(tableName)} WHERE ${quoteMariaIdentifier(columnName)} = ? LIMIT 50;`,
    [value]
  );
}

async function getRelationRows(connection, tableName, columnName, value) {
  return connection.type === 'mariadb'
    ? getMariaRelationRows(connection, tableName, columnName, value)
    : getSqliteRelationRows(connection.path, tableName, columnName, value);
}

async function updateSqliteRow(databasePath, tableName, setValues, whereValues) {
  const setClauses = Object.entries(setValues)
    .map(([k, v]) => `${quoteSqliteIdentifier(k)} = ${v === null ? 'NULL' : quoteLiteral(v)}`)
    .join(', ');
  const whereClauses = Object.entries(whereValues)
    .map(([k, v]) => v === null
      ? `${quoteSqliteIdentifier(k)} IS NULL`
      : `${quoteSqliteIdentifier(k)} = ${quoteLiteral(v)}`)
    .join(' AND ');
  return runSqlite(databasePath, `UPDATE ${quoteSqliteIdentifier(tableName)} SET ${setClauses} WHERE ${whereClauses};`);
}

async function updateMariaRow(connection, tableName, setValues, whereValues) {
  const setEntries = Object.entries(setValues);
  const whereEntries = Object.entries(whereValues);
  const setClauses = setEntries.map(([k]) => `${quoteMariaIdentifier(k)} = ?`).join(', ');
  const whereClauses = whereEntries
    .map(([k, v]) => v === null ? `${quoteMariaIdentifier(k)} IS NULL` : `${quoteMariaIdentifier(k)} = ?`)
    .join(' AND ');
  const values = [
    ...setEntries.map(([, v]) => v),
    ...whereEntries.filter(([, v]) => v !== null).map(([, v]) => v)
  ];
  return runMariaDb(connection, `UPDATE ${quoteMariaIdentifier(tableName)} SET ${setClauses} WHERE ${whereClauses};`, values);
}

function assertDeleteWhereValues(whereValues) {
  if (!whereValues || !Object.keys(whereValues).length) {
    throw new Error('Rij kan niet worden verwijderd zonder kolomwaarden om op te zoeken.');
  }
}

async function deleteSqliteRow(databasePath, tableName, whereValues, limitOne = false) {
  assertDeleteWhereValues(whereValues);
  const whereClauses = Object.entries(whereValues)
    .map(([k, v]) => v === null
      ? `${quoteSqliteIdentifier(k)} IS NULL`
      : `${quoteSqliteIdentifier(k)} = ${quoteLiteral(v)}`)
    .join(' AND ');

  if (limitOne) {
    return runSqlite(
      databasePath,
      `DELETE FROM ${quoteSqliteIdentifier(tableName)} WHERE _rowid_ IN (SELECT _rowid_ FROM ${quoteSqliteIdentifier(tableName)} WHERE ${whereClauses} LIMIT 1);`
    );
  }

  return runSqlite(databasePath, `DELETE FROM ${quoteSqliteIdentifier(tableName)} WHERE ${whereClauses};`);
}

async function deleteMariaRow(connection, tableName, whereValues, limitOne = false) {
  assertDeleteWhereValues(whereValues);
  const whereEntries = Object.entries(whereValues);
  const whereClauses = whereEntries
    .map(([k, v]) => v === null ? `${quoteMariaIdentifier(k)} IS NULL` : `${quoteMariaIdentifier(k)} = ?`)
    .join(' AND ');
  const values = whereEntries.filter(([, v]) => v !== null).map(([, v]) => v);
  const limitSql = limitOne ? ' LIMIT 1' : '';
  return runMariaDb(connection, `DELETE FROM ${quoteMariaIdentifier(tableName)} WHERE ${whereClauses}${limitSql};`, values);
}

async function insertSqliteRow(databasePath, tableName, values) {
  const entries = Object.entries(values).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (!entries.length) {
    return runSqlite(databasePath, `INSERT INTO ${quoteSqliteIdentifier(tableName)} DEFAULT VALUES;`);
  }
  const cols = entries.map(([k]) => quoteSqliteIdentifier(k)).join(', ');
  const vals = entries.map(([, v]) => quoteLiteral(v)).join(', ');
  return runSqlite(databasePath, `INSERT INTO ${quoteSqliteIdentifier(tableName)} (${cols}) VALUES (${vals});`);
}

async function insertMariaRow(connection, tableName, values) {
  const entries = Object.entries(values).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (!entries.length) {
    return runMariaDb(connection, `INSERT INTO ${quoteMariaIdentifier(tableName)} () VALUES ();`);
  }
  const cols = entries.map(([k]) => quoteMariaIdentifier(k)).join(', ');
  const placeholders = entries.map(() => '?').join(', ');
  const vals = entries.map(([, v]) => v);
  return runMariaDb(connection, `INSERT INTO ${quoteMariaIdentifier(tableName)} (${cols}) VALUES (${placeholders});`, vals);
}

function normalizeConnection(connection) {
  const type = ['sqlite', 'ssh'].includes(connection.type) ? connection.type : 'mariadb';
  const backgroundColor = isHexColor(connection.backgroundColor) ? connection.backgroundColor : null;
  const groupId = connection.groupId ? String(connection.groupId) : null;
  const groupName = groupId ? String(connection.groupName || 'Groep') : null;
  const position = Number.isFinite(Number(connection.position)) ? Number(connection.position) : null;
  const groupPosition = Number.isFinite(Number(connection.groupPosition)) ? Number(connection.groupPosition) : null;
  const normalizeTunnel = (value) => value
    ? {
        host: String(value.host || ''),
        port: clamp(value.port || 22, 1, 65535),
        user: String(value.user || ''),
        password: String(value.password || ''),
        keyPath: String(value.keyPath || '')
      }
    : null;

  if (type === 'sqlite') {
    const normalized = {
      id: connection.id || randomUUID(),
      type,
      name: String(connection.name || path.basename(connection.path || 'SQLite database')),
      path: String(connection.path || ''),
      createdAt: connection.createdAt || new Date().toISOString()
    };

    if (backgroundColor) {
      normalized.backgroundColor = backgroundColor;
    }

    if (groupId) {
      normalized.groupId = groupId;
      normalized.groupName = groupName;
    }

    if (position !== null) {
      normalized.position = position;
    }

    if (groupId && groupPosition !== null) {
      normalized.groupPosition = groupPosition;
    }

    if (connection.readOnly) {
      normalized.readOnly = true;
    }

    if (!normalized.path || !existsSync(normalized.path)) {
      throw new Error('Databasebestand bestaat niet.');
    }

    return normalized;
  }

  if (type === 'ssh') {
    const normalized = {
      id: connection.id || randomUUID(),
      type,
      name: String(connection.name || connection.host || 'SSH connectie'),
      host: String(connection.host || ''),
      port: clamp(connection.port || 22, 1, 65535),
      user: String(connection.user || ''),
      password: String(connection.password || ''),
      keyPath: String(connection.keyPath || ''),
      createdAt: connection.createdAt || new Date().toISOString()
    };

    if (backgroundColor) {
      normalized.backgroundColor = backgroundColor;
    }

    if (groupId) {
      normalized.groupId = groupId;
      normalized.groupName = groupName;
    }

    if (position !== null) {
      normalized.position = position;
    }

    if (groupId && groupPosition !== null) {
      normalized.groupPosition = groupPosition;
    }

    if (!normalized.host || !normalized.user) {
      throw new Error('SSH host en user zijn verplicht.');
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
  const sshTunnel = normalizeTunnel(connection.sshTunnel);

  if (backgroundColor) {
    normalized.backgroundColor = backgroundColor;
  }

  if (groupId) {
    normalized.groupId = groupId;
    normalized.groupName = groupName;
  }

  if (position !== null) {
    normalized.position = position;
  }

  if (groupId && groupPosition !== null) {
    normalized.groupPosition = groupPosition;
  }

  if (!normalized.user || !normalized.database) {
    throw new Error('MariaDB user en database zijn verplicht.');
  }

  if (sshTunnel) {
    if (!sshTunnel.host || !sshTunnel.user) {
      throw new Error('SSH-tunnel host en user zijn verplicht.');
    }
    normalized.sshTunnel = sshTunnel;
  }

  if (connection.readOnly) {
    normalized.readOnly = true;
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

  if (left.type === 'ssh') {
    return left.host === right.host
      && Number(left.port) === Number(right.port)
      && left.user === right.user;
  }

  return left.host === right.host
    && Number(left.port) === Number(right.port)
    && left.user === right.user
    && left.database === right.database
    && Boolean(left.sshTunnel) === Boolean(right.sshTunnel)
    && (!left.sshTunnel || (
      left.sshTunnel.host === right.sshTunnel.host
      && Number(left.sshTunnel.port) === Number(right.sshTunnel.port)
      && left.sshTunnel.user === right.sshTunnel.user
    ));
}

function getDuplicateConnectionName(connections, baseName) {
  const base = String(baseName || 'Connectie').trim() || 'Connectie';
  const usedNames = new Set(connections.map((connection) => connection.name));
  let copyName = `${base} kopie`;
  let counter = 2;

  while (usedNames.has(copyName)) {
    copyName = `${base} kopie ${counter}`;
    counter += 1;
  }

  return copyName;
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    title: 'RemySQL',
    icon: iconPath,
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
    { role: 'editMenu' },
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
        {
          label: 'Nieuwe SSH connectie...',
          click: () => mainWindow?.webContents.send('connection:new-ssh')
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

ipcMain.handle('app:info', () => ({
  name: app.name,
  version: app.getVersion(),
  changelog: readChangelog(),
  updateRepository: githubRepo
}));

ipcMain.handle('app:check-updates', () => checkForUpdates());

ipcMain.handle('app:open-external', async (_event, url) => {
  const target = String(url || '');
  if (!/^https?:\/\//i.test(target)) {
    throw new Error('Ongeldige externe link.');
  }
  await shell.openExternal(target);
  return { ok: true };
});

ipcMain.handle('connections:add', async (_event, connection) => {
  const normalized = normalizeConnection(connection);
  const tables = normalized.type === 'ssh' ? [] : await getTables(normalized);
  const connections = readConnections();
  const nextConnections = normalizeConnectionPositions([
    normalized,
    ...connections.filter((item) => item.id !== normalized.id && !sameConnection(item, normalized))
  ]);
  writeConnections(nextConnections);

  return { connection: nextConnections.find((item) => item.id === normalized.id) || normalized, tables };
});

ipcMain.handle('connections:remove', (_event, connectionId) => {
  const nextConnections = readConnections().filter((connection) => connection.id !== connectionId);
  writeConnections(nextConnections);
  return nextConnections;
});

ipcMain.handle('connections:duplicate', async (_event, connectionId) => {
  const connections = readConnections();
  const source = connections.find((connection) => connection.id === connectionId);
  if (!source) {
    throw new Error('Connectie niet gevonden.');
  }

  const duplicate = {
    ...source,
    id: randomUUID(),
    name: getDuplicateConnectionName(connections, source.name),
    createdAt: new Date().toISOString()
  };
  const tables = duplicate.type === 'ssh' ? [] : await getTables(duplicate);
  const nextConnections = normalizeConnectionPositions([duplicate, ...connections]);
  writeConnections(nextConnections);

  return { connection: nextConnections.find((item) => item.id === duplicate.id) || duplicate, tables };
});

ipcMain.handle('connections:update-background', (_event, { connectionId, backgroundColor }) => {
  if (!isConnectionColor(backgroundColor)) {
    throw new Error('Ongeldige kleur.');
  }

  const connections = readConnections();
  const nextConnections = connections.map((connection) => (
    connection.id === connectionId
      ? { ...connection, backgroundColor }
      : connection
  ));

  writeConnections(nextConnections);
  return nextConnections;
});

ipcMain.handle('connections:group', (_event, { sourceConnectionId, targetConnectionId }) => {
  const { connections: nextConnections, groupId } = groupConnectionList(readConnections(), sourceConnectionId, targetConnectionId);

  writeConnections(nextConnections);
  return { connections: nextConnections, groupId };
});

ipcMain.handle('connections:move', (_event, { sourceConnectionId, targetConnectionId, targetGroupId, placement }) => {
  const normalizedPlacement = ['before', 'after', 'inside'].includes(placement) ? placement : 'after';
  const connections = readConnections();
  const source = connections.find((connection) => connection.id === sourceConnectionId);

  if (!source) {
    return connections;
  }

  if (normalizedPlacement === 'inside') {
    const { connections: nextConnections } = groupConnectionList(connections, sourceConnectionId, targetConnectionId);
    writeConnections(nextConnections);
    return nextConnections;
  }

  const delta = normalizedPlacement === 'before' ? -0.1 : 0.1;
  const target = targetConnectionId
    ? connections.find((connection) => connection.id === targetConnectionId)
    : null;
  const targetGroupEntry = targetGroupId
    ? getConnectionEntries(connections).find((entry) => entry.type === 'group' && entry.id === targetGroupId)
    : null;

  if (!target && !targetGroupEntry) {
    return connections;
  }

  const nextConnections = normalizeConnectionPositions(connections.map((connection) => {
    if (connection.id !== source.id) {
      return connection;
    }

    if (target?.groupId) {
      return {
        ...connection,
        groupId: target.groupId,
        groupName: getConnectionGroupName(target),
        groupPosition: finiteNumber(target.groupPosition, getConnectionEntryPosition(connections, target.id)),
        position: finiteNumber(target.position, 0) + delta
      };
    }

    const targetPosition = target
      ? finiteNumber(target.position, getConnectionEntryPosition(connections, target.id))
      : finiteNumber(targetGroupEntry.position, 0);

    return {
      ...stripGroupFields(connection),
      position: targetPosition + delta
    };
  }));

  writeConnections(nextConnections);
  return nextConnections;
});

ipcMain.handle('connections:update-group-name', (_event, { groupId, groupName }) => {
  const normalizedGroupId = String(groupId || '');
  const normalizedGroupName = String(groupName || '').trim() || 'Groep';

  if (!normalizedGroupId) {
    return readConnections();
  }

  const nextConnections = normalizeConnectionPositions(readConnections().map((connection) => (
    connection.groupId === normalizedGroupId
      ? { ...connection, groupName: normalizedGroupName }
      : connection
  )));

  writeConnections(nextConnections);
  return nextConnections;
});

ipcMain.handle('ssh:start', (_event, payload) => {
  const connection = payload?.connection || payload;
  const cols = clamp(payload?.cols || 100, 20, 300);
  const rows = clamp(payload?.rows || 30, 5, 120);
  const normalized = normalizeConnection({ ...connection, type: 'ssh' });
  const sessionId = randomUUID();
  const { command, args, authMode, env = {}, cleanup = null } = buildSshCommand(normalized, sessionId);
  let ptyProcess;
  try {
    ptyProcess = getPty().spawn(command, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: app.getPath('home'),
      env: getSpawnEnv({ ...env, TERM: 'xterm-256color' }),
    });
  } catch (error) {
    cleanup?.();
    throw new Error(`SSH kon niet worden gestart via ${command}: ${error.message}`);
  }

  sshSessions.set(sessionId, { ptyProcess, cleanup });
  let didCleanup = false;
  const cleanupSession = () => {
    if (didCleanup) return;
    didCleanup = true;
    cleanup?.();
  };
  let diagnosticOutput = `auth=${authMode}; host=${normalized.host}; port=${normalized.port}; user=${normalized.user}; command=${command}`;
  let passwordSent = false;
  mainWindow?.webContents.send('ssh:data', {
    sessionId,
    data: `SSH diagnose: ${normalized.user}@${normalized.host}:${normalized.port} via ${authMode}\r\n`
  });

  const sendData = (data) => {
    const text = String(data);
    diagnosticOutput = `${diagnosticOutput}${text}`.slice(-6000);
    mainWindow?.webContents.send('ssh:data', { sessionId, data: text });

    if (!passwordSent && normalized.password && !normalized.keyPath && /password[: ]*$/i.test(text.trim())) {
      passwordSent = true;
      ptyProcess.write(`${normalized.password}\r`);
    }
  };

  ptyProcess.onData(sendData);
  ptyProcess.onExit(({ exitCode }) => {
    const code = typeof exitCode === 'number' ? exitCode : 0;
    if (code) {
      const hint = getSshFailureHint(diagnosticOutput, code, command, authMode);
      if (hint) {
        mainWindow?.webContents.send('ssh:data', { sessionId, data: `\r\nHint: ${hint}\r\n` });
      }
    }
    mainWindow?.webContents.send('ssh:exit', { sessionId, code });
    cleanupSession();
    sshSessions.delete(sessionId);
  });

  return { sessionId };
});

ipcMain.handle('ssh:open-terminal', async (_event, connection) => {
  const normalized = normalizeConnection({ ...connection, type: 'ssh' });
  const command = buildSshTerminalCommand(normalized);
  const title = String(normalized.name || getConnectionLabel(normalized)).replaceAll('"', '\\"');
  const script = [
    'tell application "Terminal"',
    'activate',
    `do script "printf '\\\\e]0;${title}\\\\a'; ${command}"`,
    'end tell'
  ].join('\n');

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errorOutput = '';
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code) {
        reject(new Error(errorOutput || `Terminal openen mislukt met code ${code}.`));
        return;
      }
      resolve({ ok: true });
    });
  });
});

ipcMain.handle('ssh:write', (_event, { sessionId, data }) => {
  const session = sshSessions.get(sessionId);
  if (session?.ptyProcess) {
    session.ptyProcess.write(String(data || ''));
  } else if (session?.child && !session.child.killed) {
    session.child.stdin.write(data);
  }
});

ipcMain.handle('ssh:resize', (_event, { sessionId, cols, rows }) => {
  const session = sshSessions.get(sessionId);
  if (session?.ptyProcess) {
    session.ptyProcess.resize(clamp(cols, 20, 300), clamp(rows, 5, 120));
  }
});

ipcMain.handle('ssh:stop', (_event, sessionId) => {
  const session = sshSessions.get(sessionId);
  if (session?.ptyProcess) {
    session.ptyProcess.kill();
  } else if (session?.child && !session.child.killed) {
    session.child.kill();
  }
  session?.cleanup?.();
  sshSessions.delete(sessionId);
});

ipcMain.handle('database:schema', async (_event, connection) => {
  const tables = await getTables(connection);
  return { tables };
});

ipcMain.handle('database:relation-rows', async (_event, { connection, tableName, columnName, value }) => {
  const rows = await getRelationRows(connection, tableName, columnName, value);
  return { rows };
});

ipcMain.handle('database:table', async (_event, { connection, tableName, filter, limit, columnFilter, sort }) => {
  const [columns, data, outgoingKeys, incomingKeys] = await Promise.all([
    getColumns(connection, tableName),
    getData(connection, tableName, filter, limit, columnFilter, sort),
    getOutgoingForeignKeys(connection, tableName),
    getIncomingForeignKeys(connection, tableName)
  ]);

  return {
    columns,
    rows: data.rows,
    query: data.query,
    relations: {
      outgoing: outgoingKeys,
      incoming: incomingKeys
    },
    label: getConnectionLabel(connection)
  };
});

ipcMain.handle('database:update-rows', async (_event, { connection, tableName, updates }) => {
  const results = [];
  for (const { setValues, whereValues } of updates) {
    try {
      if (connection.type === 'sqlite') {
        await updateSqliteRow(connection.path, tableName, setValues, whereValues);
      } else {
        await updateMariaRow(connection, tableName, setValues, whereValues);
      }
      results.push({ ok: true });
    } catch (error) {
      results.push({ ok: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('database:insert-rows', async (_event, { connection, tableName, rows }) => {
  const results = [];
  for (const row of rows) {
    try {
      if (connection.type === 'sqlite') {
        await insertSqliteRow(connection.path, tableName, row);
      } else {
        await insertMariaRow(connection, tableName, row);
      }
      results.push({ ok: true });
    } catch (error) {
      results.push({ ok: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('database:delete-rows', async (_event, { connection, tableName, rows }) => {
  const results = [];
  for (const row of rows) {
    try {
      if (connection.type === 'sqlite') {
        await deleteSqliteRow(connection.path, tableName, row.whereValues, Boolean(row.limitOne));
      } else {
        await deleteMariaRow(connection, tableName, row.whereValues, Boolean(row.limitOne));
      }
      results.push({ ok: true });
    } catch (error) {
      results.push({ ok: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('database:run-sql', async (_event, { connection, sql }) => {
  const trimmed = String(sql || '').trim();
  if (!trimmed) throw new Error('Geen SQL opgegeven.');

  if (connection.type === 'sqlite') {
    const rows = await runSqlite(connection.path, trimmed);
    return { rows: rows || [], affectedRows: null };
  }

  let handle;
  try {
    handle = await openMariaDbClient(connection);
    const result = await handle.client.query(trimmed);
    if (Array.isArray(result)) return { rows: normalizeDbRows(result), affectedRows: null };
    return { rows: [], affectedRows: Number(result?.affectedRows ?? 0) };
  } catch (error) {
    throw new Error(error.sqlMessage || error.message || 'MariaDB query mislukt.');
  } finally {
    if (handle) await handle.cleanup();
  }
});

ipcMain.handle('database:backup-table', async (_event, { connection, tableName }) => {
  if (!tableName) {
    throw new Error('Geen tabel gekozen.');
  }

  return saveTableDump(connection, tableName);
});

app.whenReady().then(() => {
  createMenu();
  createWindow();

  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon-dock.png');
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

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
