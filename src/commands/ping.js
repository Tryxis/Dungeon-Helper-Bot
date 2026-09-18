'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../lib/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot is alive and see how laggy it is'),

  cooldown: 3,

  async execute(interaction, { client }) {
    const sent = await interaction.reply({
      content: 'Pinging…',
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    // Round-trip is measured from our own message, because interaction
    // createdTimestamp can be skewed by the client's clock.
    const roundTrip = (sent.resource?.message?.createdTimestamp ?? Date.now()) - interaction.createdTimestamp;

    await interaction.editReply({
      content: null,
      embeds: [
        embeds.base({
          title: '🏓 Pong',
          color: embeds.COLORS.success,
          fields: [
            { name: 'Round trip', value: `${roundTrip} ms`, inline: true },
            { name: 'Gateway', value: `${Math.round(client.ws.ping)} ms`, inline: true },
            { name: 'Uptime', value: formatUptime(client.uptime ?? 0), inline: true },
          ],
        }),
      ],
    });
  },
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
