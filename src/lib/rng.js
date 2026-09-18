'use strict';

const crypto = require('node:crypto');

/**
 * Dice rolls use crypto.randomInt rather than Math.random. Not because anyone
 * is attacking a D&D bot, but because Math.random is allowed to be a low-period
 * PRNG and players absolutely will notice streaks and accuse the bot of
 * cheating. randomInt is uniform and unbiased (it rejects and retries rather
 * than taking a modulus).
 *
 * Every function here takes an optional `rng` so tests can inject a
 * deterministic sequence.
 */

/** Uniform integer in [min, max] inclusive. */
function randomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) throw new TypeError('randomInt requires integers');
  if (max < min) throw new RangeError('max must be >= min');
  if (max === min) return min;
  return crypto.randomInt(min, max + 1);
}

/** Pick one element of a non-empty array. */
function pick(items, rng = randomInt) {
  if (!Array.isArray(items) || items.length === 0) throw new RangeError('pick requires a non-empty array');
  return items[rng(0, items.length - 1)];
}

/** Pick `count` distinct elements (or all of them, if count is larger). */
function pickMany(items, count, rng = randomInt) {
  const pool = [...items];
  const out = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i += 1) {
    out.push(...pool.splice(rng(0, pool.length - 1), 1));
  }
  return out;
}

/**
 * Pick from `[{ weight, value }]`. Used by the loot tables so "legendary" can
 * be rare without needing a nested roll table.
 */
function weightedPick(entries, rng = randomInt) {
  const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  if (total <= 0) throw new RangeError('weightedPick requires a positive total weight');
  let roll = rng(1, total);
  for (const entry of entries) {
    roll -= entry.weight ?? 1;
    if (roll <= 0) return entry.value ?? entry;
  }
  return entries[entries.length - 1].value ?? entries[entries.length - 1];
}

/** Build a deterministic rng for tests: sequence is consumed then clamped. */
function sequenceRng(values) {
  let i = 0;
  return (min, max) => {
    const raw = values[Math.min(i, values.length - 1)];
    i += 1;
    return Math.min(Math.max(raw, min), max);
  };
}

module.exports = { randomInt, pick, pickMany, weightedPick, sequenceRng };
