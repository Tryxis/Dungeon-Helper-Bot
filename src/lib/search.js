'use strict';

/**
 * Small ranked search used for spell/condition/rule lookup and autocomplete.
 *
 * v1 had two bugs here worth naming, because they're the reason this file
 * exists:
 *   1. the fallback used `spell.name.toLowerCase().includes(spellName)` — the
 *      needle was never lower-cased, so searching "Fire" found nothing;
 *   2. there was no ranking, so "fire" listed 30 spells in one message and blew
 *      past Discord's 2000-character limit.
 */

/** Strip case, accents and punctuation so "mage's hand" matches "Mage Hand". */
function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Apostrophes are dropped rather than turned into a space, so "Melf's Acid
    // Arrow" and "melfs acid arrow" are the same string.
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance, capped so a long mismatch bails out early. */
function editDistance(a, b, max = 4) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Score a candidate against a query. Higher is better; 0 means no match.
 * Exact > prefix > word-prefix > substring > fuzzy.
 */
function score(query, candidate) {
  const q = normalise(query);
  const c = normalise(candidate);
  if (!q) return 1; // empty query: everything matches equally (autocomplete open state)
  if (q === c) return 1000;
  if (c.startsWith(q)) return 800 - c.length;
  if (c.split(' ').some((word) => word.startsWith(q))) return 600 - c.length;
  if (c.includes(q)) return 400 - c.length;

  const distance = editDistance(q, c, q.length <= 4 ? 1 : 2);
  if (distance <= (q.length <= 4 ? 1 : 2)) return 200 - distance * 10;

  // Last resort: every query word appears somewhere ("hand mage" -> Mage Hand).
  const words = q.split(' ').filter(Boolean);
  if (words.length > 1 && words.every((w) => c.includes(w))) return 300 - c.length;

  return 0;
}

/**
 * Every string an item can be found by: its name plus any aliases. Aliases are
 * what make `/rules death saves` find "Death Saving Throws", and `/rules aoo`
 * find "Opportunity Attacks" — the names people actually say at the table.
 */
function keysFor(item, key) {
  const primary = key(item);
  const aliases = Array.isArray(item?.aliases) ? item.aliases : [];
  return [primary, ...aliases];
}

/**
 * Rank `items` against `query`.
 * @param {string} query
 * @param {Array} items
 * @param {{key?: (item:any)=>string, limit?: number, filter?: (item:any)=>boolean}} opts
 */
function search(query, items, { key = (i) => i.name, limit = 25, filter } = {}) {
  const pool = filter ? items.filter(filter) : items;
  const scored = [];
  for (const item of pool) {
    // An alias match scores slightly below the same match on the real name, so
    // a direct hit always wins.
    const value = keysFor(item, key).reduce(
      (best, candidate, index) => Math.max(best, score(query, candidate) - (index === 0 ? 0 : 5)),
      0,
    );
    if (value > 0) scored.push({ item, value, name: key(item) });
  }
  scored.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map((s) => s.item);
}

/** Find one exact (normalised) match on a name or alias, or null. */
function findExact(query, items, key = (i) => i.name) {
  const q = normalise(query);
  return items.find((item) => keysFor(item, key).some((candidate) => normalise(candidate) === q)) ?? null;
}

module.exports = { normalise, editDistance, score, search, findExact };
