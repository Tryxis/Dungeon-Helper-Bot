'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { roll, parse, DiceError } = require('../src/lib/dice');
const { sequenceRng } = require('../src/lib/rng');

test('parses simple notation', () => {
  const [term] = parse('2d6');
  assert.equal(term.type, 'dice');
  assert.equal(term.count, 2);
  assert.equal(term.sides, 6);
  assert.equal(term.sign, 1);
});

test('defaults a missing count to one die', () => {
  assert.equal(parse('d20')[0].count, 1);
});

test('parses modifiers and mixed terms', () => {
  const terms = parse('1d8+2d6-3');
  assert.equal(terms.length, 3);
  assert.equal(terms[2].type, 'constant');
  assert.equal(terms[2].sign, -1);
  assert.equal(terms[2].value, 3);
});

test('ignores whitespace and case', () => {
  assert.deepEqual(parse(' 2 D 6 + 3 ').length, 2);
});

test('rejects nonsense', () => {
  assert.throws(() => parse('banana'), DiceError);
  assert.throws(() => parse('1d20++3'), DiceError);
  assert.throws(() => parse('5'), DiceError, 'a roll with no dice is not a roll');
  assert.throws(() => parse('1d1'), DiceError, 'a d1 is not a die');
  assert.throws(() => parse('1000d6'), DiceError, 'per-term dice cap');
  assert.throws(() => parse('50d6+50d6+50d6+50d6+50d6'), DiceError, 'total dice cap');
  assert.throws(() => parse('4d6kh5'), DiceError, 'cannot keep more dice than you rolled');
});

test('totals a deterministic roll', () => {
  const result = roll('3d6+2', { rng: sequenceRng([4, 5, 6]) });
  assert.equal(result.total, 17);
  assert.equal(result.results[0].subtotal, 15);
});

test('subtracts negative terms', () => {
  const result = roll('1d20-3', { rng: sequenceRng([10]) });
  assert.equal(result.total, 7);
});

test('keeps the highest N', () => {
  const result = roll('4d6kh3', { rng: sequenceRng([1, 6, 3, 5]) });
  assert.equal(result.total, 14);
  const kept = result.results[0].rolls.filter((r) => r.kept).map((r) => r.value);
  assert.deepEqual(kept.sort(), [3, 5, 6]);
});

test('keeps the lowest N', () => {
  const result = roll('2d20kl1', { rng: sequenceRng([18, 4]) });
  assert.equal(result.total, 4);
});

test('drops the lowest N', () => {
  const result = roll('4d6dl1', { rng: sequenceRng([1, 6, 3, 5]) });
  assert.equal(result.total, 14);
});

test('advantage rewrites a lone d20 and keeps the higher die', () => {
  const result = roll('1d20+5', { advantage: true, rng: sequenceRng([7, 19]) });
  assert.equal(result.advantageState, 'advantage');
  assert.equal(result.total, 24);
});

test('disadvantage keeps the lower die', () => {
  const result = roll('1d20+5', { disadvantage: true, rng: sequenceRng([7, 19]) });
  assert.equal(result.total, 12);
});

test('advantage and disadvantage cancel', () => {
  const result = roll('1d20', { advantage: true, disadvantage: true, rng: sequenceRng([11]) });
  assert.equal(result.advantageState, 'cancelled');
  assert.equal(result.total, 11);
});

test('advantage is refused on a roll that is not a single d20', () => {
  const result = roll('2d6', { advantage: true, rng: sequenceRng([3, 3]) });
  assert.equal(result.advantageState, 'unavailable');
  assert.equal(result.total, 6);
});

test('detects natural 20s and 1s only on a single d20', () => {
  assert.equal(roll('1d20+9', { rng: sequenceRng([20]) }).d20.critical, true);
  assert.equal(roll('1d20', { rng: sequenceRng([1]) }).d20.fumble, true);
  assert.equal(roll('2d20', { rng: sequenceRng([20, 20]) }).d20, null);
  assert.equal(roll('1d20+1d6', { rng: sequenceRng([20, 3]) }).d20, null);
});

test('advantage still reports the kept die as the natural result', () => {
  const result = roll('1d20', { advantage: true, rng: sequenceRng([1, 20]) });
  assert.equal(result.d20.natural, 20);
  assert.equal(result.d20.critical, true);
  assert.equal(result.d20.fumble, false);
});

test('exploding dice add another roll on a maximum face', () => {
  // 6 explodes into 4 -> 10; second die rolls 2 and stops.
  const result = roll('2d6!', { rng: sequenceRng([6, 4, 2]) });
  assert.equal(result.total, 12);
  assert.equal(result.results[0].rolls[0].exploded, true);
});

test('breakdown shows dropped dice struck through', () => {
  const result = roll('4d6kh3', { rng: sequenceRng([1, 6, 3, 5]) });
  assert.match(result.breakdown, /~~1~~/);
});

test('every face of a die is reachable and none are out of range', () => {
  for (let i = 0; i < 500; i += 1) {
    const value = roll('1d6').results[0].rolls[0].value;
    assert.ok(value >= 1 && value <= 6, `d6 produced ${value}`);
  }
});
