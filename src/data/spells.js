'use strict';

const path = require('node:path');
const fs = require('node:fs');

/**
 * Spell data, loaded and indexed **once** at startup.
 *
 * v1 called `fs.readFileSync('spells.json')` inside the interaction handler, so
 * every `/spell` re-read and re-parsed a megabyte of JSON synchronously,
 * blocking the event loop for every other user. It also used a relative path,
 * so the bot only worked when launched from the repo root.
 */

const SPELL_FILE = path.join(__dirname, 'spells.json');

const LEVEL_LABELS = {
  0: 'Cantrip',
  1: '1st level',
  2: '2nd level',
  3: '3rd level',
  4: '4th level',
  5: '5th level',
  6: '6th level',
  7: '7th level',
  8: '8th level',
  9: '9th level',
};

function normaliseLevel(raw) {
  if (raw === 'cantrip' || raw === 0 || raw === '0') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function titleCase(value) {
  return String(value ?? '')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function normaliseSpell(raw) {
  const level = normaliseLevel(raw.level);
  return {
    ...raw,
    level,
    levelLabel: LEVEL_LABELS[level] ?? `Level ${level}`,
    school: titleCase(raw.school),
    classes: Array.isArray(raw.classes) ? raw.classes : [],
    componentsText: raw.components?.raw ?? '—',
    concentration: /concentration/i.test(raw.duration ?? ''),
    ritual: Boolean(raw.ritual),
    higherLevels: raw.higher_levels ?? raw.higherLevels ?? null,
  };
}

function loadSpells(file = SPELL_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(raw)) throw new Error(`${file} should contain an array of spells.`);
  return raw.map(normaliseSpell).sort((a, b) => a.name.localeCompare(b.name));
}

class SpellBook {
  constructor(spells) {
    this.spells = spells;
    this.classes = [...new Set(spells.flatMap((s) => s.classes))].sort();
    this.schools = [...new Set(spells.map((s) => s.school))].sort();
    this.levels = [...new Set(spells.map((s) => s.level))].sort((a, b) => a - b);
  }

  static load(file) {
    return new SpellBook(loadSpells(file));
  }

  get size() {
    return this.spells.length;
  }

  /** @param {{level?: number, school?: string, class?: string, ritual?: boolean, concentration?: boolean}} filters */
  filter(filters = {}) {
    return this.spells.filter((spell) => {
      if (filters.level !== undefined && filters.level !== null && spell.level !== filters.level) return false;
      if (filters.school && spell.school.toLowerCase() !== String(filters.school).toLowerCase()) return false;
      if (filters.class && !spell.classes.includes(String(filters.class).toLowerCase())) return false;
      if (filters.ritual === true && !spell.ritual) return false;
      if (filters.concentration === true && !spell.concentration) return false;
      return true;
    });
  }
}

module.exports = { SpellBook, loadSpells, LEVEL_LABELS, SPELL_FILE };
