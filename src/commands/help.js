'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../lib/embeds');

/**
 * `/help` — new in v2. The old README was the only documentation and it was
 * already out of date with the code by the second commit. This is generated
 * from the loaded command list, so it can't drift.
 */

const EXTRA = {
  roll: [
    '`/roll dice: 1d20+5` — attack roll',
    '`/roll dice: 4d6kh3` — keep the highest 3 of 4',
    '`/roll dice: 8d6 label: Fireball` — labelled damage',
    '`/roll dice: 1d20+3 mode: Advantage` — roll twice, keep the best',
    '`/roll dice: 2d6+1d4+3` — mix dice and modifiers',
    '`/roll dice: 6d6! ` — exploding dice',
    '`secret: True` keeps the result to yourself.',
  ],
  init: [
    '`/init roll name: Goblin modifier: 2 hp: 7 count: 4` — four goblins, initiative rolled',
    '`/init add name: Beric initiative: 18 hp: 34 ac: 16 pc: True`',
    '`/init start`, `/init next`, `/init back`, `/init list`',
    '`/init damage who: Goblin 2 amount: 9` · `/init heal` · `/init condition`',
    '`/init clear` when the fight is over. State is per-channel and survives restarts.',
  ],
  spell: [
    '`/spell lookup name: Fireball` — full text, with autocomplete',
    '`/spell search class: Druid level: 3 concentration: True`',
  ],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('What this bot can do')
    .addStringOption((option) =>
      option.setName('command').setDescription('Get detail on one command').setAutocomplete(true),
    ),

  async autocomplete(interaction, { commands }) {
    const typed = String(interaction.options.getFocused() ?? '').toLowerCase();
    return interaction.respond(
      [...commands.values()]
        .filter((c) => c.data.name.includes(typed))
        .slice(0, 25)
        .map((c) => ({ name: `/${c.data.name} — ${c.data.description}`.slice(0, 100), value: c.data.name })),
    );
  },

  async execute(interaction, { commands, spells }) {
    const requested = interaction.options.getString('command');

    if (requested && commands.has(requested)) {
      const command = commands.get(requested);
      const json = command.data.toJSON();
      const subs = (json.options ?? []).filter((o) => o.type === 1);

      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          embeds.base({
            title: `/${json.name}`,
            description: json.description,
            color: embeds.COLORS.info,
            fields: [
              subs.length
                ? { name: 'Subcommands', value: subs.map((s) => `\`${json.name} ${s.name}\` — ${s.description}`).join('\n') }
                : null,
              EXTRA[json.name] ? { name: 'Examples', value: EXTRA[json.name].join('\n') } : null,
            ].filter(Boolean),
          }),
        ],
      });
    }

    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        embeds.base({
          title: '🐉 Dungeon Helper',
          description: 'Everything below is a slash command. `/help command: roll` gives detail and examples for any one of them.',
          color: embeds.COLORS.default,
          fields: [
            {
              name: 'At the table',
              value: [
                '`/roll` — full dice notation, advantage, labels, secret rolls',
                '`/init` — initiative order and HP tracking for this channel',
              ].join('\n'),
            },
            {
              name: 'Looking things up',
              value: [
                `\`/spell\` — ${spells.size} spells, searchable by class, level and school`,
                '`/condition` — the 15 conditions, in full',
                '`/rules` — rules reference for the arguments that keep happening',
              ].join('\n'),
            },
            {
              name: 'Improvising',
              value: [
                '`/generate npc` · `/generate loot` · `/generate tavern` · `/generate hook`',
                '`/bullshit` — the ledger of grievances',
              ].join('\n'),
            },
          ],
          footer: 'Tip: most name fields autocomplete — start typing and pick from the list.',
        }),
      ],
    });
  },
};
