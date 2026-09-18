'use strict';

const { randomInt } = require('./rng');

/**
 * Dice notation engine.
 *
 * v1 could only do "N dice of one type, no modifiers", which meant the most
 * common roll in the game — an attack, `1d20+7` — was impossible. This parses
 * real notation:
 *
 *   1d20+5        attack roll
 *   2d6+3         damage
 *   4d6kh3        ability score (keep highest 3 of 4)
 *   2d20kl1       disadvantage, written out
 *   8d6!          exploding dice
 *   1d8+1d6+2     mixed terms
 *
 * Plus `advantage` / `disadvantage` flags, which rewrite a lone d20 into
 * 2d20kh1 / 2d20kl1 so the maths stays in one place.
 */

const LIMITS = {
  maxTerms: 20,
  maxDicePerTerm: 100,
  maxDiceTotal: 200,
  minSides: 2,
  maxSides: 1000,
  maxExplosions: 50,
  maxModifier: 1_000_000,
};

class DiceError extends Error {
  constructor(message, hint) {
    super(message);
    this.name = 'DiceError';
    this.hint = hint;
  }
}

const TERM_PATTERN = /^(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d*))?(!{1,2})?$/;
const CONST_PATTERN = /^\d+$/;

/**
 * Split "2d6+3-1d4" into signed chunks, keeping the sign with its term.
 * @returns {{sign: 1|-1, body: string}[]}
 */
function splitTerms(expression) {
  const chunks = expression.match(/[+-]?[^+-]+/g);
  if (!chunks) throw new DiceError(`I couldn't read "${expression}" as dice.`, 'Try something like `2d6+3`.');
  return chunks.map((chunk) => {
    const sign = chunk.startsWith('-') ? -1 : 1;
    const body = chunk.replace(/^[+-]/, '');
    if (!body) throw new DiceError('That expression has a stray + or -.', 'Try something like `1d20+5`.');
    return { sign, body };
  });
}

/**
 * Parse notation into terms without rolling anything. Exported so the slash
 * command can validate input and give a useful error before deferring.
 */
function parse(notation) {
  if (typeof notation !== 'string') throw new DiceError('No dice given.');
  const cleaned = notation.replace(/\s+/g, '').toLowerCase();
  if (!cleaned) throw new DiceError('No dice given.', 'Try `1d20+5`.');
  if (cleaned.length > 100) throw new DiceError('That expression is far too long.');
  if (/[+-]{2,}/.test(cleaned) || /[+-]$/.test(cleaned)) {
    throw new DiceError('That expression has a stray + or -.', 'Try something like `1d20+5`.');
  }
  if (!/^[0-9dkhl!+-]+$/.test(cleaned)) {
    throw new DiceError(
      `"${notation}" has characters I don't understand.`,
      'Valid notation looks like `2d6+3`, `4d6kh3` or `1d20-1`.',
    );
  }

  const chunks = splitTerms(cleaned);
  if (chunks.length > LIMITS.maxTerms) {
    throw new DiceError(`That's more than ${LIMITS.maxTerms} terms in one roll.`);
  }

  let totalDice = 0;
  const terms = chunks.map(({ sign, body }) => {
    const diceMatch = TERM_PATTERN.exec(body);
    if (diceMatch) {
      const [, rawCount, rawSides, keepMode, rawKeep, bang] = diceMatch;
      const count = rawCount === '' ? 1 : Number(rawCount);
      const sides = Number(rawSides);

      if (count < 1) throw new DiceError('You need to roll at least one die.');
      if (count > LIMITS.maxDicePerTerm) {
        throw new DiceError(`${count} dice is over the ${LIMITS.maxDicePerTerm}-per-term limit.`);
      }
      if (sides < LIMITS.minSides || sides > LIMITS.maxSides) {
        throw new DiceError(`A d${sides} isn't a thing. Sides must be ${LIMITS.minSides}–${LIMITS.maxSides}.`);
      }

      totalDice += count;
      if (totalDice > LIMITS.maxDiceTotal) {
        throw new DiceError(`That's more than ${LIMITS.maxDiceTotal} dice in one roll.`);
      }

      let keep = null;
      if (keepMode) {
        const amount = rawKeep === '' ? 1 : Number(rawKeep);
        if (amount < 1) throw new DiceError(`\`${keepMode}0\` doesn't make sense.`);
        if (amount >= count && (keepMode === 'kh' || keepMode === 'kl')) {
          throw new DiceError(`You can't keep ${amount} of only ${count} dice.`);
        }
        if (amount >= count && (keepMode === 'dh' || keepMode === 'dl')) {
          throw new DiceError(`You can't drop ${amount} of only ${count} dice.`);
        }
        keep = { mode: keepMode, amount };
      }

      return { type: 'dice', sign, count, sides, keep, explode: bang ? bang.length : 0 };
    }

    if (CONST_PATTERN.test(body)) {
      const value = Number(body);
      if (value > LIMITS.maxModifier) throw new DiceError('That modifier is absurd.');
      return { type: 'constant', sign, value };
    }

    throw new DiceError(`I couldn't read "${body}".`, 'Valid notation looks like `2d6+3` or `4d6kh3`.');
  });

  if (!terms.some((t) => t.type === 'dice')) {
    throw new DiceError('That has no dice in it.', 'Try `1d20+5` rather than just a number.');
  }

  return terms;
}

