'use strict';

/**
 * The 5e conditions. Unchanged in substance from v1 — it had them right — but
 * Exhaustion was missing, the descriptions are now split into bullet points
 * where the rules are a list, and each entry carries `see` cross-references so
 * "Paralyzed" can point you at "Incapacitated".
 */

const conditions = [
  {
    name: 'Blinded',
    aliases: ['blind', 'blindness'],
    summary: "Can't see. Attacked at advantage, attacks at disadvantage.",
    effects: [
      "A blinded creature can't see and automatically fails any ability check that requires sight.",
      "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
    ],
  },
  {
    name: 'Charmed',
    aliases: ['charm'],
    summary: "Can't attack the charmer; the charmer has social advantage.",
    effects: [
      "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
      'The charmer has advantage on any ability check to interact socially with the creature.',
    ],
  },
  {
    name: 'Deafened',
    aliases: ['deaf'],
    summary: "Can't hear. Automatically fails hearing checks.",
    effects: ["A deafened creature can't hear and automatically fails any ability check that requires hearing."],
  },
  {
    name: 'Exhaustion',
    aliases: ['exhausted', 'tired', 'levels of exhaustion'],
    summary: 'Six cumulative levels, from disadvantage on checks up to death.',
    effects: [
      '**Level 1** — Disadvantage on ability checks.',
      '**Level 2** — Speed halved.',
      '**Level 3** — Disadvantage on attack rolls and saving throws.',
      '**Level 4** — Hit point maximum halved.',
      '**Level 5** — Speed reduced to 0.',
      '**Level 6** — Death.',
      'Effects are cumulative: a creature with level 3 suffers levels 1–3.',
      'Finishing a long rest reduces exhaustion by 1, provided the creature has also had food and drink.',
    ],
  },
  {
    name: 'Frightened',
    aliases: ['fear', 'afraid', 'scared'],
    summary: 'Disadvantage while it can see the source of its fear, and it can\'t approach.',
    effects: [
      'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.',
      "The creature can't willingly move closer to the source of its fear.",
    ],
  },
  {
    name: 'Grappled',
    aliases: ['grapple'],
    summary: 'Speed 0. Ends if the grappler is incapacitated.',
    effects: [
      "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
      'The condition ends if the grappler is incapacitated.',
      'The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect.',
    ],
    see: ['Incapacitated'],
  },
  {
    name: 'Incapacitated',
    aliases: ['incapacitate'],
    summary: "Can't take actions or reactions.",
    effects: ["An incapacitated creature can't take actions or reactions."],
  },
  {
    name: 'Invisible',
    aliases: ['invisibility', 'unseen'],
    summary: 'Unseen: attacked at disadvantage, attacks at advantage.',
    effects: [
      'An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured.',
      "The creature's location can be detected by any noise it makes or any tracks it leaves.",
      "Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.",
    ],
  },
  {
    name: 'Paralyzed',
    aliases: ['paralysed', 'paralysis', 'hold person'],
    summary: 'Incapacitated, immobile, auto-fails STR/DEX saves. Hits within 5 ft are critical.',
    effects: [
      "A paralyzed creature is incapacitated and can't move or speak.",
      'The creature automatically fails Strength and Dexterity saving throws.',
      'Attack rolls against the creature have advantage.',
      'Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.',
    ],
    see: ['Incapacitated'],
  },
  {
    name: 'Petrified',
    aliases: ['petrify', 'turned to stone', 'stone'],
    summary: 'Turned to stone: incapacitated, resistant to all damage, immune to poison and disease.',
    effects: [
      'A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.',
      "The creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
      'Attack rolls against the creature have advantage.',
      'The creature automatically fails Strength and Dexterity saving throws.',
      'The creature has resistance to all damage.',
      "The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralised.",
    ],
    see: ['Incapacitated'],
  },
  {
    name: 'Poisoned',
    aliases: ['poison'],
    summary: 'Disadvantage on attack rolls and ability checks.',
    effects: ['A poisoned creature has disadvantage on attack rolls and ability checks.'],
  },
  {
    name: 'Prone',
    aliases: ['knocked down', 'knocked prone'],
    summary: 'Crawls and attacks at disadvantage; melee attackers get advantage.',
    effects: [
      "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.",
      'The creature has disadvantage on attack rolls.',
      'An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.',
      'Standing up costs movement equal to half the creature\'s speed.',
    ],
  },
  {
    name: 'Restrained',
    aliases: ['restrain', 'entangled', 'webbed'],
    summary: 'Speed 0, attacks at disadvantage, attacked at advantage.',
    effects: [
      "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
      "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
      'The creature has disadvantage on Dexterity saving throws.',
    ],
  },
  {
    name: 'Stunned',
    aliases: ['stun'],
    summary: 'Incapacitated, immobile, auto-fails STR/DEX saves, attacks against it have advantage.',
    effects: [
      "A stunned creature is incapacitated, can't move, and can speak only falteringly.",
      'The creature automatically fails Strength and Dexterity saving throws.',
      'Attack rolls against the creature have advantage.',
    ],
    see: ['Incapacitated'],
  },
  {
    name: 'Unconscious',
    aliases: ['knocked out', 'ko', 'sleeping', 'asleep'],
    summary: 'Incapacitated and prone; auto-fails STR and DEX saves.',
    effects: [
      "An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
      'The creature drops whatever it is holding and falls prone.',
      'The creature automatically fails Strength and Dexterity saving throws.',
      'Attack rolls against the creature have advantage.',
      'Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.',
    ],
    see: ['Incapacitated', 'Prone'],
  },
];

module.exports = { conditions };
