const { readFileSync, realpathSync } = require('node:fs');
const { homedir } = require('node:os');
const path = require('node:path');
const { createDecipheriv, createHash } = require('node:crypto');

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const enabled = (value) => value === true || value === 'true';
const stableId = (value) => `dbeaver-${createHash('sha256').update(value).digest('hex').slice(0, 32)}`;

function defaultDBeaverPath() {
  return path.join(homedir(), 'Library', 'DBeaverData', 'workspace6', 'General', '.dbeaver');
}

function resolveDBeaverPath(value) {
  const input = text(value).trim() || defaultDBeaverPath();
  return path.resolve(input === '~' ? homedir() : input.startsWith('~/') ? path.join(homedir(), input.slice(2)) : input);
}

function parseObject(value) {
  const parsed = JSON.parse(value);
  if (!isObject(parsed)) throw new Error('Ongeldig JSON-object.');
  return parsed;
}

function decodeCredentials(buffer) {
  if (buffer.toString('utf8').trimStart().startsWith('{')) return parseObject(buffer.toString('utf8'));
  if (buffer.length < 32 || buffer.length % 16 !== 0) throw new Error('Ongeldig credentials-bestand.');
  // DBeaver Community's file format: 16-byte IV followed by AES-128-CBC JSON.
  // Public format key: dbeaver/dbeaver DefaultSecureStorage.LOCAL_KEY_CACHE.
  const key = Buffer.from('babb4a9f774ab853c96c2d653dfe544a', 'hex');
  const decipher = createDecipheriv('aes-128-cbc', key, buffer.subarray(0, 16));
  return parseObject(Buffer.concat([decipher.update(buffer.subarray(16)), decipher.final()]).toString('utf8'));
}

function portNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ongeldige poort.');
  return port;
}

