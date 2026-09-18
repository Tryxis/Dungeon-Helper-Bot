'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { JsonStore } = require('../src/lib/store');

const silent = { warn() {}, error() {} };

async function tempFile(name = 'store.json') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dhb-'));
  return path.join(dir, name);
}

test('creates the file with defaults when missing', async () => {
  const file = await tempFile();
  const store = new JsonStore(file, { total: 0 }, { logger: silent });
  await store.load();
  assert.deepEqual(store.get(), { total: 0 });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { total: 0 });
});

test('round-trips values through disk', async () => {
  const file = await tempFile();
  const a = new JsonStore(file, { total: 0 }, { logger: silent });
  await a.load();
  a.set('total', 42);
  await a.flush();

  const b = new JsonStore(file, { total: 0 }, { logger: silent });
  await b.load();
  assert.equal(b.get('total'), 42);
});

test('a corrupt file is backed up rather than crashing the bot', async () => {
  const file = await tempFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, '{ this is not json', 'utf8');

  const store = new JsonStore(file, { total: 7 }, { logger: silent });
  await store.load();
  assert.equal(store.get('total'), 7, 'falls back to defaults');

  const siblings = await fs.readdir(path.dirname(file));
  assert.ok(siblings.some((f) => f.includes('corrupt')), 'the bad file is kept for inspection');
});

test('update() mutates and persists', async () => {
  const file = await tempFile();
  const store = new JsonStore(file, { users: {} }, { logger: silent });
  await store.load();
  store.update((data) => {
    data.users.alice = 3;
  });
  await store.flush();
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')).users, { alice: 3 });
});

test('a burst of writes collapses and still lands', async () => {
  const file = await tempFile();
  const store = new JsonStore(file, { n: 0 }, { logger: silent, flushDelayMs: 5 });
  await store.load();
  for (let i = 1; i <= 50; i += 1) store.set('n', i);
  await store.flush();
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).n, 50);
});

test('flushSync writes on exit', async () => {
  const file = await tempFile();
  const store = new JsonStore(file, { n: 0 }, { logger: silent });
  await store.load();
  store.set('n', 99);
  store.close();
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).n, 99);
});
