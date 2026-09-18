'use strict';

/**
 * Roll commentary.
 *
 * The original bank is kept verbatim under `rude` — it's the bot's voice and
 * removing it would be a worse bot. What's new is that it is no longer the only
 * option: `BANTER=clean` swaps in a family-friendly bank for servers where the
 * DM's mum plays, and `BANTER=off` turns commentary off entirely. Each bank is a
 * flat array of strings rather than v1's `[{ response }]`, which existed only to
 * be immediately unwrapped.
 */

const rude = {
  fumble: [
    'Get fucked',
    'What an absolute sickener',
    'Aw yih get facked mayte',
    'Nature is healing',
    'Somewhere, a DM is smiling',
  ],
  bad: [
    "It's bad, and you should feel bad",
    'Well, you tried',
    "Participating isn't for everyone",
    "Don't worry you'll get it next time, sweetie",
    'Bold of you to attempt that',
  ],
  ok: [
    'Not bad, not particularly good',
    'Acceptable',
    'Not completely shit',
    'It will do',
    'Technically a number',
  ],
  good: ['Yes mate', 'Fucking soooound', 'Get in', 'Now we\'re talking', 'Tidy'],
  critical: [
    'NAT 20 - FUCK YEAH',
    'NAT 20 - I AM BECOME GOD',
    'NAT 20 - BEHOLD MY MAJESTY',
    'NAT 20 - THE DICE HAVE SPOKEN AND THEY LOVE YOU',
  ],
};

const clean = {
  fumble: [
    'Oh dear.',
    'The dice have betrayed you.',
    'That is a disaster, and everyone saw it.',
    'Somewhere, a DM is smiling.',
  ],
  bad: [
    'Not your finest work.',
    'Well, you tried.',
    'The attempt was made.',
    "You'll get it next time.",
  ],
  ok: ['Adequate.', 'That will do.', 'Middling, but honest work.', 'Not bad, not great.'],
  good: ['Nicely done.', 'That should do it.', 'Confident stuff.', 'Get in.'],
  critical: [
    'NATURAL 20 — magnificent!',
    'NATURAL 20 — behold your majesty!',
    'NATURAL 20 — the dice have spoken, and they love you.',
  ],
};

const BANKS = { rude, clean };

/**
 * Pick commentary for a d20 result.
 * @param {{natural:number, critical:boolean, fumble:boolean}} d20
 * @param {{mode?: 'rude'|'clean'|'off', pick: Function}} opts
 */
function commentFor(d20, { mode = 'rude', pick }) {
  if (!d20 || mode === 'off') return null;
  const bank = BANKS[mode] ?? rude;
  if (d20.fumble) return pick(bank.fumble);
  if (d20.critical) return pick(bank.critical);
  if (d20.natural < 10) return pick(bank.bad);
  if (d20.natural < 15) return pick(bank.ok);
  return pick(bank.good);
}

module.exports = { BANKS, rude, clean, commentFor };