function mapConnection(source, secrets, id, directory) {
  if (!isObject(source) || !isObject(source.configuration)) throw new Error('Ongeldige connectieconfiguratie.');
  const config = source.configuration;
  const driver = text(source.driver).toLowerCase();
  const isSqlite = ['sqlite', 'sqlite_jdbc', 'sqlite_xerial', 'sqlite_zentus'].includes(driver)
    || (source.provider === 'sqlite' && !driver);
  if (!isSqlite && !['mysql', 'mysql5', 'mysql8', 'mariadb'].includes(driver)) {
    throw new Error('Dit databasetype wordt niet ondersteund (alleen MySQL, MariaDB en SQLite).');
  }
  const connection = {
    id: stableId(`${directory}\0${id}`),
    type: isSqlite ? 'sqlite' : 'mariadb',
    name: text(source.name) || 'DBeaver connectie'
  };
  const warnings = [];
  const handlers = isObject(config.handlers) ? config.handlers : {};
  if (Object.entries(handlers).some(([key, handler]) => enabled(handler?.enabled) && key !== 'ssh_tunnel')) {
    throw new Error('Een netwerkoptie (bijvoorbeeld SSL of proxy) wordt nog niet ondersteund.');
  }
  if (enabled(config['read-only']) || enabled(source['read-only'])) connection.readOnly = true;
  if (source.folder) {
    connection.groupId = stableId(`${directory}\0folder\0${text(source.folder)}`);
    connection.groupName = text(source.folder);
  }

  if (isSqlite) {
    const filename = text(config.database) || text(config.url).replace(/^jdbc:sqlite:/, '');
    if (!filename || filename === ':memory:' || filename.includes('${') || filename.startsWith('file:')) {
      throw new Error('Geen ondersteund lokaal SQLite-bestand ingesteld.');
    }
    if (enabled(handlers.ssh_tunnel?.enabled)) throw new Error('SQLite via SSH wordt niet ondersteund.');
    connection.path = filename.startsWith('~/') ? resolveDBeaverPath(filename) : path.resolve(directory, filename);
    return { connection, warnings };
  }

  const properties = isObject(config.properties) ? config.properties : {};
  if (Object.keys(properties).length) {
    throw new Error('Aangepaste JDBC-driverinstellingen worden nog niet ondersteund.');
  }
  if (config['auth-model'] && config['auth-model'] !== 'native') {
    throw new Error('Deze authenticatiemethode wordt nog niet ondersteund.');
  }
  let url;
  if (config.url) {
    if (!/^jdbc:(mysql|mariadb):\/\//i.test(config.url)) throw new Error('Niet-ondersteunde JDBC-URL.');
    try { url = new URL(config.url.slice(5)); } catch { throw new Error('Ongeldige JDBC-URL.'); }
    if (url.search || url.username || url.password || url.hostname.includes(',')) {
      throw new Error('Extra JDBC-URL-instellingen worden nog niet ondersteund.');
    }
  }
  const auth = isObject(secrets?.['#connection']) ? secrets['#connection'] : {};
  connection.host = text(config.host) || url?.hostname?.replace(/^\[|\]$/g, '') || '127.0.0.1';
  connection.port = portNumber(config.port || url?.port, 3306);
  connection.database = text(config.database) || decodeURIComponent(url?.pathname?.replace(/^\//, '') || '');
  connection.user = text(auth.user ?? config.user ?? config.userName);
  connection.password = text(auth.password ?? config.password);
  const missing = [];
  if (!connection.user) missing.push('gebruiker');
  if (!connection.database) missing.push('database');
  if (!connection.password && enabled(source['save-password']) && auth.password === undefined && config.password === undefined) {
    missing.push('wachtwoord');
  }
  const ssh = handlers.ssh_tunnel;
  if (enabled(ssh?.enabled)) {
    const props = ssh.properties || {};
    const sshAuth = secrets?.['network/ssh_tunnel'] || {};
    const authType = text(props.authType) || 'PASSWORD';
    if (!['PASSWORD', 'PUBLIC_KEY', 'AGENT'].includes(authType) || Number(props['jumpServer.count'] || 0) > 0) {
      throw new Error('Deze SSH-authenticatie of jumpserver wordt nog niet ondersteund.');
    }
    if (authType === 'PUBLIC_KEY' && sshAuth.password) {
      throw new Error('SSH-sleutels met een opgeslagen passphrase worden nog niet ondersteund.');
    }
    connection.sshTunnel = {
      host: text(props.host),
      port: portNumber(props.port, 22),
      user: text(sshAuth.user ?? ssh.user ?? props.user),
      password: authType === 'PASSWORD' ? text(sshAuth.password ?? ssh.password) : '',
      keyPath: authType === 'PUBLIC_KEY' ? text(props.keyPath) : ''
    };
    // DBeaver can override the database host as seen from the SSH server.
    if (props.remoteHost) connection.host = text(props.remoteHost);
    if (props.remotePort) connection.port = portNumber(props.remotePort, connection.port);
    if (!connection.sshTunnel.host) missing.push('SSH-host');
    if (!connection.sshTunnel.user) missing.push('SSH-gebruiker');
    if (authType === 'PASSWORD' && !connection.sshTunnel.password) missing.push('SSH-wachtwoord');
    if (authType === 'PUBLIC_KEY' && !connection.sshTunnel.keyPath) missing.push('SSH-sleutelbestand');
  }
  if (missing.length) {
    connection.importNeedsReview = true;
    warnings.push(`Vul nog aan: ${missing.join(', ')}. Open de connectie om deze te bewerken.`);
  }
  return { connection, warnings };
}

function readDBeaverConnections(input) {
  let directory;
  let data;
  try {
    directory = realpathSync(resolveDBeaverPath(input));
    data = parseObject(readFileSync(path.join(directory, 'data-sources.json'), 'utf8'));
  } catch {
    throw new Error('data-sources.json kon niet worden gelezen. Kies de .dbeaver-map en controleer het bestand en de leesrechten.');
  }
  if (!isObject(data.connections)) throw new Error('data-sources.json bevat geen geldig connections-object.');
  let credentials = {};
  const warnings = [];
  try {
    credentials = decodeCredentials(readFileSync(path.join(directory, 'credentials-config.json')));
  } catch (error) {
    warnings.push(error.code === 'ENOENT'
      ? 'credentials-config.json ontbreekt. Niet-opgeslagen inloggegevens moet je zelf aanvullen.'
      : 'credentials-config.json kon niet worden gelezen of ontsleuteld. Vul ontbrekende inloggegevens zelf aan; een master password of externe credential store wordt niet ondersteund.');
  }
  const entries = Object.entries(data.connections).map(([id, source]) => {
    const name = text(source?.name) || 'DBeaver connectie';
    try {
      return { name, ...mapConnection(source, credentials[id], id, directory) };
    } catch (error) {
      // Never include raw JSON or credentials in errors.
      return { name, reason: error instanceof URIError ? 'Ongeldige JDBC-URL.' : error.message };
    }
  });
  return { entries, warnings };
}

function mergeDBeaverConnections(imported, existing, normalize, sameConnection) {
  const connections = [...existing];
  const results = imported.entries.map((entry) => {
    if (!entry.connection) return { name: entry.name, status: 'skipped', reason: entry.reason };
    if (connections.some((item) => item.id === entry.connection.id || sameConnection(item, entry.connection))) {
      return { name: entry.name, status: 'duplicate', reason: 'Deze connectie bestaat al.' };
    }
    try {
      const connection = normalize(entry.connection, { allowIncomplete: true });
      connections.push({ ...connection, position: connections.length });
      return { name: entry.name, status: 'imported', warnings: entry.warnings };
    } catch (error) {
      return { name: entry.name, status: 'skipped', reason: error.message };
    }
  });
  return { connections, results, warnings: imported.warnings };
}

module.exports = { defaultDBeaverPath, resolveDBeaverPath, decodeCredentials, readDBeaverConnections, mergeDBeaverConnections };
