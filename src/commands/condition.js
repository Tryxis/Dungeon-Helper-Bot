'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { conditions } = require('../data/conditions');
const { search, findExact } = require('../lib/search');
const embeds = require('../lib/embeds');
const { UserError } = require('../handlers/interactionHandler');

/**
 * `/condition` — same idea as v1, but with autocomplete rather than a
 * hard-coded choice list (which capped it at 25 forever and had already
 * omitted Exhaustion), a `list` option, and cross-references.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('condition')
    .setDescription('Look up a D&D 5e condition')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Start typing, or leave blank to list them all')
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const typed = interaction.options.getFocused();
    const matches = search(typed, conditions, { limit: 25 });
    return interaction.respond(
      matches.map((c) => ({ name: embeds.truncate(`${c.name} — ${c.summary}`, 100), value: c.name })),
    );
  },

  async execute(interaction) {
    const query = interaction.options.getString('name');

    if (!query) {
      return interaction.reply({
        embeds: [
          embeds.base({
            title: 'Conditions',
            description: conditions.map((c) => `• **${c.name}** — ${c.summary}`).join('\n'),
            color: embeds.COLORS.info,
            footer: 'Use /condition name: <condition> for the full rules text.',
          }),
        ],
      });
    }

    const condition = findExact(query, conditions) ?? search(query, conditions, { limit: 1 })[0];
    if (!condition) {
      throw new UserError(`"${query}" isn't a condition I know.`, 'Run `/condition` with no name to see the full list.');
    }

    const fields = [];
    if (condition.see?.length) {
      fields.push({ name: 'See also', value: condition.see.join(' · ') });
    }

    return interaction.reply({
      embeds: [
        embeds.base({
          title: condition.name,
          description: condition.effects.map((line) => `• ${line}`).join('\n'),
          color: embeds.COLORS.warning,
          fields,
        }),
      ],
    });
  },
};
