'use strict';

/**
 * Rules reference.
 *
 * v1 shipped exactly one entry (Sneak Attack) hard-coded into the slash command
 * choice list, which capped the feature at 25 rules forever and meant adding a
 * rule required touching the command definition. Rules now live here, are
 * searched with autocomplete, and are tagged by category so `/rules` can filter.
 *
 * Text is paraphrased from the SRD 5.1 (CC-BY-4.0). See NOTICE.md.
 */

const CATEGORIES = {
  combat: 'Combat',
  actions: 'Actions',
  movement: 'Movement & Position',
  magic: 'Magic',
  exploration: 'Exploration',
  character: 'Character',
};

const rules = [
  {
    name: 'Advantage & Disadvantage',
    aliases: ['advantage', 'disadvantage', 'adv', 'disadv'],
    category: 'combat',
    summary: 'Roll two d20s, take the higher (advantage) or lower (disadvantage).',
    text: [
      'Roll a second d20 and use the higher roll for advantage, or the lower roll for disadvantage.',
      'Advantage and disadvantage are **not cumulative** — no matter how many sources apply, you only ever roll two dice.',
      'If you have both advantage and disadvantage from any source, they cancel out entirely and you roll one d20.',
      'If something lets you reroll or replace a d20 (like Lucky or Elven Accuracy), do that after seeing the result.',
    ],
  },
  {
    name: 'Cover',
    aliases: ['half cover', 'three quarters cover', 'total cover'],
    category: 'combat',
    summary: 'Half cover +2 AC/DEX saves, three-quarters +5, total cover can\'t be targeted.',
    text: [
      '**Half cover** (+2 AC and Dexterity saving throws): an obstacle blocks at least half the target — a low wall, furniture, another creature.',
      '**Three-quarters cover** (+5 AC and Dexterity saving throws): a portcullis, an arrow slit, a thick tree trunk.',
      '**Total cover**: the target is completely concealed and can\'t be targeted directly by an attack or a spell, though area effects may still reach it.',
      'A target only benefits from the most protective degree of cover; the bonuses don\'t stack.',
    ],
  },
  {
    name: 'Critical Hits',
    aliases: ['crit', 'crits', 'critical', 'nat 20'],
    category: 'combat',
    summary: 'Nat 20 always hits. Roll all damage dice twice, add modifiers once.',
    text: [
      'A natural 20 on an attack roll always hits, regardless of AC or modifiers.',
      'Roll all of the attack\'s damage dice **twice** and add them together, then add your modifiers once.',
      'That includes extra dice from Sneak Attack, Divine Smite, or a magic weapon — but not flat bonuses.',
      'A natural 1 on an attack roll always misses. (Natural 1s and 20s on ability checks and saving throws have no special effect in the core rules.)',
    ],
  },
  {
    name: 'Death Saving Throws',
    aliases: ['death saves', 'death save', 'dying', 'downed', 'stabilise', 'stabilize'],
    category: 'combat',
    summary: 'DC 10. Three successes stabilise, three failures kill.',
    text: [
      'At 0 hit points, at the start of each of your turns, roll a d20. This is not affected by any modifier.',
      '**10 or higher** is a success; **9 or lower** is a failure. Three successes means you stabilise; three failures means you die.',
      'The successes and failures do not need to be consecutive, and reset when you regain hit points or stabilise.',
      'A **natural 20** means you regain 1 hit point immediately. A **natural 1** counts as two failures.',
      'Taking any damage while at 0 HP is an automatic failure — two failures if the damage was a critical hit.',
      'Damage equal to or greater than your hit point maximum while at 0 HP kills you outright.',
    ],
  },
  {
    name: 'Opportunity Attacks',
    aliases: ['aoo', 'attack of opportunity', 'opportunity attack'],
    category: 'combat',
    summary: 'One reaction, one melee attack, when a hostile creature leaves your reach.',
    text: [
      'You can make an opportunity attack when a hostile creature you can see moves **out of your reach**.',
      'It costs your reaction and is a single melee attack, made at the moment the creature leaves your reach.',
      'You do not provoke by moving **within** someone\'s reach, by teleporting, or by being moved without using your own movement.',
      'Taking the **Disengage** action means your movement doesn\'t provoke opportunity attacks for the rest of the turn.',
    ],
    see: ['Disengage'],
  },
  {
    name: 'Sneak Attack',
    aliases: ['sneak', 'rogue damage'],
    category: 'combat',
    summary: 'Once per turn: extra damage with a finesse or ranged weapon.',
    text: [
      'Once per turn you can deal extra damage to one creature you hit with an attack, if you have **advantage** on the attack roll.',
      'The attack must use a **finesse** or a **ranged** weapon.',
      "You don't need advantage if another enemy of the target is within 5 feet of it, that enemy isn't incapacitated, and you don't have **disadvantage** on the attack roll.",
      'The extra damage is 1d6 at 1st level, increasing by 1d6 at every odd Rogue level (to 10d6 at 19th).',
      'Once **per turn**, not per round — so you can Sneak Attack on someone else\'s turn with a reaction attack.',
    ],
  },
  {
    name: 'Grappling',
    aliases: ['grapple', 'grappled', 'escape grapple'],
    category: 'combat',
    summary: 'Replace one attack with an Athletics check vs the target\'s Athletics or Acrobatics.',
    text: [
      'When you take the Attack action, you can replace one of your attacks with a grapple attempt.',
      'Make a **Strength (Athletics)** check contested by the target\'s **Strength (Athletics)** or **Dexterity (Acrobatics)** — their choice.',
      'On a success the target gains the **grappled** condition (speed 0).',
      'The target can escape by using its action to repeat the contest and win.',
      'The target must be no more than one size larger than you, and you need at least one free hand.',
      'Moving a grappled creature costs you an extra foot of movement for every foot moved, unless it is two or more sizes smaller.',
    ],
    see: ['Shoving'],
  },
  {
    name: 'Shoving',
    aliases: ['shove', 'push', 'knock prone'],
    category: 'combat',
    summary: 'Replace one attack to knock a creature prone or push it 5 feet.',
    text: [
      'When you take the Attack action, you can replace one of your attacks with a shove.',
      'Make a **Strength (Athletics)** check contested by the target\'s **Strength (Athletics)** or **Dexterity (Acrobatics)**.',
      'On a success you either knock the target **prone** or push it **5 feet** away from you — decide before you roll.',
      'The target must be no more than one size larger than you.',
    ],
    see: ['Grappling'],
  },
  {
    name: 'Two-Weapon Fighting',
    aliases: ['twf', 'dual wield', 'dual wielding', 'offhand', 'off hand'],
    category: 'combat',
    summary: 'Bonus-action offhand attack; no ability modifier to its damage.',
    text: [
      'When you take the **Attack** action and attack with a **light** melee weapon in one hand, you can use your **bonus action** to attack with a different light melee weapon in the other hand.',
      "You don't add your ability modifier to the damage of the bonus attack, unless that modifier is negative.",
      'The Two-Weapon Fighting fighting style removes that restriction.',
      'Because it requires the Attack action, it does not combine with casting a spell as your action.',
    ],
  },
  {
    name: 'Surprise',
    aliases: ['surprised', 'ambush'],
    category: 'combat',
    summary: 'Surprised creatures skip their first turn and can\'t react until it ends.',
    text: [
      'The DM compares each side\'s **Dexterity (Stealth)** checks with the passive **Wisdom (Perception)** of the opposition.',
      "Any creature that doesn't notice a threat is **surprised** at the start of the encounter.",
      "A surprised creature can't move or take an action on its first turn, and can't take a reaction until that turn ends.",
      'Surprise is determined per-creature, not per-side: some of a group may be surprised while others are not.',
    ],
  },
  {
    name: 'Initiative',
    aliases: ['init', 'turn order'],
    category: 'combat',
    summary: 'Dexterity check at the start of combat; ties broken by DM or by Dexterity score.',
    text: [
      'Everyone in combat makes a **Dexterity check** — 1d20 plus their Dexterity modifier — to determine turn order.',
      'The DM ranks combatants from highest to lowest. Ties between monsters and players are decided by the DM; two players tying decide between themselves.',
      'Turn order stays the same from round to round unless something changes it.',
      'Use `/init roll` to add a combatant with the roll made for you.',
    ],
  },
  {
    name: 'Dodge',
    aliases: ['dodging'],
    category: 'actions',
    summary: 'Attacks against you have disadvantage; you have advantage on DEX saves.',
    text: [
      'Until the start of your next turn, any attack roll made against you has **disadvantage** if you can see the attacker, and you make **Dexterity saving throws with advantage**.',
      'You lose this benefit if you are incapacitated or if your speed drops to 0.',
    ],
  },
  {
    name: 'Disengage',
    aliases: ['withdraw'],
    category: 'actions',
    summary: 'Your movement doesn\'t provoke opportunity attacks for the rest of the turn.',
    text: ['Your movement doesn\'t provoke opportunity attacks for the rest of the turn.'],
    see: ['Opportunity Attacks'],
  },
  {
    name: 'Dash',
    aliases: ['run', 'sprint'],
    category: 'actions',
    summary: 'Gain extra movement equal to your speed for this turn.',
    text: [
      'You gain extra movement for the current turn equal to your speed, after applying any modifiers.',
      'With a speed of 30 feet, Dashing gives you 60 feet of movement on that turn.',
    ],
  },
  {
    name: 'Help',
    aliases: ['helping', 'assist'],
    category: 'actions',
    summary: 'Give an ally advantage on a check, or on an attack against someone next to you.',
    text: [
      'You can help another creature with a task: they gain **advantage** on the next ability check they make for it, provided they make it before the start of your next turn.',
      'Alternatively you can distract a creature within 5 feet of you: the next attack roll against that target by one of your allies has **advantage**, again before the start of your next turn.',
      'To help with a task, you must be able to do it yourself — you can\'t help pick a lock if you\'ve never handled thieves\' tools.',
    ],
  },
  {
    name: 'Ready',
    aliases: ['readied action', 'ready an action', 'hold action'],
    category: 'actions',
    summary: 'Pick a trigger and a response; the response uses your reaction.',
    text: [
      'You decide on a **perceivable circumstance** that will trigger your reaction, and the action (or a movement of up to your speed) you will take in response.',
      'When the trigger occurs, you either take your reaction right after the trigger finishes, or ignore it.',
      'Readying a **spell** means casting it now (spending the slot) and holding the energy; you must maintain **concentration** on it until you release it, and it is lost if your concentration breaks.',
      'You can only ready a spell with a casting time of 1 action.',
    ],
    see: ['Concentration'],
  },
  {
    name: 'Concentration',
    aliases: ['concentrating', 'conc', 'lose concentration'],
    category: 'magic',
    summary: 'One spell at a time. DC 10 or half the damage taken, whichever is higher.',
    text: [
      'You can concentrate on only **one** spell at a time. Casting another concentration spell ends the first.',
      'When you take damage, make a **Constitution saving throw** to maintain it: the DC is **10 or half the damage taken, whichever is higher**.',
      'Make a separate save for each source of damage.',
      'Concentration also ends if you are **incapacitated** or killed, and the DM may call for a save in violently distracting situations.',
    ],
  },
  {
    name: 'Counterspell',
    aliases: ['counter spell'],
    category: 'magic',
    summary: 'Reaction. Automatically stops a spell of 3rd level or lower.',
    text: [
      'A reaction taken when you see a creature within 60 feet casting a spell.',
      'If the spell is **3rd level or lower**, it fails automatically.',
      'If it is **4th level or higher**, make an ability check with your spellcasting ability against **DC 10 + the spell\'s level**. On a success, the spell fails.',
      'Casting Counterspell at a higher level raises the automatic threshold to the slot level used.',
      'You must be able to **see** the caster, and the spell must have a visible component for most tables\' reading.',
    ],
  },
  {
    name: 'Spell Components',
    aliases: ['components', 'somatic', 'verbal', 'material', 'free hand'],
    category: 'magic',
    summary: 'V, S, M. A component pouch or focus covers any material without a listed cost.',
    text: [
      '**Verbal (V)** — you must be able to speak. A **silenced** or gagged creature can\'t cast these.',
      '**Somatic (S)** — you need a free hand to perform the gestures. That hand can be the same one holding a material component or focus.',
      '**Material (M)** — a component pouch or spellcasting focus substitutes for any material with **no listed cost**.',
      'A material with a **stated gold value** must be provided specifically, and one that is **consumed** by the spell must be replaced each casting.',
    ],
  },
  {
    name: 'Hiding & Stealth',
    aliases: ['hide', 'stealth', 'hidden', 'sneaking'],
    category: 'exploration',
    summary: 'You need cover or heavy obscurement; your Stealth check is the DC to spot you.',
    text: [
      "You can't hide from a creature that can see you clearly — you need to be **heavily obscured**, behind **total cover**, or otherwise unseen.",
      'Make a **Dexterity (Stealth)** check. That result is the DC for a creature\'s **Wisdom (Perception)** check to notice you, and it is compared against passive Perception for creatures that aren\'t actively searching.',
      'You give away your position if you make noise, attack, or cast a spell with a verbal component.',
      'An unseen attacker has **advantage** on its attack roll; the attack reveals its position.',
    ],
  },
  {
    name: 'Light & Obscurement',
    aliases: ['darkness', 'darkvision', 'obscured', 'dim light', 'vision'],
    category: 'exploration',
    summary: 'Dim light hampers sight; darkness blinds you outright.',
    text: [
      '**Lightly obscured** (dim light, patchy fog, moderate foliage): creatures have **disadvantage** on Wisdom (Perception) checks that rely on sight.',
      '**Heavily obscured** (darkness, opaque fog, dense foliage): a creature is effectively **blinded** when trying to see into that area.',
      '**Darkvision** lets you treat darkness as dim light within its range — so you are still lightly obscured to yourself, and you see only in shades of grey.',
      'Magical darkness blocks darkvision unless a feature says otherwise.',
    ],
    see: ['Blinded'],
  },
  {
    name: 'Falling',
    aliases: ['fall damage', 'fall'],
    category: 'exploration',
    summary: '1d6 bludgeoning per 10 feet, max 20d6, and you land prone.',
    text: [
      'A creature takes **1d6 bludgeoning damage for every 10 feet it falls**, to a maximum of **20d6**.',
      'It lands **prone** unless it avoids taking damage from the fall.',
      'Terminal velocity is reached at 500 feet in one turn, if the DM cares about falls that long.',
    ],
  },
  {
    name: 'Resting',
    aliases: ['short rest', 'long rest', 'rest', 'hit dice'],
    category: 'exploration',
    summary: 'Short rest 1 hour + Hit Dice. Long rest 8 hours, full HP, half your Hit Dice back.',
    text: [
      '**Short rest** — at least **1 hour** of light activity. You may spend any number of **Hit Dice**, rolling each and adding your Constitution modifier, to regain hit points.',
      '**Long rest** — at least **8 hours**, of which at least 6 are sleep and no more than 2 are light activity. You regain **all hit points** and **half your total Hit Dice** (minimum one).',
      'A long rest is interrupted by an hour of walking, fighting, casting spells, or similar strenuous activity, and must be restarted.',
      'You can only benefit from **one long rest per 24 hours**, and you must have at least 1 hit point at the start of it.',
    ],
  },
  {
    name: 'Carrying Capacity',
    aliases: ['encumbrance', 'encumbered', 'carry weight'],
    category: 'character',
    summary: 'Strength × 15 pounds. Variant encumbrance kicks in at ×5 and ×10.',
    text: [
      'Your carrying capacity is your **Strength score × 15** pounds.',
      'You can push, drag or lift up to **twice** that, but your speed drops to 5 feet while doing so.',
      '**Variant — Encumbered**: carrying more than Strength × 5 pounds reduces your speed by 10 feet.',
      '**Variant — Heavily encumbered**: more than Strength × 10 pounds reduces speed by 20 feet and gives disadvantage on attacks, ability checks and saves using Strength, Dexterity or Constitution.',
      'Size matters: Large creatures double these numbers, Tiny creatures halve them.',
    ],
  },
  {
    name: 'Attunement',
    aliases: ['attune', 'attuned', 'magic items'],
    category: 'character',
    summary: 'Short rest to attune; three items at once.',
    text: [
      'Attuning to an item requires a **short rest** spent focused on that item alone, and nothing else.',
      'A creature can be attuned to **no more than three** magic items at a time.',
      'Attunement ends if you no longer satisfy the prerequisites, if the item is more than 100 feet away for 24 hours, if you die, or if another creature attunes to it.',
      'You can end attunement voluntarily by spending another short rest, unless the item is cursed.',
    ],
  },
  {
    name: 'Inspiration',
    aliases: ['inspired'],
    category: 'character',
    summary: 'Spend it for advantage on one roll. You either have it or you don\'t.',
    text: [
      'You can spend inspiration to gain **advantage** on one attack roll, saving throw or ability check.',
      'You either have inspiration or you don\'t — it doesn\'t stack.',
      'You can give your inspiration to another player who you think has earned it.',
      'The DM awards it for playing to your personality traits, ideals, bonds and flaws.',
    ],
  },
  {
    name: 'Resistance & Vulnerability',
    aliases: ['resistance', 'resistant', 'vulnerability', 'vulnerable', 'immunity'],
    category: 'combat',
    summary: 'Halve or double damage, applied once, after everything else.',
    text: [
      'Resistance **halves** the damage; vulnerability **doubles** it.',
      'Multiple sources of resistance to the same damage type do not stack — it is only ever halved once.',
      'Order of operations: apply all modifiers and multipliers first (including critical hit dice), **then** apply resistance, **then** vulnerability.',
      'Round down, and a creature takes a minimum of 0 damage.',
    ],
  },
  {
    name: 'Jumping',
    aliases: ['jump', 'long jump', 'high jump', 'leap'],
    category: 'movement',
    summary: 'Long jump = Strength score in feet; high jump = 3 + STR modifier, with a 10 ft run-up.',
    text: [
      '**Long jump** — with at least 10 feet of running start, you cover a number of feet equal to your **Strength score**. Without the run-up, half that.',
      '**High jump** — with the run-up, you leap **3 + your Strength modifier** feet upward. Without it, half that. You can extend your reach by half your height.',
      'Each foot jumped costs a foot of movement.',
      'The DM may require a DC 10 Strength (Athletics) check to clear a low obstacle mid-jump.',
    ],
  },
  {
    name: 'Difficult Terrain',
    aliases: ['terrain', 'rough terrain'],
    category: 'movement',
    summary: 'Every foot costs two feet of movement. It doesn\'t stack.',
    text: [
      'Moving 1 foot in difficult terrain costs **2 feet** of movement.',
      'Multiple overlapping sources of difficult terrain do **not** stack — the cost is never more than double.',
      'Rubble, thick undergrowth, deep snow, furniture, and the space of another creature (friend or foe) all count.',
      'You can move through a **friendly** creature\'s space freely, and through a hostile one only if it is at least two sizes larger or smaller than you.',
    ],
  },
];

module.exports = { rules, CATEGORIES };
