'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const embeds = require('../lib/embeds');
const { UserError } = require('../handlers/interactionHandler');

/**
 * `/bullshit` — the "how many times has Kieron been ripped off" counter.
 *
 * v1 kept a single global integer, so every server shared one number, there was
 * no record of who had been wronged, and passing a negative value silently
 * subtracted (nothing stopped `-999`). It also declared the option as a STRING
 * in commands.js but read it as an integer in index.js, which is the kind of
 * mismatch that makes a command fail only in production.
 *
 * Now: per-server, per-person, bounded, with a leaderboard and a reset gated
 * behind Manage Server.
 */

const MAX_PER_CALL = 20;

function guildBucket(store, guildId) {
  const data = store.get();
  data.guilds ??= {};
  data.guilds[guildId] ??= { total: 0, users: {}, reasons: [] };
  return data.guilds[guildId];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bullshit')
    .setDescription('Track how often someone has been royally shafted by the dice')
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('call')
        .setDescription('Record a fresh injustice')
        .addUserOption((option) =>
          option.setName('victim').setDescription('Who got done over').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription(`How many (1–${MAX_PER_CALL}, default 1)`)
            .setMinValue(1)
            .setMaxValue(MAX_PER_CALL),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('What happened').setMaxLength(140),
        ),
    )
    .addSubcommand((sub) => sub.setName('leaderboard').setDescription('Who has suffered most'))
    .addSubcommand((sub) =>
      sub.setName('reset').setDescription('Wipe the tally for this server (Manage Server only)'),
    ),

  async execute(interaction, { stores }) {
    const store = stores.counters;
    const guildId = interaction.guildId;
    if (!guildId) throw new UserError('This one only works in a server.');

    const sub = interaction.options.getSubcommand();
    const bucket = guildBucket(store, guildId);

    if (sub === 'call') {
      const victim = interaction.options.getUser('victim', true);
      const amount = interaction.options.getInteger('amount') ?? 1;
      const reason = interaction.options.getString('reason');

      if (victim.bot) throw new UserError('Bots are incapable of being wronged. We simply endure.');

      store.update(() => {
        bucket.users[victim.id] = (bucket.users[victim.id] ?? 0) + amount;
        bucket.total += amount;
        if (reason) {
          bucket.reasons.unshift({ userId: victim.id, reason, at: Date.now(), by: interaction.user.id });
          bucket.reasons = bucket.reasons.slice(0, 20);
        }
      });

      const personal = bucket.users[victim.id];
      return interaction.reply({
        embeds: [
          embeds.base({
            title: `🐂 ${amount} bullshit${amount === 1 ? '' : 's'} logged`,
            description: [
              `${victim} is now on **${personal}**.`,
              reason ? `> ${reason}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
            color: embeds.COLORS.warning,
            footer: `${bucket.total} recorded in this server, all told.`,
          }),
        ],
      });
    }

    if (sub === 'leaderboard') {
      const entries = Object.entries(bucket.users).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) {
        throw new UserError('Nobody has been wronged yet. Give it time.');
      }

      const medals = ['🥇', '🥈', '🥉'];
      const board = entries
        .slice(0, 15)
        .map(([userId, count], i) => `${medals[i] ?? `\`${String(i + 1).padStart(2)}\``} <@${userId}> — **${count}**`)
        .join('\n');

      const recent = bucket.reasons
        .slice(0, 3)
        .map((r) => `• <@${r.userId}>: ${r.reason}`)
        .join('\n');

      return interaction.reply({
        embeds: [
          embeds.base({
            title: '🐂 The Ledger of Grievances',
            description: board,
            color: embeds.COLORS.warning,
            fields: recent ? [{ name: 'Most recent', value: recent }] : [],
            footer: `${bucket.total} total across ${entries.length} victim${entries.length === 1 ? '' : 's'}.`,
          }),
        ],
        allowedMentions: { parse: [] },
      });
    }

    // reset
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      throw new UserError('You need the Manage Server permission to wipe the ledger.');
    }
    const previous = bucket.total;
    store.update((data) => {
      data.guilds[guildId] = { total: 0, users: {}, reasons: [] };
    });
    await store.flush();

    return interaction.reply({
      embeds: [embeds.success('Ledger wiped', `${previous} bullshit${previous === 1 ? '' : 's'} forgiven. Nobody has learned anything.`)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
