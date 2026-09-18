'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalise, search, findExact, score } = require('../src/lib/search');

const items = [
  { name: 'Fireball' },
  { name: 'Fire Bolt' },
  { name: 'Wall of Fire' },
  { name: 'Mage Hand' },
  { name: "Melf's Acid Arrow" },
  { name: 'Cure Wounds' },
];

test('normalise strips case, punctuation and accents', () => {
  assert.equal(normalise("Melf's Acid Arrow"), 'melfs acid arrow');
  assert.equal(normalise('Faerie Fire'), 'faerie fire');
  assert.equal(normalise('  FIREBALL '), 'fireball');
});

test('exact match outranks everything', () => {
  assert.equal(search('Fireball', items)[0].name, 'Fireball');
});

test('search is case-insensitive on BOTH sides', () => {
  // This is the v1 bug: the needle was never lower-cased, so any capital
  // letter in the query silently matched nothing.
  assert.equal(search('FIRE', items).length, 3);
  assert.equal(search('Fire', items).length, 3);
  assert.equal(search('fire', items).length, 3);
});

test('prefix beats mid-string', () => {
  const results = search('fire', items).map((i) => i.name);
  assert.ok(results.indexOf('Fireball') < results.indexOf('Wall of Fire'));
});

test('tolerates a typo', () => {
  assert.equal(search('firebal', items)[0].name, 'Fireball');
  assert.equal(search('cure wonds', items)[0].name, 'Cure Wounds');
});

test('matches words in any order', () => {
  assert.equal(search('hand mage', items)[0].name, 'Mage Hand');
});

test('returns nothing for genuine non-matches', () => {
  assert.equal(search('zzzzzz', items).length, 0);
});

test('respects the limit', () => {
  assert.equal(search('', items, { limit: 2 }).length, 2);
});

test('findExact ignores case and punctuation', () => {
  assert.equal(findExact('melfs acid arrow', items).name, "Melf's Acid Arrow");
  assert.equal(findExact('nope', items), null);
});

test('score returns 0 for no match and a positive number otherwise', () => {
  assert.equal(score('xyz', 'Fireball'), 0);
  assert.ok(score('fireball', 'Fireball') > 0);
});

test('aliases are searchable, and the real name still wins', () => {
  const withAliases = [
    { name: 'Death Saving Throws', aliases: ['death saves', 'dying'] },
    { name: 'Opportunity Attacks', aliases: ['aoo', 'attack of opportunity'] },
    { name: 'Dying Light' },
  ];
  assert.equal(search('death saves', withAliases)[0].name, 'Death Saving Throws');
  assert.equal(search('aoo', withAliases)[0].name, 'Opportunity Attacks');
  assert.equal(findExact('dying', withAliases).name, 'Death Saving Throws');
  assert.equal(search('dying light', withAliases)[0].name, 'Dying Light', 'an exact name beats an alias');
});
