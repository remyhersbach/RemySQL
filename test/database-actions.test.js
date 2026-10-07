const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { execFileSync, spawnSync } = require('node:child_process');
const hasSqlite = spawnSync('sqlite3', ['-version']).status === 0;
const { Readable } = require('node:stream');
const { csvLine, writeCsv } = require('../src/csv');

function harness(saveResult) {
  const filename = path.resolve(__dirname, '../src/main.js');
  const localRequire = createRequire(filename);
  const handlers = new Map();
  const electron = {
    app: { whenReady: () => ({ then() {} }), on() {} },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn) },
    dialog: { showSaveDialog: async () => saveResult }
  };
  const context = vm.createContext({
    require: (id) => id === 'electron' ? electron : localRequire(id),
    __dirname: path.dirname(filename), Buffer, process, console, setTimeout, clearTimeout, URL
  });
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return { context, handlers };
}

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'remysql-actions-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

for (const driver of ['sqlite', 'mariadb']) {
  test(`${driver}: export query keeps filters and sorting without the UI row limit`, async () => {
    const { context } = harness();
    context.getSqliteColumns = context.getMariaColumns = async () => [{ name: 'id', pk: 1 }, { name: 'title', pk: 0 }];
    context.runSqlite = context.runMariaDb = () => { throw new Error('Must stream instead of buffering'); };
    const args = ['articles', 'hello', 100, [{ column: 'id', operator: '>', value: '2' }], { column: 'title', direction: 'asc' }, true];
    const result = driver === 'sqlite' ? await context.getSqliteData('unused', ...args) : await context.getMariaData({}, ...args);
    assert.match(result.query, /WHERE .*LIKE .* AND .* > .*ORDER BY .*title.* ASC;/);
    assert.doesNotMatch(result.query, /LIMIT/);
    if (driver === 'mariadb') assert.deepEqual(Array.from(result.values), ['%hello%', '%hello%', '2']);
  });

  test(`${driver}: drop quotes identifiers and blocks read-only connections and views`, async () => {
    const { context, handlers } = harness();
    const name = driver === 'sqlite' ? 'a"b' : 'a`b';
    context.getTables = async () => [{ name, type: driver === 'sqlite' ? 'table' : 'base table' }, { name: 'view', type: 'view' }];
    const queries = [];
    context.runSqlite = context.runMariaDb = async (_, query) => { queries.push(query); };
    const connection = { type: driver, path: 'unused' };
    const drop = (connection, tableName) => handlers.get('database:drop-table')(null, { connection, tableName });
    await drop(connection, name);
    assert.equal(queries[0], driver === 'sqlite' ? 'DROP TABLE "a""b";' : 'DROP TABLE `a``b`;');
    await assert.rejects(drop({ ...connection, readOnly: true }, name), /Alleen lezen/);
    await assert.rejects(drop(connection, 'view'), /Alleen echte tabellen/);
    await assert.rejects(drop(connection, 'missing'), /Alleen echte tabellen/);
    assert.equal(queries.length, 1);
  });
}

test('SQLite CSV export streams over 5,000 rows and 20 MB, preserving filters and order', { skip: !hasSqlite }, async (t) => {
  const directory = temporaryDirectory(t);
  const databasePath = path.join(directory, 'large.sqlite');
  const filePath = path.join(directory, 'result.csv');
  execFileSync('sqlite3', [databasePath, `
    CREATE TABLE entries (id INTEGER PRIMARY KEY, category TEXT, content TEXT);
    WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 6001)
    INSERT INTO entries SELECT n, 'keep', hex(zeroblob(2048)) FROM numbers;
    INSERT INTO entries VALUES (6002, 'skip', 'excluded');
  `]);
  const { handlers } = harness({ canceled: false, filePath });
  await handlers.get('database:export-csv')(null, {
    connection: { type: 'sqlite', path: databasePath }, tableName: 'entries',
    columnFilter: [{ column: 'category', operator: '=', value: 'keep' }],
    sort: { column: 'id', direction: 'desc' }
  });
  assert.ok(fs.statSync(filePath).size > 20 * 1024 * 1024);
  const csv = fs.readFileSync(filePath, 'utf8');
  assert.equal(csv.trim().split('\n').length, 6002);
  assert.ok(csv.startsWith('"id","category","content"\r\n6001,keep,'));
  assert.ok(csv.includes('\n1,keep,'));
  assert.ok(!csv.includes('excluded'));
});

