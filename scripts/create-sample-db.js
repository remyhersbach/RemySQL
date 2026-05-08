const { execFileSync } = require('node:child_process');
const { existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const sampleDir = path.join(__dirname, '..', 'sample');
const samplePath = path.join(sampleDir, 'demo.sqlite');

if (!existsSync(sampleDir)) {
  mkdirSync(sampleDir, { recursive: true });
}

const sql = `
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO customers (id, name, email, city, created_at) VALUES
  (1, 'Noor Janssen', 'noor@example.test', 'Amsterdam', '2026-01-14'),
  (2, 'Mika de Vries', 'mika@example.test', 'Utrecht', '2026-02-03'),
  (3, 'Lena Bakker', 'lena@example.test', 'Rotterdam', '2026-03-19'),
  (4, 'Sam Visser', 'sam@example.test', 'Groningen', '2026-04-02');

INSERT INTO products (id, sku, name, category, price_cents) VALUES
  (1, 'KEY-001', 'Mechanisch toetsenbord', 'Hardware', 12995),
  (2, 'DOCK-240', 'USB-C dock', 'Hardware', 8995),
  (3, 'BOOK-SQL', 'SQL veldgids', 'Boeken', 3295),
  (4, 'MUG-DBA', 'Database mok', 'Merch', 1495);

INSERT INTO orders (id, customer_id, status, ordered_at) VALUES
  (1, 1, 'paid', '2026-04-18 09:20:00'),
  (2, 2, 'open', '2026-04-19 12:42:00'),
  (3, 1, 'shipped', '2026-04-22 16:05:00'),
  (4, 4, 'cancelled', '2026-04-25 08:12:00');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 1, 1, 12995),
  (2, 1, 4, 2, 1495),
  (3, 2, 2, 1, 8995),
  (4, 3, 3, 3, 3295),
  (5, 4, 4, 1, 1495);
`;

execFileSync('sqlite3', [samplePath], { input: sql });
console.log(`Sample database gemaakt: ${samplePath}`);