/** Roll one term's dice, honouring exploding dice. */
function rollDice(term, rng) {
  const rolls = [];
  for (let i = 0; i < term.count; i += 1) {
    let value = rng(1, term.sides);
    const die = { value, exploded: false };
    if (term.explode) {
      let explosions = 0;
      // `!` explodes only on the max face; `!!` (compounding) does too, but
      // adds into the same die rather than adding new dice.
      while (value === term.sides && explosions < LIMITS.maxExplosions) {
        value = rng(1, term.sides);
        die.value += value;
        die.exploded = true;
        explosions += 1;
      }
    }
    rolls.push(die);
  }
  return rolls;
}

/** Decide which rolled dice count toward the total. */
function applyKeep(rolls, keep) {
  if (!keep) return rolls.map((r, index) => ({ ...r, index, kept: true }));

  const indexed = rolls.map((r, index) => ({ ...r, index }));
  const byValueDesc = [...indexed].sort((a, b) => b.value - a.value || a.index - b.index);

  let keptIndexes;
  switch (keep.mode) {
    case 'kh':
      keptIndexes = new Set(byValueDesc.slice(0, keep.amount).map((r) => r.index));
      break;
    case 'kl':
      keptIndexes = new Set(byValueDesc.slice(-keep.amount).map((r) => r.index));
      break;
    case 'dh':
      keptIndexes = new Set(byValueDesc.slice(keep.amount).map((r) => r.index));
      break;
    case 'dl':
      keptIndexes = new Set(byValueDesc.slice(0, byValueDesc.length - keep.amount).map((r) => r.index));
      break;
    default:
      keptIndexes = new Set(indexed.map((r) => r.index));
  }

  return indexed.map((r) => ({ ...r, kept: keptIndexes.has(r.index) }));
}

/**
 * Rewrite a lone `1d20` into `2d20kh1`/`2d20kl1` for advantage/disadvantage.
 * Returns the (possibly unchanged) terms plus whether it applied.
 */
function applyAdvantage(terms, { advantage = false, disadvantage = false } = {}) {
  if (advantage && disadvantage) {
    // They cancel in 5e, and saying so is friendlier than picking one.
    return { terms, applied: 'cancelled' };
  }
  if (!advantage && !disadvantage) return { terms, applied: null };

  const d20Terms = terms.filter((t) => t.type === 'dice' && t.sides === 20 && !t.keep);
  if (d20Terms.length !== 1 || d20Terms[0].count !== 1) {
    return { terms, applied: 'unavailable' };
  }

  const mode = advantage ? 'kh' : 'kl';
  const rewritten = terms.map((t) =>
    t === d20Terms[0] ? { ...t, count: 2, keep: { mode, amount: 1 } } : t,
  );
  return { terms: rewritten, applied: advantage ? 'advantage' : 'disadvantage' };
}

function formatTerm(term, result) {
  if (term.type === 'constant') return String(term.value);
  const keepSuffix = term.keep ? `${term.keep.mode}${term.keep.amount}` : '';
  const label = `${term.count}d${term.sides}${keepSuffix}${'!'.repeat(term.explode)}`;
  const dice = result.rolls
    .map((r) => {
      const value = r.exploded ? `${r.value}💥` : `${r.value}`;
      return r.kept ? value : `~~${value}~~`;
    })
    .join(', ');
  return `${label} (${dice})`;
}

/**
 * Roll a notation string.
 *
 * @param {string} notation
 * @param {{advantage?: boolean, disadvantage?: boolean, rng?: Function}} [opts]
 */
function roll(notation, opts = {}) {
  const rng = opts.rng ?? randomInt;
  const parsed = parse(notation);
  const { terms, applied } = applyAdvantage(parsed, opts);

  let total = 0;
  const results = terms.map((term) => {
    if (term.type === 'constant') {
      total += term.sign * term.value;
      return { term, subtotal: term.value, rolls: [] };
    }
    const rolls = applyKeep(rollDice(term, rng), term.keep);
    const subtotal = rolls.reduce((sum, r) => (r.kept ? sum + r.value : sum), 0);
    total += term.sign * subtotal;
    return { term, subtotal, rolls };
  });

  // Crit/fumble only means anything on a single d20 check, which is exactly
  // where v1's flavour responses fired. Advantage keeps that working because
  // we look at the die that was *kept*.
  let d20 = null;
  const d20Result = results.find((r) => r.term.type === 'dice' && r.term.sides === 20);
  const isSingleD20 =
    d20Result &&
    results.filter((r) => r.term.type === 'dice').length === 1 &&
    d20Result.rolls.filter((r) => r.kept).length === 1;
  if (isSingleD20) {
    const natural = d20Result.rolls.find((r) => r.kept).value;
    d20 = { natural, critical: natural === 20, fumble: natural === 1 };
  }

  const breakdown = results
    .map((r, i) => {
      const sign = r.term.sign === -1 ? ' - ' : i === 0 ? '' : ' + ';
      return `${sign}${formatTerm(r.term, r)}`;
    })
    .join('');

  return {
    notation,
    normalised: terms
      .map((t, i) => {
        const sign = t.sign === -1 ? ' - ' : i === 0 ? '' : ' + ';
        const body =
          t.type === 'constant'
            ? String(t.value)
            : `${t.count}d${t.sides}${t.keep ? `${t.keep.mode}${t.keep.amount}` : ''}${'!'.repeat(t.explode)}`;
        return `${sign}${body}`;
      })
      .join(''),
    total,
    breakdown,
    results,
    advantageState: applied,
    d20,
  };
}

/** Roll a simple `NdS` without notation — used by the loot/HP helpers. */
function rollSimple(count, sides, rng = randomInt) {
  let total = 0;
  for (let i = 0; i < count; i += 1) total += rng(1, sides);
  return total;
}

module.exports = { roll, parse, rollSimple, DiceError, LIMITS };