test('MariaDB CSV streams normalized values and always cleans up the connection', async (t) => {
  const filePath = path.join(temporaryDirectory(t), 'maria.csv');
  const { context, handlers } = harness({ canceled: false, filePath });
  context.getMariaColumns = async () => [{ name: 'id', pk: 1 }, { name: 'text' }, { name: 'data' }];
  let cleaned = false;
  context.openMariaDbClient = async () => ({
    client: { queryStream: (query, values) => {
      assert.doesNotMatch(query, /LIMIT/);
      assert.equal(values.length, 0);
      const stream = Readable.from([{ id: 9007199254740993n, text: 'héllo,"world"\nnext', data: Buffer.from('ff', 'hex') }]);
      stream.close = () => {};
      return stream;
    } },
    cleanup: async () => { cleaned = true; }
  });
  await handlers.get('database:export-csv')(null, { connection: { type: 'mariadb' }, tableName: 'entries' });
  assert.equal(fs.readFileSync(filePath, 'utf8'), '"id","text","data"\r\n"9007199254740993","héllo,""world""\nnext","ff"\r\n');
  assert.equal(cleaned, true);
});

test('SQL result CSV exports every supplied row, including commas, quotes, newlines, nulls and Unicode', async (t) => {
  const filePath = path.join(temporaryDirectory(t), 'sql.csv');
  const { context, handlers } = harness({ canceled: false, filePath });
  context.runSqlite = context.runMariaDb = () => { throw new Error('SQL results must not execute again'); };
  const rows = [{ title: 'héllo,"world"\nnext', count: null }, { title: 'last', count: 2 }];
  await handlers.get('database:export-csv')(null, {
    connection: { type: 'sqlite' }, tableName: 'result', rows,
    columns: [{ name: 'title' }, { name: 'count' }]
  });
  assert.equal(fs.readFileSync(filePath, 'utf8'), '"title","count"\r\n"héllo,""world""\nnext",""\r\n"last","2"\r\n');
  assert.equal(csvLine([0, false, '', undefined]), '"0","false","",""\r\n');
});

test('cancelled export does not query or write; failed export preserves existing file and removes temporary output', async (t) => {
  const directory = temporaryDirectory(t);
  const filePath = path.join(directory, 'existing.csv');
  fs.writeFileSync(filePath, 'original');
  const { context, handlers } = harness({ canceled: true });
  context.getSqliteColumns = () => { throw new Error('Cancelled export must not query'); };
  const result = await handlers.get('database:export-csv')(null, { connection: { type: 'sqlite' }, tableName: 'entries' });
  assert.equal(result.canceled, true);
  await assert.rejects(writeCsv(filePath, (async function* () {
    yield 'partial output';
    throw new Error('query failed');
  })()), /query failed/);
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'original');
  assert.deepEqual(fs.readdirSync(directory), ['existing.csv']);
});

test('SQLite drop removes an actual temporary table and preserves the remaining tables', { skip: !hasSqlite }, async (t) => {
  const databasePath = path.join(temporaryDirectory(t), 'drop.sqlite');
  execFileSync('sqlite3', [databasePath, 'CREATE TABLE doomed(id); CREATE TABLE keep(id);']);
  const { context } = harness();
  await context.dropTable({ type: 'sqlite', path: databasePath }, 'doomed');
  const tables = await context.getSqliteTables(databasePath);
  assert.deepEqual(Array.from(tables, (table) => table.name), ['keep']);
});
