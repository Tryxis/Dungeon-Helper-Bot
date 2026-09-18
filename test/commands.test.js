'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadCommands } = require('../src/handlers/commandLoader');
const { SpellBook } = require('../src/data/spells');
const { conditions } = require('../src/data/conditions');
const { rules } = require('../src/data/rules');
const embeds = require('../src/lib/embeds');

const silent = { warn() {}, debug() {}, info() {}, error() {} };
const commands = loadCommands(path.join(__dirname, '..', 'src', 'commands'), silent);

test('every command module loads with data and execute', () => {
  assert.ok(commands.size >= 8, `expected at least 8 commands, found ${commands.size}`);
  for (const [name, command] of commands) {
    assert.equal(typeof command.execute, 'function', `/${name} has no execute`);
    assert.ok(command.data.toJSON, `/${name} has no builder`);
  }
});

test('all command definitions serialise to valid Discord JSON', () => {
  for (const [name, command] of commands) {
    const json = command.data.toJSON();
    assert.match(json.name, /^[-_\p{L}\p{N}]{1,32}$/u, `/${name} has an invalid name`);
    assert.ok(json.description.length > 0 && json.description.length <= 100, `/${name} description length`);

    for (const option of json.options ?? []) {
      assert.ok(option.description.length <= 100, `/${name} ${option.name} description too long`);
      for (const nested of option.options ?? []) {
        assert.ok(nested.description.length <= 100, `/${name} ${option.name} ${nested.name} description too long`);
        assert.ok((nested.choices ?? []).length <= 25, `/${name} ${nested.name} has more than 25 choices`);
      }
      assert.ok((option.choices ?? []).length <= 25, `/${name} ${option.name} has more than 25 choices`);
    }
  }
});

test('a command that offers autocomplete actually implements it', () => {
  for (const [name, command] of commands) {
    const json = command.data.toJSON();
    const hasAutocompleteOption = JSON.stringify(json).includes('"autocomplete":true');
    if (hasAutocompleteOption) {
      assert.equal(typeof command.autocomplete, 'function', `/${name} declares autocomplete but doesn't implement it`);
    }
  }
});

test('the spell file loads and is indexed', () => {
  const book = SpellBook.load();
  assert.ok(book.size > 300, `expected a few hundred spells, got ${book.size}`);
  const fireball = book.spells.find((s) => s.name === 'Fireball');
  assert.ok(fireball, 'Fireball should exist');
  assert.equal(fireball.level, 3);
  assert.ok(book.classes.includes('wizard'));
  assert.ok(book.filter({ class: 'druid', level: 1 }).length > 0);
  assert.equal(book.filter({ ritual: true }).every((s) => s.ritual), true);
});

test('spell text always fits inside Discord embed limits', () => {
  const book = SpellBook.load();
  for (const spell of book.spells) {
    for (const piece of embeds.chunk(spell.description)) {
      assert.ok(piece.length <= embeds.LIMITS.fieldValue, `${spell.name} chunk is ${piece.length} chars`);
    }
    assert.ok(embeds.truncate(spell.name, embeds.LIMITS.title).length <= embeds.LIMITS.title);
  }
});

test('all 15 conditions are present and well-formed', () => {
  assert.equal(conditions.length, 15, 'v1 was missing Exhaustion');
  for (const condition of conditions) {
    assert.ok(condition.summary.length <= 100, `${condition.name} summary must fit an autocomplete label`);
    assert.ok(condition.effects.length > 0);
  }
});

test('rules entries are well-formed and categorised', () => {
  const categories = new Set(['combat', 'actions', 'movement', 'magic', 'exploration', 'character']);
  assert.ok(rules.length >= 25, `expected a real library, got ${rules.length}`);
  for (const rule of rules) {
    assert.ok(categories.has(rule.category), `${rule.name} has an unknown category`);
    assert.ok(rule.text.length > 0, `${rule.name} has no text`);
    assert.ok(`${rule.name} — ${rule.summary}`.length <= 100, `${rule.name} label won't fit autocomplete`);
  }
});

test('no two rules or conditions share a name', () => {
  const names = [...rules.map((r) => r.name), ...conditions.map((c) => c.name)];
  assert.equal(new Set(names).size, names.length);
});

test('the phrases people actually type all resolve to a rule or condition', () => {
  const { search } = require('../src/lib/search');
  const phrases = [
    ['death saves', 'Death Saving Throws'],
    ['aoo', 'Opportunity Attacks'],
    ['crit', 'Critical Hits'],
    ['twf', 'Two-Weapon Fighting'],
    ['short rest', 'Resting'],
    ['fall damage', 'Falling'],
    ['encumbrance', 'Carrying Capacity'],
    ['hold action', 'Ready'],
    ['darkvision', 'Light & Obscurement'],
  ];
  for (const [phrase, expected] of phrases) {
    assert.equal(search(phrase, rules)[0]?.name, expected, `"${phrase}" should find ${expected}`);
  }

  const conditionPhrases = [
    ['knocked out', 'Unconscious'],
    ['fear', 'Frightened'],
    ['webbed', 'Restrained'],
    ['paralysed', 'Paralyzed'],
  ];
  for (const [phrase, expected] of conditionPhrases) {
    assert.equal(search(phrase, conditions)[0]?.name, expected, `"${phrase}" should find ${expected}`);
  }
});
