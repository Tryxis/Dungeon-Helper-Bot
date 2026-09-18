# 🐉 Dungeon Helper Bot

A Discord bot for running D&D 5e games: real dice notation, a spell and rules
reference with autocomplete, an initiative and HP tracker that survives a
restart, and a few generators for when the party goes somewhere you didn't
prepare.

Version 2 is a full rewrite of the original bot. See [MIGRATING.md](MIGRATING.md)
for what changed and why.

---

## Commands

### `/roll` — dice

Takes real notation, not a dropdown.

| Example | What it does |
| --- | --- |
| `/roll dice: 1d20+5` | an attack roll |
| `/roll dice: 2d6+3 label: Longsword` | labelled damage |
| `/roll dice: 4d6kh3` | roll a stat: keep the highest 3 of 4 |
| `/roll dice: 1d20+3 mode: Advantage` | rolls two d20s, keeps the better |
| `/roll dice: 2d20kl1` | disadvantage, written out longhand |
| `/roll dice: 1d8+1d6+2` | mix as many terms as you like |
| `/roll dice: 6d6!` | exploding dice — a maximum face rolls again |
| `/roll dice: 1d20 secret: True` | only you see the result |

Supported: `NdS`, `kh`/`kl` (keep highest/lowest), `dh`/`dl` (drop highest/lowest),
`!` (exploding), `+`/`-` modifiers, and any combination of them. Single d20 rolls
still get the flavour commentary; natural 1s and 20s are called out.

### `/init` — initiative and HP

Per-channel, so two tables in one server don't collide, and it survives a bot
restart.

```
/init roll name: Goblin modifier: 2 hp: 7 ac: 15 count: 4
/init add  name: Beric initiative: 18 hp: 34 ac: 16 pc: True
/init start
/init next            /init back            /init list
/init damage who: Goblin 2 amount: 9
/init heal   who: Beric amount: 8
/init condition who: Beric condition: Prone
/init remove who: Goblin 3
/init clear
```

Combatants with the same name are numbered automatically (`Goblin`, `Goblin 2`).
Whose turn it is is tracked by identity, not list position, so adding or removing
a combatant mid-fight doesn't shuffle the turn onto the wrong creature.

### `/spell` — 396 spells

```
/spell lookup name: Fireball
/spell search class: Druid level: 3 concentration: True
/spell search query: wall
```

The `name` field autocompletes as you type and tolerates typos. Long spells are
split across embed fields rather than being truncated or silently failing.

### `/condition` and `/rules` — reference

`/condition` with no argument lists all 15; with a name it gives the full rules
text and cross-references. `/rules` is a library of the ~29 rules that cause the
most table arguments — cover, death saves, opportunity attacks, concentration,
resting, falling, and so on — browsable by category.

Both search by the phrases people actually say: `death saves`, `aoo`, `twf`,
`knocked out`, `darkvision`.

### `/generate` — improvisation

`/generate npc`, `/generate loot`, `/generate tavern`, `/generate hook`. All the
tables live in `src/data/generators.js`; rewrite them for your own setting.

### `/bullshit` — the ledger of grievances

Per-server, per-person. `/bullshit call victim: @someone amount: 2 reason: "nat 1
on a death save"`, `/bullshit leaderboard`, and `/bullshit reset` (Manage Server
only).

### `/help` and `/ping`

`/help` is generated from the loaded commands, so it can't drift out of date.
`/help command: roll` gives examples for a single command.

---

## Setup

You need **Node 18.17 or newer**.

1. **Create the application.** Go to the
   [Discord developer portal](https://discord.com/developers/applications) →
   *New Application* → *Bot* → *Reset Token* and copy the token.
2. **Configure.**
   ```bash
   git clone https://github.com/Tryxis/Dungeon-Helper-Bot.git
   cd Dungeon-Helper-Bot
   npm install
   cp .env.example .env
   ```
   Fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in `.env`. For development,
   also set `DISCORD_GUILD_ID` to your test server's ID.
3. **Register the slash commands.**
   ```bash
   npm run deploy:guild   # instant, your test server only
   npm run deploy         # global, can take up to an hour to appear
   ```
4. **Invite the bot.** In the portal, *OAuth2 → URL Generator*, tick
   `bot` and `applications.commands`, and give it *Send Messages* and
   *Embed Links*. No privileged intents are needed.
5. **Run it.**
   ```bash
   npm start      # or: npm run dev   (restarts on file changes)
   ```

### Configuration

All configuration is environment variables, read from `.env` (git-ignored).

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | yes | — | bot token |
| `DISCORD_CLIENT_ID` | for deploys | — | application ID |
| `DISCORD_GUILD_ID` | no | — | test server, for `npm run deploy:guild` |
| `DATA_DIR` | no | `./data` | where persisted state is written |
| `LOG_LEVEL` | no | `info` | `error`, `warn`, `info`, `debug` |
| `BANTER` | no | `rude` | `rude`, `clean` or `off` — tone of roll commentary |

### Docker

```bash
docker build -t dungeon-helper-bot .
docker run -d --env-file .env -v "$PWD/data:/app/data" --name dhb dungeon-helper-bot
```

Mount `data/` as a volume or you'll lose the initiative tracker and counters on
every rebuild.

---

## Development

```bash
npm test          # 76 tests, no network needed
npm run lint
npm run dev       # auto-restart on save
```

### Project layout

```
src/
  index.js               entry point: client, stores, wiring
  deploy-commands.js     the ONLY place slash commands are registered
  config.js              env loading and validation
  logger.js              levelled logger
  commands/              one file per command — drop a file in, it's loaded
  handlers/
    commandLoader.js     discovers command modules
    interactionHandler.js one router, cooldowns, error handling
  lib/
    dice.js              notation parser and roller
    rng.js               crypto-backed randomness
    search.js            ranked fuzzy search and autocomplete
    store.js             atomic, debounced JSON persistence
    initiative.js        encounter state machine (pure functions)
    embeds.js            consistent styling and Discord length limits
  data/                  spells, conditions, rules, generator tables
test/                    node:test — unit plus fake-interaction smoke tests
```

### Adding a command

Create `src/commands/yourcommand.js`:

```js
'use strict';
const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../lib/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yourcommand')
    .setDescription('What it does'),

  // optional: seconds between uses, per user
  cooldown: 3,

  async execute(interaction, ctx) {
    // ctx = { client, config, logger, commands, spells, stores }
    await interaction.reply({ embeds: [embeds.info('Hello', 'World')] });
  },

  // optional
  async autocomplete(interaction, ctx) {
    await interaction.respond([{ name: 'Example', value: 'example' }]);
  },
};
```

Then `npm run deploy:guild`. That's the whole process — no other file changes.

Throw `new UserError('message', 'optional hint')` (from
`src/handlers/interactionHandler.js`) for anything the user did wrong; the router
turns it into a tidy ephemeral reply. Anything else you throw is treated as a bug
and logged with a stack trace.

### Adding a rule, condition or loot entry

Edit the relevant file in `src/data/`. Rules and conditions take an `aliases`
array — add the phrasing your table actually uses and search will find it. The
test suite checks every entry's label fits Discord's 100-character autocomplete
limit, so `npm test` will tell you if you've written too much.

---

## Licence and attribution

Code is ISC. Game content comes from SRD 5.1 under CC-BY-4.0 — see
[NOTICE.md](NOTICE.md). Unofficial fan content; not affiliated with Wizards of
the Coast.
