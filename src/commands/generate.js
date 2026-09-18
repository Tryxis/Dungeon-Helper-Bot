'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { pick, weightedPick, randomInt } = require('../lib/rng');
const { rollSimple } = require('../lib/dice');
const { NAME_PARTS, NPC_TRAITS, NPC_WANTS, OCCUPATIONS, LOOT_TABLES, HOOKS, TAVERNS } = require('../data/generators');
const embeds = require('../lib/embeds');

/**
 * `/generate` — the "the party has gone left and I prepared right" command.
 * New in v2. Every table lives in src/data/generators.js so you can rewrite
 * them for your own setting without touching code.
 */

/** Replace `{2d6}` style placeholders in a loot entry with actual rolls. */
function resolveDice(template) {
  return template.replace(/\{(\d+)d(\d+)\}/g, (_, count, sides) =>
    String(rollSimple(Number(count), Number(sides))),
  );
}

const ANCESTRIES = Object.keys(NAME_PARTS);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Improvise: NPCs, loot, taverns and plot hooks')
    .addSubcommand((sub) =>
      sub
        .setName('npc')
        .setDescription('A named NPC with a trait and a want')
        .addStringOption((o) =>
          o
            .setName('ancestry')
            .setDescription('Naming style')
            .addChoices(...ANCESTRIES.map((a) => ({ name: a[0].toUpperCase() + a.slice(1), value: a }))),
        )
        .addBooleanOption((o) => o.setName('name_only').setDescription('Just give me a name')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('loot')
        .setDescription('Something interesting in the chest')
        .addStringOption((o) =>
          o
            .setName('tier')
            .setDescription('How good')
            .addChoices(
              { name: 'Mundane', value: 'mundane' },
              { name: 'Valuable', value: 'valuable' },
              { name: 'Magical', value: 'magical' },
              { name: 'Mixed hoard', value: 'mixed' },
            ),
        )
        .addIntegerOption((o) => o.setName('count').setDescription('How many items (1–10)').setMinValue(1).setMaxValue(10)),
    )
    .addSubcommand((sub) => sub.setName('tavern').setDescription('A pub name and its one distinguishing feature'))
    .addSubcommand((sub) => sub.setName('hook').setDescription('A plot hook to dangle')),

  cooldown: 2,

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'npc':
        return npc(interaction);
      case 'loot':
        return loot(interaction);
      case 'tavern':
        return tavern(interaction);
      default:
        return hook(interaction);
    }
  },
};

async function npc(interaction) {
  const ancestry = interaction.options.getString('ancestry') ?? pick(ANCESTRIES);
  const nameOnly = interaction.options.getBoolean('name_only') ?? false;
  const parts = NAME_PARTS[ancestry];
  const name = `${pick(parts.first)} ${pick(parts.last)}`;

  if (nameOnly) {
    return interaction.reply({ embeds: [embeds.base({ title: name, color: embeds.COLORS.neutral })] });
  }

  return interaction.reply({
    embeds: [
      embeds.base({
        title: name,
        description: `*${ancestry[0].toUpperCase() + ancestry.slice(1)} ${pick(OCCUPATIONS)}*`,
        color: embeds.COLORS.neutral,
        fields: [
          { name: 'They…', value: pick(NPC_TRAITS).replace(/^./, (c) => c.toUpperCase()) },
          { name: 'They want', value: pick(NPC_WANTS).replace(/^./, (c) => c.toUpperCase()) },
        ],
        footer: 'Roll again if they don\'t fit. Nobody will know.',
      }),
    ],
  });
}

async function loot(interaction) {
  const tier = interaction.options.getString('tier') ?? 'mundane';
  const count = interaction.options.getInteger('count') ?? 1;

  const items = Array.from({ length: count }, () => {
    const table = tier === 'mixed' ? LOOT_TABLES[pick(['mundane', 'mundane', 'valuable', 'magical'])] : LOOT_TABLES[tier];
    return resolveDice(weightedPick(table, randomInt));
  });

  return interaction.reply({
    embeds: [
      embeds.base({
        title: count === 1 ? '🎁 You find…' : `🎁 The hoard contains ${count} things`,
        description: items.map((item) => `• ${item}`).join('\n'),
        color: embeds.COLORS.success,
        footer: tier === 'mixed' ? 'Mixed hoard' : `${tier[0].toUpperCase()}${tier.slice(1)} tier`,
      }),
    ],
  });
}

async function tavern(interaction) {
  const name = `The ${pick(TAVERNS.adjective)} ${pick(TAVERNS.noun)}`;
  return interaction.reply({
    embeds: [
      embeds.base({
        title: `🍺 ${name}`,
        description: `Run by **${pick(NAME_PARTS.human.first)} ${pick(NAME_PARTS.human.last)}**, who ${pick(NPC_TRAITS)}.`,
        color: embeds.COLORS.warning,
        fields: [{ name: 'The thing everyone mentions', value: pick(HOOKS) }],
      }),
    ],
  });
}

async function hook(interaction) {
  return interaction.reply({
    embeds: [
      embeds.base({
        title: '🪝 Plot hook',
        description: pick(HOOKS),
        color: embeds.COLORS.info,
      }),
    ],
  });
}
