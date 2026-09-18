'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { roll, DiceError } = require('../lib/dice');
const { pick } = require('../lib/rng');
const { commentFor } = require('../data/responses');
const embeds = require('../lib/embeds');
const { UserError } = require('../handlers/interactionHandler');

/**
 * `/roll`
 *
 * v1 offered a die-type dropdown and a count, so `1d20+7` — the single most
 * common roll in D&D — was impossible and everyone did the addition in their
 * head. This takes real notation, keeps the flavour commentary, and adds
 * advantage/disadvantage, labels and secret (DM) rolls.
 */

const PRESETS = [
  { name: 'd20 — attack or check', value: '1d20' },
  { name: '4d6kh3 — roll a stat', value: '4d6kh3' },
  { name: '2d6+3 — typical damage', value: '2d6+3' },
  { name: '8d6 — fireball', value: '8d6' },
  { name: '1d100 — percentile', value: '1d100' },
  { name: '2d20kh1 — advantage, written out', value: '2d20kh1' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice: 1d20+5, 4d6kh3, 2d6+1d4+3 …')
    .addStringOption((option) =>
      option
        .setName('dice')
        .setDescription('Dice notation, e.g. 1d20+5 or 4d6kh3')
        .setRequired(true)
        .setAutocomplete(true)
        .setMaxLength(100),
    )
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Advantage or disadvantage (single d20 rolls)')
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Advantage', value: 'advantage' },
          { name: 'Disadvantage', value: 'disadvantage' },
        ),
    )
    .addStringOption((option) =>
      option.setName('label').setDescription('What is this roll for? e.g. "Stealth"').setMaxLength(100),
    )
    .addBooleanOption((option) =>
      option.setName('secret').setDescription('Only you see the result (DM rolls)'),
    ),

  async autocomplete(interaction) {
    const typed = interaction.options.getFocused();
    if (!typed) return interaction.respond(PRESETS);
    // Offer the raw input first so the user can always just submit what they
    // typed, then any presets that still match.
    const matches = PRESETS.filter((p) => p.value.startsWith(typed.toLowerCase()));
    return interaction.respond([{ name: typed.slice(0, 100), value: typed.slice(0, 100) }, ...matches].slice(0, 25));
  },

  async execute(interaction, { config }) {
    const notation = interaction.options.getString('dice', true);
    const mode = interaction.options.getString('mode') ?? 'normal';
    const label = interaction.options.getString('label');
    const secret = interaction.options.getBoolean('secret') ?? false;

    let result;
    try {
      result = roll(notation, {
        advantage: mode === 'advantage',
        disadvantage: mode === 'disadvantage',
      });
    } catch (error) {
      if (error instanceof DiceError) throw new UserError(error.message, error.hint);
      throw error;
    }

    const comment = commentFor(result.d20, { mode: config.banter, pick });

    let color = embeds.COLORS.default;
    if (result.d20?.critical) color = embeds.COLORS.critical;
    else if (result.d20?.fumble) color = embeds.COLORS.fumble;

    const title = `🎲 ${label ? `${label}: ` : ''}${result.total}`;

    const lines = [result.breakdown];
    if (result.advantageState === 'advantage') lines.push('*Rolled with advantage.*');
    if (result.advantageState === 'disadvantage') lines.push('*Rolled with disadvantage.*');
    if (result.advantageState === 'cancelled') lines.push('*Advantage and disadvantage cancel out — rolled straight.*');
    if (result.advantageState === 'unavailable') {
      lines.push('*Advantage only applies to a single d20, so I rolled it as written.*');
    }
    if (comment) lines.push(`\n**${comment}**`);

    await interaction.reply({
      embeds: [
        embeds.base({
          title,
          description: lines.join('\n'),
          color,
          footer: `${interaction.user.displayName ?? interaction.user.username} rolled ${result.normalised}`,
        }),
      ],
      flags: secret ? MessageFlags.Ephemeral : undefined,
    });
  },
};
