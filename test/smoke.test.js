'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');

const { loadCommands } = require('../src/handlers/commandLoader');
const { createInteractionHandler } = require('../src/handlers/interactionHandler');
const { JsonStore } = require('../src/lib/store');
const { SpellBook } = require('../src/data/spells');

/**
 * End-to-end-ish tests: run each command's `execute` against a fake
 * interaction and assert it produces a valid, in-limits reply.
 *
 * This is the test that would have caught v1's real production failures — the
 * STRING-vs-INTEGER option mismatch, the over-2000-character spell reply, and
 * the unhandled throw that showed users "The application did not respond" — none
 * of which are visible without actually invoking the handler.
 */

const silent = { warn() {}, debug() {}, info() {}, error() {} };

function fakeInteraction({ subcommand, options = {}, focused, guildId = 'guild-1', channelId = 'chan-1' } = {}) {
  const replies = [];
  const get = (name) => (name in options ? options[name] : null);

  return {
    replies,
    commandName: 'test',
    guildId,
    channelId,
    user: { id: 'user-1', username: 'tester', displayName: 'Tester', bot: false, toString: () => '<@user-1>' },
    guild: { name: 'Test Server' },
    memberPermissions: { has: () => true },
    deferred: false,
    replied: false,
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    options: {
      getSubcommand: () => subcommand,
      getString: (name, required) => {
        const value = get(name);
        if (required && value == null) throw new Error(`missing required string ${name}`);
        return value === null ? null : String(value);
      },
      getInteger: (name, required) => {
        const value = get(name);
        if (required && value == null) throw new Error(`missing required integer ${name}`);
        return value === null ? null : Number(value);
      },
      getBoolean: (name) => (get(name) === null ? null : Boolean(get(name))),
      getUser: (name) => get(name),
      getFocused: () => focused ?? '',
    },
    async reply(payload) {
      this.replied = true;
      replies.push(payload);
      return payload;
    },
    async editReply(payload) {
      replies.push(payload);
      return payload;
    },
    async followUp(payload) {
      replies.push(payload);
      return payload;
    },
    async respond(choices) {
      replies.push({ choices });
      return choices;
    },
  };
}

async function makeCtx() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dhb-smoke-'));
  const commands = loadCommands(path.join(__dirname, '..', 'src', 'commands'), silent);
  return {
    commands,
    logger: silent,
    config: { banter: 'clean', dataDir: dir },
    spells: SpellBook.load(),
    stores: {
      counters: new JsonStore(path.join(dir, 'counters.json'), { guilds: {} }, { logger: silent }),
      encounters: new JsonStore(path.join(dir, 'encounters.json'), { channels: {} }, { logger: silent }),
    },
  };
}

/** Assert a reply is something Discord would actually accept. */
function assertValidReply(interaction, message = 'reply') {
  assert.ok(interaction.replies.length > 0, `${message}: nothing was sent`);
  for (const payload of interaction.replies) {
    if (payload.content) assert.ok(payload.content.length <= 2000, `${message}: content over 2000 chars`);
    for (const embed of payload.embeds ?? []) {
      const json = embed.toJSON ? embed.toJSON() : embed;
      assert.ok((json.description ?? '').length <= 4096, `${message}: description over 4096`);
      assert.ok((json.fields ?? []).length <= 25, `${message}: too many fields`);
      for (const field of json.fields ?? []) {
        assert.ok(field.name.length <= 256, `${message}: field name too long`);
        assert.ok(field.value.length <= 1024, `${message}: field "${field.name}" is ${field.value.length} chars`);
      }
    }
  }
}

test('/roll produces a valid reply for every kind of notation', async () => {
  const ctx = await makeCtx();
  const roll = ctx.commands.get('roll');
  const cases = ['1d20', '1d20+5', '4d6kh3', '2d6+1d4+3', '8d6!', '100d100'];
  for (const dice of cases) {
    const interaction = fakeInteraction({ options: { dice, label: 'Test' } });
    await roll.execute(interaction, ctx);
    assertValidReply(interaction, dice);
  }
});

