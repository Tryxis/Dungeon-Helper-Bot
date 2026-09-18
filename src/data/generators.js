'use strict';

/**
 * Tables for the "the party just asked the barman's name" emergencies.
 * Everything here is generic fantasy flavour written for this repo, so there
 * are no licensing questions attached to it.
 */

const NAME_PARTS = {
  human: {
    first: ['Alden', 'Bryn', 'Cassia', 'Doran', 'Elsbeth', 'Fenn', 'Gilda', 'Harrow', 'Isolde', 'Joric', 'Kesta', 'Lom', 'Mera', 'Norbert', 'Ottoline', 'Perrin', 'Quill', 'Rosalind', 'Sowen', 'Tam', 'Ulric', 'Vesna', 'Wend', 'Yarrow'],
    last: ['Ashdown', 'Blackmoor', 'Candlewick', 'Dunmore', 'Everly', 'Fairweather', 'Gallows', 'Hartshorn', 'Ironwood', 'Larkspur', 'Mudd', 'Nettlebed', 'Oakhurst', 'Penhale', 'Ravensworth', 'Stormcroft', 'Thistlewaite', 'Underhill', 'Vance', 'Westcott'],
  },
  dwarf: {
    first: ['Baldrin', 'Dorra', 'Emberin', 'Fadrik', 'Gunnhild', 'Harbek', 'Kildrak', 'Morgran', 'Nalla', 'Orsik', 'Rurik', 'Thordek', 'Vistra', 'Yurgun'],
    last: ['Anvilfast', 'Brightaxe', 'Coalhand', 'Deepdelve', 'Emberforge', 'Flintbeard', 'Gravelbrow', 'Hammerfell', 'Ironvein', 'Stonebrook', 'Thundershield', 'Warkettle'],
  },
  elf: {
    first: ['Aelar', 'Birel', 'Caelynn', 'Drannor', 'Enna', 'Faelyn', 'Galinndan', 'Hadarai', 'Immeral', 'Lia', 'Mindartis', 'Naivara', 'Peren', 'Quarion', 'Rolen', 'Silaqui', 'Thamior', 'Vadania'],
    last: ['Amakiir', 'Brightwind', 'Caphaeris', 'Dawnhollow', 'Ilphelkiir', 'Liadon', 'Moonwhisper', 'Nightbreeze', 'Siannodel', 'Starflower', 'Xiloscient'],
  },
  halfling: {
    first: ['Alton', 'Bree', 'Cade', 'Dillie', 'Eldon', 'Finnan', 'Gilly', 'Hob', 'Jillian', 'Lidda', 'Merric', 'Nedda', 'Osborn', 'Portia', 'Roscoe', 'Seraphina', 'Verna', 'Wellby'],
    last: ['Applebrook', 'Brushgather', 'Copperkettle', 'Fairbarrow', 'Goodbarrel', 'Greenbottle', 'High-hill', 'Leagallow', 'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough'],
  },
  orc: {
    first: ['Bagra', 'Dench', 'Feng', 'Gell', 'Henk', 'Imsh', 'Keth', 'Mhurren', 'Neega', 'Ront', 'Shautha', 'Thokk', 'Volen', 'Yevelda'],
    last: ['Bonechewer', 'Cragjaw', 'Doomhowl', 'Gutrender', 'Ironmaw', 'Skullsplit', 'Stormtusk', 'Wardrum'],
  },
};

const NPC_TRAITS = [
  'never quite finishes a sentence',
  'is compulsively, exhaustingly honest',
  'keeps score of every favour, in a little book',
  'talks to their tools by name',
  'is desperate to be taken seriously',
  'assumes everyone here is armed, and is usually right',
  'laughs at the wrong moments',
  'has one story and will tell it to you twice',
  'flinches at loud noises',
  'is quietly, obviously terrified of the party',
  'insists on being paid in advance',
  'is nursing a grudge that predates everyone present',
  'has beautiful handwriting and awful manners',
  'smells faintly of woodsmoke and vinegar',
  'counts everything out loud',
];

