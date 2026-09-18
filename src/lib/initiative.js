'use strict';

const { roll } = require('./dice');

/**
 * Initiative / encounter tracker.
 *
 * Deliberately written as pure functions over a plain serialisable object, so
 * the whole encounter state round-trips through JsonStore and the logic is
 * testable without a Discord client anywhere near it.
 *
 * The fiddly part is turn order changing while it's your turn: if someone joins
 * mid-combat, or a dead monster is removed, a naive index-based tracker jumps
 * to the wrong creature. We track the active combatant by id and recompute the
 * index after every mutation.
 */

const MAX_COMBATANTS = 40;

class EncounterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EncounterError';
  }
}

function createEncounter() {
  return {
    combatants: [],
    round: 0,
    activeId: null,
    startedAt: null,
    nextId: 1,
  };
}

/** Initiative desc, then dex tiebreak desc, then name — stable and predictable. */
function sortCombatants(encounter) {
  encounter.combatants.sort(
    (a, b) =>
      b.initiative - a.initiative ||
      (b.tiebreak ?? 0) - (a.tiebreak ?? 0) ||
      a.name.localeCompare(b.name),
  );
  return encounter;
}

function findIndex(encounter, id) {
  return encounter.combatants.findIndex((c) => c.id === id);
}

function activeIndex(encounter) {
  if (!encounter.activeId) return -1;
  return findIndex(encounter, encounter.activeId);
}

function findCombatant(encounter, query) {
  const needle = String(query).toLowerCase().trim();
  const byId = encounter.combatants.find((c) => String(c.id) === needle);
  if (byId) return byId;
  const exact = encounter.combatants.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = encounter.combatants.filter((c) => c.name.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new EncounterError(
      `"${query}" matches ${partial.length} combatants (${partial.map((c) => c.name).join(', ')}). Be more specific.`,
    );
  }
  return null;
}

/** Make "Goblin" unique by appending a number when duplicates exist. */
function uniqueName(encounter, name) {
  const taken = new Set(encounter.combatants.map((c) => c.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  throw new EncounterError(`There are already too many things called "${name}".`);
}

function add(encounter, { name, initiative, tiebreak = 0, hp = null, ac = null, isPC = false }) {
  if (!name || !name.trim()) throw new EncounterError('A combatant needs a name.');
  if (encounter.combatants.length >= MAX_COMBATANTS) {
    throw new EncounterError(`An encounter tops out at ${MAX_COMBATANTS} combatants.`);
  }
  if (!Number.isFinite(initiative)) throw new EncounterError('Initiative must be a number.');

  const combatant = {
    id: encounter.nextId,
    name: uniqueName(encounter, name.trim().slice(0, 64)),
    initiative,
    tiebreak,
    hp: hp === null ? null : Math.max(0, hp),
    maxHp: hp === null ? null : Math.max(0, hp),
    ac,
    isPC,
    conditions: [],
    down: false,
  };
  encounter.nextId += 1;
  encounter.combatants.push(combatant);
  sortCombatants(encounter);
  return combatant;
}

/** Roll initiative for a combatant instead of supplying it. */
function addRolled(encounter, { name, modifier = 0, ...rest }, rng) {
  const result = roll(`1d20${modifier >= 0 ? '+' : ''}${modifier}`, { rng });
  const combatant = add(encounter, { ...rest, name, initiative: result.total, tiebreak: modifier });
  return { combatant, result };
}

function remove(encounter, query) {
  const combatant = findCombatant(encounter, query);
  if (!combatant) throw new EncounterError(`No combatant called "${query}".`);

  const wasActive = encounter.activeId === combatant.id;
  const index = findIndex(encounter, combatant.id);
  encounter.combatants.splice(index, 1);

  if (encounter.combatants.length === 0) {
    encounter.activeId = null;
    encounter.round = 0;
  } else if (wasActive) {
    // The turn passes to whoever now occupies this slot (wrapping to the top,
    // which also advances the round).
    if (index >= encounter.combatants.length) {
      encounter.activeId = encounter.combatants[0].id;
      encounter.round += 1;
    } else {
      encounter.activeId = encounter.combatants[index].id;
    }
  }
  return combatant;
}

function start(encounter) {
  if (encounter.combatants.length === 0) throw new EncounterError('Nobody has rolled initiative yet.');
  sortCombatants(encounter);
  encounter.round = 1;
  encounter.activeId = encounter.combatants[0].id;
  encounter.startedAt = Date.now();
  return current(encounter);
}

function current(encounter) {
  const index = activeIndex(encounter);
  return index === -1 ? null : encounter.combatants[index];
}

function next(encounter) {
  if (encounter.combatants.length === 0) throw new EncounterError('Nobody has rolled initiative yet.');
  if (!encounter.activeId || encounter.round === 0) return start(encounter);

  const index = activeIndex(encounter);
  const nextIndex = (index + 1) % encounter.combatants.length;
  if (nextIndex === 0) encounter.round += 1;
  encounter.activeId = encounter.combatants[nextIndex].id;
  return current(encounter);
}

function previous(encounter) {
  if (encounter.combatants.length === 0) throw new EncounterError('Nobody has rolled initiative yet.');
  const index = activeIndex(encounter);
  if (index <= 0) {
    if (encounter.round <= 1) throw new EncounterError('You\'re already at the top of round 1.');
    encounter.round -= 1;
    encounter.activeId = encounter.combatants[encounter.combatants.length - 1].id;
  } else {
    encounter.activeId = encounter.combatants[index - 1].id;
  }
  return current(encounter);
}

function damage(encounter, query, amount) {
  const combatant = findCombatant(encounter, query);
  if (!combatant) throw new EncounterError(`No combatant called "${query}".`);
  if (combatant.hp === null) throw new EncounterError(`${combatant.name} isn't tracking HP.`);
  combatant.hp = Math.max(0, combatant.hp - amount);
  combatant.down = combatant.hp === 0;
  return combatant;
}

function heal(encounter, query, amount) {
  const combatant = findCombatant(encounter, query);
  if (!combatant) throw new EncounterError(`No combatant called "${query}".`);
  if (combatant.hp === null) throw new EncounterError(`${combatant.name} isn't tracking HP.`);
  combatant.hp = Math.min(combatant.maxHp ?? Infinity, combatant.hp + amount);
  if (combatant.hp > 0) combatant.down = false;
  return combatant;
}

function setCondition(encounter, query, condition, on = true) {
  const combatant = findCombatant(encounter, query);
  if (!combatant) throw new EncounterError(`No combatant called "${query}".`);
  const set = new Set(combatant.conditions);
  if (on) set.add(condition);
  else set.delete(condition);
  combatant.conditions = [...set].sort();
  return combatant;
}

function clear(encounter) {
  const count = encounter.combatants.length;
  Object.assign(encounter, createEncounter());
  return count;
}

module.exports = {
  createEncounter,
  sortCombatants,
  findCombatant,
  add,
  addRolled,
  remove,
  start,
  next,
  previous,
  current,
  activeIndex,
  damage,
  heal,
  setCondition,
  clear,
  EncounterError,
  MAX_COMBATANTS,
};
