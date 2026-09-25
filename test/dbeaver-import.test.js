const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createCipheriv } = require('node:crypto');
const { defaultDBeaverPath, resolveDBeaverPath, decodeCredentials, readDBeaverConnections } = require('../src/dbeaver-import');

function encryptedCredentials(value) {
  const iv = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
  const cipher = createCipheriv('aes-128-cbc', Buffer.from('babb4a9f774ab853c96c2d653dfe544a', 'hex'), iv);
  return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final()]);
}

function fixture(t, connections, credentials) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'remysql-dbeaver-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'data-sources.json'), JSON.stringify({ connections }));
  if (credentials) fs.writeFileSync(path.join(dir, 'credentials-config.json'), encryptedCredentials(credentials));
  return dir;
}

const source = (configuration = {}, extra = {}) => ({
  provider: 'mysql', driver: 'mariaDB', name: 'Demo database', 'save-password': true,
  configuration: { host: 'db.example.test', port: '3307', database: 'shop', 'auth-model': 'native', ...configuration },
  ...extra
});
const credentials = { '#connection': { user: 'demo', password: 'test-secret' } };

// Execute the real IPC handlers against temporary storage. No Electron window,
// Keychain, network connection or user database is used by these tests.
function mainHarness(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'remysql-main-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const handlers = new Map();
  const electron = {
    app: { getPath: () => dir, whenReady: () => ({ then() {} }), on() {} },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(value),
      decryptString: (value) => value.toString()
    }
  };
  const filename = path.resolve(__dirname, '../src/main.js');
  const localRequire = createRequire(filename);
  const context = vm.createContext({
    require: (id) => id === 'electron' ? electron : localRequire(id),
    __dirname: path.dirname(filename), Buffer, process, console, setTimeout, clearTimeout, URL
  });
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return {
    invoke: (name, ...args) => handlers.get(name)(null, ...args),
    normalize: (value, options) => context.normalizeConnection(value, options),
    storage: path.join(dir, 'connections.json')
  };
}

test('default directory uses the current home and supports ~ and spaces', () => {
  assert.equal(defaultDBeaverPath(), path.join(os.homedir(), 'Library/DBeaverData/workspace6/General/.dbeaver'));
  assert.equal(resolveDBeaverPath(''), defaultDBeaverPath());
  assert.equal(resolveDBeaverPath('~/DBeaver project/.dbeaver/'), path.join(os.homedir(), 'DBeaver project/.dbeaver'));
});

test('reads encrypted and plaintext credential files', () => {
  const value = { one: credentials };
  assert.deepEqual(decodeCredentials(encryptedCredentials(value)), value);
  assert.deepEqual(decodeCredentials(Buffer.from(JSON.stringify(value))), value);
  assert.throws(() => decodeCredentials(Buffer.from('broken')));
});

test('maps MySQL, MariaDB, JDBC fallback, SSH credentials, folders and read-only', (t) => {
  const dir = fixture(t, {
    direct: source({}, { folder: 'Development', 'read-only': true }),
    tunnel: source({ handlers: { ssh_tunnel: { enabled: true, properties: {
      host: 'ssh.example.test', port: '2222', authType: 'PASSWORD', remoteHost: 'db.internal'
    } } } }),
    mysql: source({ host: '', port: '', database: '', url: 'jdbc:mysql://[::1]:3308/shop%20demo' }, { driver: 'mysql8' })
  }, {
    direct: credentials,
    tunnel: { ...credentials, 'network/ssh_tunnel': { user: 'tunnel-user', password: 'tunnel-secret' } },
    mysql: credentials
  });
  const { entries, warnings } = readDBeaverConnections(dir);
  assert.deepEqual(warnings, []);
  assert.equal(entries[0].connection.password, 'test-secret');
  assert.equal(entries[0].connection.readOnly, true);
  assert.equal(entries[0].connection.groupName, 'Development');
  assert.equal(entries[1].connection.host, 'db.internal');
  assert.deepEqual(entries[1].connection.sshTunnel, {
    host: 'ssh.example.test', port: 2222, user: 'tunnel-user', password: 'tunnel-secret', keyPath: ''
  });
  assert.equal(entries[2].connection.host, '::1');
  assert.equal(entries[2].connection.port, 3308);
  assert.equal(entries[2].connection.database, 'shop demo');
});

test('missing and corrupt credentials create actionable drafts without leaking file content', (t) => {
  const dir = fixture(t, { one: source({ database: '' }) });
  let result = readDBeaverConnections(dir);
  assert.equal(result.entries[0].connection.importNeedsReview, true);
  assert.match(result.entries[0].warnings[0], /gebruiker, database, wachtwoord/);
  assert.match(result.warnings[0], /ontbreekt/);
  fs.writeFileSync(path.join(dir, 'credentials-config.json'), '{"password":"never-print-this" broken');
  result = readDBeaverConnections(dir);
  assert.match(result.warnings[0], /ontsleuteld/);
  assert.doesNotMatch(JSON.stringify(result), /never-print-this/);
});