const NPC_WANTS = [
  'to leave this town before winter',
  'their sibling\'s debt forgiven',
  'one night of uninterrupted sleep',
  'the respect of a person who is already dead',
  'the deed to the building next door',
  'proof that they were right all along',
  'to be let into a place they were thrown out of',
  'a message delivered without anyone knowing',
  'somebody, anybody, to take the warning seriously',
  'their name off a particular list',
  'a decent price for something they shouldn\'t be selling',
  'to be somewhere else entirely',
];

const OCCUPATIONS = [
  'innkeeper', 'blacksmith', 'ferryman', 'hedge-witch', 'tax collector', 'caravan guard',
  'scribe', 'fishmonger', 'stable hand', 'bone-setter', 'town crier', 'gravedigger',
  'locksmith', 'brewer', 'ratcatcher', 'cartographer', 'sellsword', 'apothecary',
];

// Loot is weighted so the interesting entries stay interesting.
const LOOT_TABLES = {
  mundane: [
    { weight: 8, value: 'a purse of {2d6} silver pieces' },
    { weight: 6, value: 'a set of bone dice, subtly weighted' },
    { weight: 6, value: 'a half-finished letter, the ink still wet' },
    { weight: 5, value: 'a brass key with no label' },
    { weight: 5, value: '{1d4} days of rations and a very good knife' },
    { weight: 4, value: 'a signet ring bearing an unfamiliar crest' },
    { weight: 4, value: 'a map with one location scratched out' },
    { weight: 4, value: 'a lock of hair tied with black thread' },
    { weight: 3, value: 'a debt tally carved into a wooden stick' },
    { weight: 3, value: 'a child\'s drawing, folded eight times' },
    { weight: 2, value: 'a jar of something that was recently alive' },
  ],
  valuable: [
    { weight: 8, value: 'a gemstone worth {2d6}0 gp' },
    { weight: 6, value: 'a silver holy symbol of a faith nobody here practises' },
    { weight: 5, value: 'a painted miniature of a fortress, in unsettling detail' },
    { weight: 4, value: 'a bottle of wine older than the town' },
    { weight: 4, value: 'a set of surgeon\'s tools in a velvet case' },
    { weight: 3, value: 'a deed to property in a city three weeks away' },
    { weight: 2, value: 'a jewelled dagger, never sharpened' },
  ],
  magical: [
    { weight: 10, value: 'a potion of healing ({2d4}+2 HP)' },
    { weight: 6, value: 'a candle that burns with no heat and casts no shadow' },
    { weight: 5, value: 'a compass that points at the nearest lie' },
    { weight: 4, value: 'a spell scroll, 1st level, the ink still moving' },
    { weight: 3, value: 'a mirror that shows the room one minute ago' },
    { weight: 3, value: 'boots that leave no footprints on stone' },
    { weight: 2, value: 'a coin that always lands on its edge' },
    { weight: 1, value: 'a sealed box that hums when carried north' },
  ],
};

const HOOKS = [
  'The body was moved before it was found.',
  'Someone has been paying the toll for a bridge that no longer exists.',
  'Every dog in the village left on the same night.',
  'A debt is being collected on behalf of a creditor who died a decade ago.',
  'The well water has started tasting of salt, forty miles inland.',
  'A child has been describing a room none of the adults have ever seen.',
  'The same three names keep appearing in the parish register, across two hundred years.',
  'The shipment arrived, sealed and intact, with the crew nowhere aboard.',
  'A shrine has been repaired overnight, badly, by someone with no hands.',
  'Two towns each insist the other one burned down last spring.',
];

const TAVERNS = {
  adjective: ['Crooked', 'Drowned', 'Gilded', 'Laughing', 'Weeping', 'Salted', 'Broken', 'Silent', 'Hungry', 'Last', 'Brazen', 'Grey'],
  noun: ['Lantern', 'Hart', 'Anchor', 'Crown', 'Hound', 'Bell', 'Spoon', 'Raven', 'Wheel', 'Boar', 'Widow', 'Sparrow'],
};

module.exports = { NAME_PARTS, NPC_TRAITS, NPC_WANTS, OCCUPATIONS, LOOT_TABLES, HOOKS, TAVERNS };
