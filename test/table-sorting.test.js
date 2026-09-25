const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Exercise the real query builders, replacing only database I/O and Electron.
function harness(columns) {
  const filename = path.resolve(__dirname, '../src/main.js');
  const localRequire = createRequire(filename);
  const electron = {
    app: { whenReady: () => ({ then() {} }), on() {} },
    ipcMain: { handle() {} }
  };
  const context = vm.createContext({
    require: (id) => id === 'electron' ? electron : localRequire(id),
    __dirname: path.dirname(filename), Buffer, process, console, setTimeout, clearTimeout, URL
  });
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  context.getSqliteColumns = context.getMariaColumns = async () => columns;
  const queries = [];
  context.runSqlite = context.runMariaDb = async (_, query, values) => {
    queries.push({ query, values });
    return [];
  };
  return { context, queries };
}

for (const driver of ['sqlite', 'mariadb']) {
  const quote = (value) => driver === 'sqlite' ? `"${value}"` : `\`${value}\``;
  const load = (h, sort, columnFilter = null) => driver === 'sqlite'
    ? h.context.getSqliteData('unused', 'articles', '', 2, columnFilter, sort)
    : h.context.getMariaData({}, 'articles', '', 2, columnFilter, sort);

  test(`${driver}: default primary key DESC is applied before LIMIT`, async () => {
    const h = harness([{ name: 'title', pk: 0 }, { name: 'id', pk: 1 }]);
    const result = await load(h);
    assert.match(result.query, new RegExp(`ORDER BY ${quote('id')} DESC LIMIT 2;`));
    assert.equal(JSON.stringify(result.sorts), JSON.stringify([{ column: 'id', direction: 'desc' }]));
    assert.equal(h.queries.length, 1);
  });

  test(`${driver}: composite primary key follows key order, not column order`, async () => {
    const h = harness([{ name: 'part', pk: 2 }, { name: 'title', pk: 0 }, { name: 'group_id', pk: 1 }]);
    const result = await load(h);
    assert.ok(result.query.includes(`ORDER BY ${quote('group_id')} DESC, ${quote('part')} DESC LIMIT 2;`));
  });

  test(`${driver}: tables without primary keys have no default ORDER BY`, async () => {
    const h = harness([{ name: 'title', pk: 0 }]);
    const result = await load(h);
    assert.doesNotMatch(result.query, /ORDER BY/);
    assert.equal(result.sorts.length, 0);
  });

  test(`${driver}: user sorting and explicit no-sort override the default`, async () => {
    const h = harness([{ name: 'id', pk: 1 }, { name: 'title', pk: 0 }]);
    const result = await load(h, { column: 'title', direction: 'asc' });
    assert.ok(result.query.includes(`ORDER BY ${quote('title')} ASC LIMIT 2;`));
    assert.doesNotMatch((await load(h, null)).query, /ORDER BY/);
    assert.doesNotMatch((await load(h, { column: 'missing', direction: 'desc' })).query, /ORDER BY/);
  });

  test(`${driver}: column filters combine with the default sort`, async () => {
    const h = harness([{ name: 'id', pk: 1 }, { name: 'title', pk: 0 }]);
    const result = await load(h, undefined, [{ column: 'title', operator: '=', value: 'hello' }]);
    assert.ok(result.query.includes(`WHERE ${quote('title')} = 'hello' ORDER BY ${quote('id')} DESC LIMIT 2;`));
    if (driver === 'mariadb') {
      assert.ok(h.queries[0].query.includes(`WHERE ${quote('title')} = ?`));
      assert.equal(h.queries[0].values[0], 'hello');
    }
  });
}
