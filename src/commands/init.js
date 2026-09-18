'use strict';

const { SlashCommandBuilder } = require('discord.js');
const init = require('../lib/initiative');
const { conditions } = require('../data/conditions');
const embeds = require('../lib/embeds');
const { UserError } = require('../handlers/interactionHandler');

/**
 * `/init` — initiative and HP tracker. New in v2.
 *
 * State lives per **channel**, so two tables sharing a server don't stomp on
 * each other, and it survives restarts via the JSON store. The turn-order logic
 * is all in lib/initiative.js so it can be unit-tested without a Discord
 * connection.
 */

function encounterFor(store, channelId, { create = false } = {}) {
  const data = store.get();
  data.channels ??= {};
  if (!data.channels[channelId]) {
    if (!create) return null;
    data.channels[channelId] = init.createEncounter();
  }
  return data.channels[channelId];
}

function requireEncounter(store, channelId) {
  const encounter = encounterFor(store, channelId);
  if (!encounter || encounter.combatants.length === 0) {
    throw new UserError('No encounter running in this channel.', 'Start one with `/init roll` or `/init add`.');
  }
  return encounter;
}

function hpBar(combatant) {
  if (combatant.hp === null) return '';
  const max = combatant.maxHp || 1;
  const ratio = Math.max(0, Math.min(1, combatant.hp / max));
  const filled = Math.round(ratio * 8);
  const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
  return ` \`${bar}\` ${combatant.hp}/${combatant.maxHp}`;
}

