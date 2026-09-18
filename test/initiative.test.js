'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const init = require('../src/lib/initiative');

function encounterWith(...entries) {
  const encounter = init.createEncounter();
  for (const entry of entries) init.add(encounter, entry);
  return encounter;
}

test('sorts by initiative, then tiebreak, then name', () => {
  const encounter = encounterWith(
    { name: 'Goblin', initiative: 12, tiebreak: 2 },
    { name: 'Beric', initiative: 20 },
    { name: 'Ada', initiative: 12, tiebreak: 5 },
  );
  assert.deepEqual(encounter.combatants.map((c) => c.name), ['Beric', 'Ada', 'Goblin']);
});

test('duplicate names are numbered rather than merged', () => {
  const encounter = encounterWith(
    { name: 'Goblin', initiative: 10 },
    { name: 'Goblin', initiative: 9 },
    { name: 'Goblin', initiative: 8 },
  );
  assert.deepEqual(encounter.combatants.map((c) => c.name), ['Goblin', 'Goblin 2', 'Goblin 3']);
});

test('turn order cycles and increments the round', () => {
  const encounter = encounterWith(
    { name: 'A', initiative: 20 },
    { name: 'B', initiative: 10 },
  );
  assert.equal(init.start(encounter).name, 'A');
  assert.equal(encounter.round, 1);
  assert.equal(init.next(encounter).name, 'B');
  assert.equal(encounter.round, 1);
  assert.equal(init.next(encounter).name, 'A');
  assert.equal(encounter.round, 2);
});

test('stepping back crosses the round boundary', () => {
  const encounter = encounterWith({ name: 'A', initiative: 20 }, { name: 'B', initiative: 10 });
  init.start(encounter);
  init.next(encounter);
  init.next(encounter); // round 2, A
  assert.equal(init.previous(encounter).name, 'B');
  assert.equal(encounter.round, 1);
});

test('cannot step back past the start of round 1', () => {
  const encounter = encounterWith({ name: 'A', initiative: 20 });
  init.start(encounter);
  assert.throws(() => init.previous(encounter), init.EncounterError);
});

test('adding mid-combat does not move whose turn it is', () => {
  const encounter = encounterWith({ name: 'A', initiative: 20 }, { name: 'C', initiative: 5 });
  init.start(encounter);
  init.next(encounter);
  assert.equal(init.current(encounter).name, 'C');

  init.add(encounter, { name: 'B', initiative: 12 }); // sorts between A and C
  assert.equal(init.current(encounter).name, 'C', 'the active combatant is tracked by id, not index');
});

test('removing the active combatant passes the turn to the next one', () => {
  const encounter = encounterWith(
    { name: 'A', initiative: 20 },
    { name: 'B', initiative: 15 },
    { name: 'C', initiative: 10 },
  );
  init.start(encounter);
  init.next(encounter); // B
  init.remove(encounter, 'B');
  assert.equal(init.current(encounter).name, 'C');
});

test('removing the last combatant in the order wraps and advances the round', () => {
  const encounter = encounterWith({ name: 'A', initiative: 20 }, { name: 'B', initiative: 10 });
  init.start(encounter);
  init.next(encounter); // B, the last in order
  init.remove(encounter, 'B');
  assert.equal(init.current(encounter).name, 'A');
  assert.equal(encounter.round, 2);
});

test('damage floors at zero and marks the combatant down', () => {
  const encounter = encounterWith({ name: 'Goblin', initiative: 10, hp: 7 });
  init.damage(encounter, 'goblin', 99);
  const goblin = init.findCombatant(encounter, 'goblin');
  assert.equal(goblin.hp, 0);
  assert.equal(goblin.down, true);
});

test('healing is capped at maximum HP and revives', () => {
  const encounter = encounterWith({ name: 'Goblin', initiative: 10, hp: 7 });
  init.damage(encounter, 'Goblin', 7);
  init.heal(encounter, 'Goblin', 50);
  const goblin = init.findCombatant(encounter, 'Goblin');
  assert.equal(goblin.hp, 7);
  assert.equal(goblin.down, false);
});

test('an ambiguous name is rejected rather than guessed', () => {
  const encounter = encounterWith({ name: 'Goblin', initiative: 10 }, { name: 'Goblin', initiative: 9 });
  assert.throws(() => init.findCombatant(encounter, 'gob'), init.EncounterError);
  assert.equal(init.findCombatant(encounter, 'Goblin 2').name, 'Goblin 2');
});

test('conditions are a deduplicated sorted set', () => {
  const encounter = encounterWith({ name: 'A', initiative: 10 });
  init.setCondition(encounter, 'A', 'Prone');
  init.setCondition(encounter, 'A', 'Prone');
  init.setCondition(encounter, 'A', 'Blinded');
  assert.deepEqual(init.findCombatant(encounter, 'A').conditions, ['Blinded', 'Prone']);
  init.setCondition(encounter, 'A', 'Prone', false);
  assert.deepEqual(init.findCombatant(encounter, 'A').conditions, ['Blinded']);
});

test('clearing resets the encounter completely', () => {
  const encounter = encounterWith({ name: 'A', initiative: 10 });
  init.start(encounter);
  assert.equal(init.clear(encounter), 1);
  assert.equal(encounter.combatants.length, 0);
  assert.equal(encounter.round, 0);
  assert.equal(encounter.activeId, null);
});

test('the whole encounter survives a JSON round trip', () => {
  const encounter = encounterWith({ name: 'A', initiative: 20, hp: 10 }, { name: 'B', initiative: 5 });
  init.start(encounter);
  init.next(encounter);
  const revived = JSON.parse(JSON.stringify(encounter));
  assert.equal(init.current(revived).name, 'B');
  assert.equal(init.next(revived).name, 'A');
  assert.equal(revived.round, 2);
});
