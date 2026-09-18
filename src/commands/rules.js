'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { rules, CATEGORIES } = require('../data/rules');
const { search, findExact } = require('../lib/search');
const embeds = require('../lib/embeds');
const { UserError } = require('../handlers/interactionHandler');

/**
 * `/rules` — v1 had a single hard-coded choice (Sneak Attack). This searches a
 * proper library with autocomplete and category filtering, so adding a rule is
 * one entry in src/data/rules.js and nothing else.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Settle an argument: look up a 5e rule')
    .addStringOption((option) =>
      option
        .setName('rule')
        .setDescription('Start typing, or leave blank to browse')
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Browse a category instead')
        .addChoices(...Object.entries(CATEGORIES).map(([value, name]) => ({ name, value }))),
    ),

  async autocomplete(interaction) {
    const typed = interaction.options.getFocused();
    const matches = search(typed, rules, { limit: 25 });
    return interaction.respond(
      matches.map((r) => ({ name: embeds.truncate(`${r.name} — ${r.summary}`, 100), value: r.name })),
    );
  },

  async execute(interaction) {
    const query = interaction.options.getString('rule');
    const category = interaction.options.getString('category');

    if (!query) {
      const pool = category ? rules.filter((r) => r.category === category) : rules;
      const heading = category ? `Rules — ${CATEGORIES[category]}` : 'Rules reference';
      const grouped = category
        ? pool.map((r) => `• **${r.name}** — ${r.summary}`).join('\n')
        : Object.entries(CATEGORIES)
            .map(([key, label]) => {
              const inCategory = rules.filter((r) => r.category === key);
              if (!inCategory.length) return null;
              return `**${label}**\n${inCategory.map((r) => `• ${r.name}`).join(' · ')}`;
            })
            .filter(Boolean)
            .join('\n\n');

      return interaction.reply({
        embeds: [
          embeds.base({
            title: heading,
            description: embeds.truncate(grouped, embeds.LIMITS.description),
            color: embeds.COLORS.info,
            footer: `${pool.length} rules. Use /rules rule: <name> for the detail.`,
          }),
        ],
      });
    }

    const rule = findExact(query, rules) ?? search(query, rules, { limit: 1 })[0];
    if (!rule) {
      throw new UserError(`I don't have a rule for "${query}".`, 'Run `/rules` with no arguments to browse what I do have.');
    }

    const fields = [];
    if (rule.see?.length) fields.push({ name: 'See also', value: rule.see.join(' · ') });

    return interaction.reply({
      embeds: [
        embeds.base({
          title: rule.name,
          description: `*${rule.summary}*\n\n${rule.text.map((line) => `• ${line}`).join('\n')}`,
          color: embeds.COLORS.info,
          fields,
          footer: CATEGORIES[rule.category],
        }),
      ],
    });
  },
};