function renderEncounter(encounter, { title = 'Initiative' } = {}) {
  const active = init.current(encounter);
  const lines = encounter.combatants.map((c) => {
    const marker = c.id === active?.id ? '▶' : '　';
    const name = c.down ? `~~${c.name}~~` : `**${c.name}**`;
    const meta = [
      c.ac ? `AC ${c.ac}` : null,
      c.conditions.length ? c.conditions.join(', ') : null,
      c.down ? 'down' : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return `${marker} \`${String(c.initiative).padStart(2)}\` ${name}${hpBar(c)}${meta ? ` — *${meta}*` : ''}`;
  });

  return embeds.base({
    title: encounter.round > 0 ? `${title} — Round ${encounter.round}` : title,
    description: embeds.truncate(lines.join('\n') || '*Nobody yet.*', embeds.LIMITS.description),
    color: embeds.COLORS.danger,
    footer: active ? `It's ${active.name}'s turn. /init next when they're done.` : 'Use /init start to begin.',
  });
}

const combatantOption = (option, name = 'who', description = 'Combatant name') =>
  option.setName(name).setDescription(description).setRequired(true).setAutocomplete(true);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('init')
    .setDescription('Initiative and HP tracker for this channel')
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('roll')
        .setDescription('Add a combatant, rolling initiative for them')
        .addStringOption((o) => o.setName('name').setDescription('Who or what').setRequired(true).setMaxLength(64))
        .addIntegerOption((o) => o.setName('modifier').setDescription('Initiative modifier (DEX)').setMinValue(-10).setMaxValue(20))
        .addIntegerOption((o) => o.setName('hp').setDescription('Starting hit points').setMinValue(1).setMaxValue(9999))
        .addIntegerOption((o) => o.setName('ac').setDescription('Armour class').setMinValue(1).setMaxValue(40))
        .addIntegerOption((o) => o.setName('count').setDescription('Add this many (Goblin, Goblin 2 …)').setMinValue(1).setMaxValue(12))
        .addBooleanOption((o) => o.setName('pc').setDescription('Mark as a player character')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a combatant with an initiative you already rolled')
        .addStringOption((o) => o.setName('name').setDescription('Who or what').setRequired(true).setMaxLength(64))
        .addIntegerOption((o) => o.setName('initiative').setDescription('Their initiative total').setRequired(true).setMinValue(-20).setMaxValue(60))
        .addIntegerOption((o) => o.setName('hp').setDescription('Starting hit points').setMinValue(1).setMaxValue(9999))
        .addIntegerOption((o) => o.setName('ac').setDescription('Armour class').setMinValue(1).setMaxValue(40))
        .addBooleanOption((o) => o.setName('pc').setDescription('Mark as a player character')),
    )
    .addSubcommand((sub) => sub.setName('start').setDescription('Begin round 1 at the top of the order'))
    .addSubcommand((sub) => sub.setName('next').setDescription("Advance to the next combatant's turn"))
    .addSubcommand((sub) => sub.setName('back').setDescription('Step back one turn'))
    .addSubcommand((sub) => sub.setName('list').setDescription('Show the current order'))
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Remove a combatant').addStringOption((o) => combatantOption(o)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('damage')
        .setDescription('Deal damage')
        .addStringOption((o) => combatantOption(o))
        .addIntegerOption((o) => o.setName('amount').setDescription('How much').setRequired(true).setMinValue(1).setMaxValue(999)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('heal')
        .setDescription('Restore hit points')
        .addStringOption((o) => combatantOption(o))
        .addIntegerOption((o) => o.setName('amount').setDescription('How much').setRequired(true).setMinValue(1).setMaxValue(999)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('condition')
        .setDescription('Apply or clear a condition')
        .addStringOption((o) => combatantOption(o))
        .addStringOption((o) =>
          o
            .setName('condition')
            .setDescription('Which condition')
            .setRequired(true)
            .addChoices(...conditions.slice(0, 25).map((c) => ({ name: c.name, value: c.name }))),
        )
        .addBooleanOption((o) => o.setName('remove').setDescription('Clear it instead of applying it')),
    )
    .addSubcommand((sub) => sub.setName('clear').setDescription('End the encounter and forget everyone')),

  async autocomplete(interaction, { stores }) {
    const encounter = encounterFor(stores.encounters, interaction.channelId);
    if (!encounter) return interaction.respond([]);
    const typed = String(interaction.options.getFocused() ?? '').toLowerCase();
    const matches = encounter.combatants
      .filter((c) => c.name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map((c) => ({
        name: embeds.truncate(`${c.name}${c.hp === null ? '' : ` (${c.hp}/${c.maxHp} HP)`}`, 100),
        value: c.name,
      }));
    return interaction.respond(matches);
  },

  async execute(interaction, { stores }) {
    const store = stores.encounters;
    const channelId = interaction.channelId;
    const sub = interaction.options.getSubcommand();

    try {
      switch (sub) {
        case 'roll':
        case 'add':
          return await addCombatant(interaction, store, channelId, sub);
        case 'start': {
          const encounter = requireEncounter(store, channelId);
          const active = init.start(encounter);
          store.markDirty();
          return await interaction.reply({
            embeds: [renderEncounter(encounter, { title: `⚔️ Roll for initiative — ${active.name} is up` })],
          });
        }
        case 'next':
        case 'back': {
          const encounter = requireEncounter(store, channelId);
          const active = sub === 'next' ? init.next(encounter) : init.previous(encounter);
          store.markDirty();
          return await interaction.reply({
            embeds: [renderEncounter(encounter, { title: `⚔️ ${active.name}'s turn` })],
          });
        }
        case 'list': {
          const encounter = requireEncounter(store, channelId);
          return await interaction.reply({ embeds: [renderEncounter(encounter)] });
        }
        case 'remove': {
          const encounter = requireEncounter(store, channelId);
          const removed = init.remove(encounter, interaction.options.getString('who', true));
          store.markDirty();
          return await interaction.reply({
            embeds: [renderEncounter(encounter, { title: `⚔️ ${removed.name} is out` })],
          });
        }
        case 'damage':
        case 'heal':
          return await changeHp(interaction, store, channelId, sub);
        case 'condition': {
          const encounter = requireEncounter(store, channelId);
          const remove = interaction.options.getBoolean('remove') ?? false;
          const condition = interaction.options.getString('condition', true);
          const combatant = init.setCondition(
            encounter,
            interaction.options.getString('who', true),
            condition,
            !remove,
          );
          store.markDirty();
          return await interaction.reply({
            embeds: [
              embeds.base({
                title: `${combatant.name} is ${remove ? 'no longer' : 'now'} ${condition.toLowerCase()}`,
                description: combatant.conditions.length
                  ? `Currently: ${combatant.conditions.join(', ')}`
                  : '*No conditions.*',
                color: remove ? embeds.COLORS.success : embeds.COLORS.warning,
              }),
            ],
          });
        }
        case 'clear': {
          const encounter = encounterFor(store, channelId);
          if (!encounter) throw new UserError('There is no encounter here to clear.');
          const count = init.clear(encounter);
          store.markDirty();
          return await interaction.reply({
            embeds: [embeds.success('Encounter ended', `${count} combatant${count === 1 ? '' : 's'} cleared.`)],
          });
        }
        default:
          throw new UserError(`Unknown subcommand ${sub}.`);
      }
    } catch (error) {
      if (error instanceof init.EncounterError) throw new UserError(error.message);
      throw error;
    }
  },
};

async function addCombatant(interaction, store, channelId, sub) {
  const encounter = encounterFor(store, channelId, { create: true });
  const name = interaction.options.getString('name', true);
  const hp = interaction.options.getInteger('hp');
  const ac = interaction.options.getInteger('ac');
  const isPC = interaction.options.getBoolean('pc') ?? false;

  const added = [];
  if (sub === 'roll') {
    const modifier = interaction.options.getInteger('modifier') ?? 0;
    const count = interaction.options.getInteger('count') ?? 1;
    for (let i = 0; i < count; i += 1) {
      const { combatant, result } = init.addRolled(encounter, { name, modifier, hp, ac, isPC });
      added.push({ combatant, roll: result });
    }
  } else {
    const initiative = interaction.options.getInteger('initiative', true);
    added.push({ combatant: init.add(encounter, { name, initiative, hp, ac, isPC }) });
  }
  store.markDirty();

  const summary = added
    .map(({ combatant, roll }) =>
      `• **${combatant.name}** — initiative **${combatant.initiative}**${roll ? ` (${roll.breakdown})` : ''}`,
    )
    .join('\n');

  return interaction.reply({
    embeds: [
      embeds.base({
        title: `⚔️ Added ${added.length} to the order`,
        description: `${summary}\n\n${renderList(encounter)}`,
        color: embeds.COLORS.danger,
        footer: encounter.round === 0 ? 'Use /init start when everyone is in.' : `Round ${encounter.round}`,
      }),
    ],
  });
}

function renderList(encounter) {
  const active = init.current(encounter);
  return encounter.combatants
    .map((c) => `${c.id === active?.id ? '▶' : '　'} \`${String(c.initiative).padStart(2)}\` ${c.name}`)
    .join('\n');
}

async function changeHp(interaction, store, channelId, sub) {
  const encounter = requireEncounter(store, channelId);
  const who = interaction.options.getString('who', true);
  const amount = interaction.options.getInteger('amount', true);
  const combatant = sub === 'damage' ? init.damage(encounter, who, amount) : init.heal(encounter, who, amount);
  store.markDirty();

  const verb = sub === 'damage' ? `takes **${amount}** damage` : `regains **${amount}** hit points`;
  const status = combatant.down
    ? '\n\n💀 **Down.** Death saves at the start of their turn — `/roll 1d20 label: Death save`.'
    : '';

  return interaction.reply({
    embeds: [
      embeds.base({
        title: `${combatant.name} ${sub === 'damage' ? '💥' : '💚'}`,
        description: `${combatant.name} ${verb}.${hpBar(combatant)}${status}`,
        color: combatant.down ? embeds.COLORS.fumble : sub === 'damage' ? embeds.COLORS.danger : embeds.COLORS.success,
      }),
    ],
  });
}