test('/roll rejects bad notation as a user error, not a crash', async () => {
  const ctx = await makeCtx();
  const roll = ctx.commands.get('roll');
  const interaction = fakeInteraction({ options: { dice: 'banana' } });
  await assert.rejects(() => roll.execute(interaction, ctx), (error) => {
    assert.ok(error.userMessage, 'should carry a user-facing message');
    return true;
  });
});

test('the interaction router turns a user error into an ephemeral reply', async () => {
  const ctx = await makeCtx();
  const handler = createInteractionHandler(ctx);
  const interaction = fakeInteraction({ options: { dice: '??' } });
  interaction.commandName = 'roll';
  await handler(interaction);
  assertValidReply(interaction, 'router error path');
  const embed = interaction.replies[0].embeds[0].toJSON();
  assert.match(embed.title, /didn't work/i);
});

test('the router never leaves an unknown command unanswered', async () => {
  const ctx = await makeCtx();
  const handler = createInteractionHandler(ctx);
  const interaction = fakeInteraction();
  interaction.commandName = 'nonexistent';
  await handler(interaction);
  assertValidReply(interaction, 'unknown command');
});

test('/spell lookup renders the longest spell within embed limits', async () => {
  const ctx = await makeCtx();
  const spell = ctx.commands.get('spell');
  const longest = [...ctx.spells.spells].sort((a, b) => b.description.length - a.description.length)[0];

  const interaction = fakeInteraction({ subcommand: 'lookup', options: { name: longest.name } });
  await spell.execute(interaction, ctx);
  assertValidReply(interaction, `spell ${longest.name}`);
});

test('/spell lookup with a typo suggests alternatives instead of failing', async () => {
  const ctx = await makeCtx();
  const spell = ctx.commands.get('spell');
  const interaction = fakeInteraction({ subcommand: 'lookup', options: { name: 'firebal' } });
  await spell.execute(interaction, ctx);
  assertValidReply(interaction, 'fuzzy spell');
});

test('/spell search filters and stays inside limits', async () => {
  const ctx = await makeCtx();
  const spell = ctx.commands.get('spell');
  const interaction = fakeInteraction({ subcommand: 'search', options: { class: 'wizard', level: 1 } });
  await spell.execute(interaction, ctx);
  assertValidReply(interaction, 'spell search');
});

test('/spell autocomplete returns at most 25 valid choices', async () => {
  const ctx = await makeCtx();
  const spell = ctx.commands.get('spell');
  const interaction = fakeInteraction({ focused: 'fire' });
  await spell.autocomplete(interaction, ctx);
  const { choices } = interaction.replies[0];
  assert.ok(choices.length > 0 && choices.length <= 25);
  for (const choice of choices) {
    assert.ok(choice.name.length <= 100, `choice name too long: ${choice.name}`);
    assert.ok(choice.value.length <= 100);
  }
});

test('/condition renders both the list and a single condition', async () => {
  const ctx = await makeCtx();
  const condition = ctx.commands.get('condition');

  const list = fakeInteraction({ options: {} });
  await condition.execute(list, ctx);
  assertValidReply(list, 'condition list');

  const one = fakeInteraction({ options: { name: 'Exhaustion' } });
  await condition.execute(one, ctx);
  assertValidReply(one, 'condition detail');
});

test('/rules renders the index, a category and a single rule', async () => {
  const ctx = await makeCtx();
  const rules = ctx.commands.get('rules');

  for (const options of [{}, { category: 'combat' }, { rule: 'Cover' }, { rule: 'death saves' }]) {
    const interaction = fakeInteraction({ options });
    await rules.execute(interaction, ctx);
    assertValidReply(interaction, JSON.stringify(options));
  }
});

test('/init runs a whole encounter without falling over', async () => {
  const ctx = await makeCtx();
  const init = ctx.commands.get('init');
  await ctx.stores.encounters.load();

  const steps = [
    { subcommand: 'roll', options: { name: 'Goblin', modifier: 2, hp: 7, ac: 15, count: 3 } },
    { subcommand: 'add', options: { name: 'Beric', initiative: 18, hp: 34, ac: 16, pc: true } },
    { subcommand: 'start', options: {} },
    { subcommand: 'list', options: {} },
    { subcommand: 'next', options: {} },
    { subcommand: 'damage', options: { who: 'Goblin 2', amount: 99 } },
    { subcommand: 'heal', options: { who: 'Goblin 2', amount: 3 } },
    { subcommand: 'condition', options: { who: 'Beric', condition: 'Prone' } },
    { subcommand: 'back', options: {} },
    { subcommand: 'remove', options: { who: 'Goblin 3' } },
    { subcommand: 'clear', options: {} },
  ];

  for (const step of steps) {
    const interaction = fakeInteraction(step);
    await init.execute(interaction, ctx);
    assertValidReply(interaction, `init ${step.subcommand}`);
  }
});

test('/init reports a missing encounter as a user error', async () => {
  const ctx = await makeCtx();
  await ctx.stores.encounters.load();
  const init = ctx.commands.get('init');
  const interaction = fakeInteraction({ subcommand: 'next', options: {}, channelId: 'empty-channel' });
  await assert.rejects(() => init.execute(interaction, ctx), (error) => Boolean(error.userMessage));
});

test('/bullshit records, ranks and resets', async () => {
  const ctx = await makeCtx();
  await ctx.stores.counters.load();
  const bullshit = ctx.commands.get('bullshit');
  const victim = { id: 'kieron', bot: false, toString: () => '<@kieron>' };

  const call = fakeInteraction({ subcommand: 'call', options: { victim, amount: 3, reason: 'Nat 1 on a 2' } });
  await bullshit.execute(call, ctx);
  assertValidReply(call, 'bullshit call');

  const board = fakeInteraction({ subcommand: 'leaderboard', options: {} });
  await bullshit.execute(board, ctx);
  assertValidReply(board, 'bullshit leaderboard');

  const reset = fakeInteraction({ subcommand: 'reset', options: {} });
  await bullshit.execute(reset, ctx);
  assertValidReply(reset, 'bullshit reset');

  const empty = fakeInteraction({ subcommand: 'leaderboard', options: {} });
  await assert.rejects(() => bullshit.execute(empty, ctx), (error) => Boolean(error.userMessage));
});

test('/bullshit refuses to log a grievance against a bot', async () => {
  const ctx = await makeCtx();
  await ctx.stores.counters.load();
  const bullshit = ctx.commands.get('bullshit');
  const interaction = fakeInteraction({
    subcommand: 'call',
    options: { victim: { id: 'bot', bot: true, toString: () => '<@bot>' } },
  });
  await assert.rejects(() => bullshit.execute(interaction, ctx), (error) => Boolean(error.userMessage));
});

test('/generate produces valid output for every table, repeatedly', async () => {
  const ctx = await makeCtx();
  const generate = ctx.commands.get('generate');
  const subs = [
    { subcommand: 'npc', options: {} },
    { subcommand: 'npc', options: { ancestry: 'dwarf' } },
    { subcommand: 'loot', options: { tier: 'mixed', count: 10 } },
    { subcommand: 'loot', options: { tier: 'magical' } },
    { subcommand: 'tavern', options: {} },
    { subcommand: 'hook', options: {} },
  ];
  for (let i = 0; i < 20; i += 1) {
    for (const step of subs) {
      const interaction = fakeInteraction(step);
      await generate.execute(interaction, ctx);
      assertValidReply(interaction, `generate ${step.subcommand}`);
    }
  }
});

test('/generate loot resolves its dice placeholders', async () => {
  const ctx = await makeCtx();
  const generate = ctx.commands.get('generate');
  for (let i = 0; i < 40; i += 1) {
    const interaction = fakeInteraction({ subcommand: 'loot', options: { tier: 'mixed', count: 10 } });
    await generate.execute(interaction, ctx);
    const text = interaction.replies[0].embeds[0].toJSON().description;
    assert.ok(!/\{\d+d\d+\}/.test(text), `unresolved dice placeholder in: ${text}`);
  }
});

test('/help renders the index and per-command detail for everything', async () => {
  const ctx = await makeCtx();
  const help = ctx.commands.get('help');

  const index = fakeInteraction({ options: {} });
  await help.execute(index, ctx);
  assertValidReply(index, 'help index');

  for (const name of ctx.commands.keys()) {
    const interaction = fakeInteraction({ options: { command: name } });
    await help.execute(interaction, ctx);
    assertValidReply(interaction, `help ${name}`);
  }
});