test('invalid files fail clearly and unsupported entries do not block valid entries', (t) => {
  const dir = fixture(t, {
    good: source(),
    postgres: source({}, { driver: 'postgres-jdbc' }),
    badPort: source({ port: 'banana' }),
    badUrl: source({ url: 'jdbc:mysql://host/shop?useSSL=true' }),
    tls: source({ handlers: { ssl: { enabled: true } } }),
    proxy: source({ handlers: { socks: { enabled: 'true' } } }),
    custom: source({ properties: { useSSL: 'true' } }),
    oauth: source({ 'auth-model': 'oauth' }),
    malformed: null
  }, { good: credentials });
  const result = readDBeaverConnections(dir);
  assert.equal(result.entries.filter((entry) => entry.connection).length, 1);
  assert.equal(result.entries.filter((entry) => entry.reason).length, 8);
  fs.writeFileSync(path.join(dir, 'data-sources.json'), '{broken');
  assert.throws(() => readDBeaverConnections(dir), /data-sources.json kon niet/);
  fs.writeFileSync(path.join(dir, 'data-sources.json'), '{"connections":[]}');
  assert.throws(() => readDBeaverConnections(dir), /connections-object/);
  assert.throws(() => readDBeaverConnections(path.join(dir, 'missing')), /data-sources.json kon niet/);
});

test('imports SQLite files but skips missing files and in-memory databases', (t) => {
  const dir = fixture(t, {
    sqlite: source({ database: 'demo.sqlite' }, { provider: 'sqlite', driver: 'sqlite_jdbc' }),
    missing: source({ database: 'missing.sqlite' }, { provider: 'sqlite', driver: 'sqlite' }),
    memory: source({ database: ':memory:' }, { provider: 'sqlite', driver: 'sqlite' })
  });
  fs.writeFileSync(path.join(dir, 'demo.sqlite'), '');
  const main = mainHarness(t);
  const result = main.invoke('dbeaver:import', dir);
  assert.equal(result.results.filter((entry) => entry.status === 'imported').length, 1);
  assert.equal(result.results.filter((entry) => entry.status === 'skipped').length, 2);
  assert.equal(result.connections[0].path, path.join(fs.realpathSync(dir), 'demo.sqlite'));
});

test('IPC import persists encrypted data, keeps existing edits and is idempotent', (t) => {
  const dir = fixture(t, { one: source() }, { one: credentials });
  const main = mainHarness(t);
  const first = main.invoke('dbeaver:import', dir);
  assert.equal(first.results[0].status, 'imported');
  const stored = fs.readFileSync(main.storage, 'utf8');
  assert.equal(JSON.parse(stored).algorithm, 'aes-256-gcm');
  assert.doesNotMatch(stored, /test-secret|db.example.test/);
  const id = first.connections[0].id;
  main.invoke('connections:update-background', { connectionId: id, backgroundColor: '#22c55e' });
  const again = main.invoke('dbeaver:import', path.join(dir, '.'));
  assert.equal(again.results[0].status, 'duplicate');
  assert.equal(again.connections.length, 1);
  assert.equal(again.connections[0].backgroundColor, '#22c55e');
  assert.equal(main.invoke('connections:list')[0].password, 'test-secret');
});

test('duplicate targets within a file and another project are skipped', (t) => {
  const dir = fixture(t, { one: source(), two: source() }, { one: credentials, two: credentials });
  const other = fixture(t, { another: source() }, { another: credentials });
  const main = mainHarness(t);
  assert.deepEqual(main.invoke('dbeaver:import', dir).results.map((entry) => entry.status), ['imported', 'duplicate']);
  assert.equal(main.invoke('dbeaver:import', other).results[0].status, 'duplicate');
});

test('drafts persist, block database access, and normal saves still require complete fields', async (t) => {
  const dir = fixture(t, { one: source({ database: '' }) }, { one: credentials });
  const main = mainHarness(t);
  const result = main.invoke('dbeaver:import', dir);
  const draft = result.connections[0];
  assert.equal(draft.importNeedsReview, true);
  assert.equal(main.invoke('connections:list')[0].importNeedsReview, true);
  await assert.rejects(main.invoke('database:schema', draft), /ontbrekende instellingen/);
  assert.throws(() => main.normalize(draft), /user en database/);
  const ready = main.normalize({ ...draft, database: 'shop' });
  assert.equal(ready.importNeedsReview, undefined);
});

test('SSH key and agent modes are preserved; jump hosts and passphrases are reported', (t) => {
  const ssh = (props) => source({ handlers: { ssh_tunnel: { enabled: true, properties: { host: 'ssh.test', ...props } } } });
  const dir = fixture(t, {
    key: ssh({ authType: 'PUBLIC_KEY', keyPath: '~/.ssh/id_test' }),
    agent: ssh({ authType: 'AGENT' }),
    jump: ssh({ 'jumpServer.count': '1' }),
    passphrase: ssh({ authType: 'PUBLIC_KEY', keyPath: '~/.ssh/id_test' })
  }, Object.fromEntries(['key', 'agent', 'jump', 'passphrase'].map((key) => [key, {
    ...credentials, 'network/ssh_tunnel': { user: 'ssh-user', ...(key === 'passphrase' ? { password: 'passphrase' } : {}) }
  }])));
  const { entries } = readDBeaverConnections(dir);
  assert.equal(entries[0].connection.sshTunnel.keyPath, '~/.ssh/id_test');
  assert.equal(entries[0].connection.importNeedsReview, undefined);
  assert.equal(entries[1].connection.sshTunnel.keyPath, '');
  assert.match(entries[2].reason, /jumpserver/);
  assert.match(entries[3].reason, /passphrase/);
});
