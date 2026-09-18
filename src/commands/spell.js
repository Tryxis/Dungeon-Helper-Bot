'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { search, findExact } = require('../lib/search');
const embeds = require('../lib/embeds');
const { UserError } = require('../handlers/interactionHandler');

/**
 * `/spell lookup` and `/spell search`.
 *
 * Fixes from v1, all of which were real failure modes:
 *   - autocomplete, so you never have to guess the exact name;
 *   - the substring fallback lower-cased the haystack but not the needle, so
 *     any capital letter in your query found nothing;
 *   - long spells exceeded Discord's 2000-character reply limit and the
 *     interaction just failed — now they're embeds, chunked into fields;
 *   - "fire" used to dump every match into one message; now results are ranked
 *     and capped.
 */

const SCHOOL_CHOICES = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
].map((name) => ({ name, value: name.toLowerCase() }));

const CLASS_CHOICES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard']
  .map((name) => ({ name, value: name.toLowerCase() }));

const LEVEL_CHOICES = [
  { name: 'Cantrip', value: 0 },
  ...Array.from({ length: 9 }, (_, i) => ({ name: `Level ${i + 1}`, value: i + 1 })),
];

function spellEmbed(spell) {
  const tags = [
    spell.concentration ? 'Concentration' : null,
    spell.ritual ? 'Ritual' : null,
  ].filter(Boolean);

  const subtitle = `*${spell.level === 0 ? `${spell.school} cantrip` : `${spell.levelLabel} ${spell.school.toLowerCase()}`}*`;
  const descriptionChunks = embeds.chunk(spell.description, embeds.LIMITS.fieldValue);

  const fields = [
    { name: 'Casting Time', value: spell.casting_time, inline: true },
    { name: 'Range', value: spell.range, inline: true },
    { name: 'Duration', value: spell.duration, inline: true },
    { name: 'Components', value: spell.componentsText, inline: false },
    ...descriptionChunks.map((text, i) => ({
      name: i === 0 ? 'Description' : 'Description (cont.)',
      value: text,
      inline: false,
    })),
  ];

  if (spell.higherLevels) {
    fields.push({ name: 'At Higher Levels', value: embeds.truncate(spell.higherLevels, embeds.LIMITS.fieldValue) });
  }
  if (spell.classes.length) {
    fields.push({
      name: 'Classes',
      value: spell.classes.map((c) => c[0].toUpperCase() + c.slice(1)).join(', '),
    });
  }

  return embeds.base({
    title: spell.name,
    description: tags.length ? `${subtitle} · ${tags.join(' · ')}` : subtitle,
    color: embeds.COLORS.magic,
    fields,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spell')
    .setDescription('Look up a D&D 5e spell')
    .addSubcommand((sub) =>
      sub
        .setName('lookup')
        .setDescription('Show the full text of one spell')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Start typing a spell name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('search')
        .setDescription('List spells matching a class, level or school')
        .addStringOption((option) => option.setName('query').setDescription('Words in the spell name'))
        .addStringOption((option) =>
          option.setName('class').setDescription('Spell list').addChoices(...CLASS_CHOICES),
        )
        .addIntegerOption((option) =>
          option.setName('level').setDescription('Spell level').addChoices(...LEVEL_CHOICES),
        )
        .addStringOption((option) =>
          option.setName('school').setDescription('School of magic').addChoices(...SCHOOL_CHOICES),
        )
        .addBooleanOption((option) => option.setName('ritual').setDescription('Only ritual spells'))
        .addBooleanOption((option) =>
          option.setName('concentration').setDescription('Only concentration spells'),
        ),
    ),

  async autocomplete(interaction, { spells }) {
    const typed = interaction.options.getFocused();
    const matches = search(typed, spells.spells, { limit: 25 });
    return interaction.respond(
      matches.map((spell) => ({
        name: embeds.truncate(`${spell.name} (${spell.level === 0 ? 'cantrip' : `lvl ${spell.level}`})`, 100),
        value: spell.name.slice(0, 100),
      })),
    );
  },

  async execute(interaction, { spells }) {
    if (interaction.options.getSubcommand() === 'lookup') return lookup(interaction, spells);
    return searchSpells(interaction, spells);
  },
};

async function lookup(interaction, spells) {
  const query = interaction.options.getString('name', true);
  const exact = findExact(query, spells.spells);

  if (exact) {
    return interaction.reply({ embeds: [spellEmbed(exact)] });
  }

  const matches = search(query, spells.spells, { limit: 10 });
  if (matches.length === 1) {
    return interaction.reply({ embeds: [spellEmbed(matches[0])] });
  }
  if (matches.length === 0) {
    throw new UserError(
      `No spell matches "${query}".`,
      'Try `/spell search` to browse by class, level or school.',
    );
  }

  return interaction.reply({
    embeds: [
      embeds.base({
        title: `No exact match for "${embeds.truncate(query, 80)}"`,
        description: `Did you mean one of these?\n\n${matches.map((s) => `• **${s.name}** — ${s.levelLabel} ${s.school.toLowerCase()}`).join('\n')}`,
        color: embeds.COLORS.warning,
      }),
    ],
  });
}

async function searchSpells(interaction, spells) {
  const query = interaction.options.getString('query') ?? '';
  const filters = {
    class: interaction.options.getString('class') ?? undefined,
    level: interaction.options.getInteger('level') ?? undefined,
    school: interaction.options.getString('school') ?? undefined,
    ritual: interaction.options.getBoolean('ritual') ?? undefined,
    concentration: interaction.options.getBoolean('concentration') ?? undefined,
  };

  const pool = spells.filter(filters);
  const matches = query ? search(query, pool, { limit: 40 }) : pool;

  const described = [
    filters.class ? `**${filters.class}**` : null,
    filters.level !== undefined ? (filters.level === 0 ? 'cantrips' : `level ${filters.level}`) : null,
    filters.school ? `${filters.school} school` : null,
    filters.ritual ? 'rituals' : null,
    filters.concentration ? 'concentration' : null,
    query ? `matching "${query}"` : null,
  ].filter(Boolean);

  if (matches.length === 0) {
    throw new UserError(
      `Nothing matches ${described.join(', ') || 'that'}.`,
      'Loosen a filter and try again.',
    );
  }

  const shown = matches.slice(0, 40);
  const list = shown
    .map((s) => `• **${s.name}** — ${s.level === 0 ? 'cantrip' : `lvl ${s.level}`}, ${s.school.toLowerCase()}${s.concentration ? ' · C' : ''}${s.ritual ? ' · R' : ''}`)
    .join('\n');

  return interaction.reply({
    embeds: [
      embeds.base({
        title: `${matches.length} spell${matches.length === 1 ? '' : 's'}${described.length ? `: ${described.join(', ').replace(/\*\*/g, '')}` : ''}`,
        description: embeds.truncate(list, embeds.LIMITS.description),
        color: embeds.COLORS.magic,
        footer:
          matches.length > shown.length
            ? `Showing the first ${shown.length}. C = concentration, R = ritual.`
            : 'C = concentration, R = ritual. Use /spell lookup for full text.',
      }),
    ],
  });
}
