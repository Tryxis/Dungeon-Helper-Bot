# Migrating from v1

## Upgrading an existing install

1. **Back up nothing.** The only state v1 kept was `bullshit.json`, a single
   global integer. v2's counter is per-server and per-person, so there is nothing
   sensible to import. If you want to keep the number, run
   `/bullshit call victim: @kieron amount: <old number>` once.
2. **Delete `config.json`** and create `.env` from `.env.example` instead. The
   token no longer lives in a file that sits next to your source.
3. **Clear the old slash commands, then register the new ones:**
   ```bash
   npm install
   npm run deploy:clear   # removes v1's registrations
   npm run deploy         # registers v2's
   ```
   Do the clear step. v1's registration was inconsistent between runs, so your
   application may be carrying stale command definitions that will otherwise sit
   alongside the new ones.
4. `npm start`.

## What was wrong with v1, and what replaced it

### The big one: three files fought over command registration

`commands.js`, `roll-commands.js` and `rules.js` each ran a top-level
`rest.put(Routes.applicationCommands(clientId), { body: … })` **at import time**,
and each sent a *different* list. `PUT` replaces the entire command set, so on
every boot the three requests raced and whichever finished last deleted the other
two files' commands. `index.js` then registered a fourth set via
`client.application.commands.create()` on top of that.

That is why commands kept vanishing. Registration now happens in exactly one
place — `src/deploy-commands.js` — and only when you run `npm run deploy`.
Importing a module no longer talks to Discord.

### Other fixed bugs

| Symptom | Cause |
| --- | --- |
| Searching `Fire` found nothing, `fire` worked | the substring fallback lower-cased the spell name but not the query |
| Long spells produced "The application did not respond" | the reply exceeded Discord's 2000-character limit; nothing caught the rejection |
| `/spell` felt sluggish and froze other users' commands | `fs.readFileSync('spells.json')` ran **inside the handler**, re-parsing ~1 MB synchronously on every use |
| The bot only worked when started from the repo root | `spells.json` and `bullshit.json` were opened by relative path |
| `/bullshit` could go backwards | the option was declared as a STRING in `commands.js` but read with `getInteger` in `index.js`, and negative values were never rejected |
| A crash during a save reset the counter to 0 | the counter was written non-atomically; a truncated file failed to parse on restart |
| Any thrown error showed "The application did not respond" with nothing in the logs | no handler had a `try`/`catch`, and there was no `unhandledRejection` listener |
| Only one rule (Sneak Attack) and no Exhaustion | both were hard-coded into slash-command choice lists, which cap at 25 entries |

### Structural changes

- **Five `InteractionCreate` listeners → one router.** Every listener previously
  ran on every interaction. Now there is one, with a command lookup, per-user
  cooldowns and error handling.
- **One file per command**, auto-discovered from `src/commands/`. Adding a
  command used to mean editing four files.
- **Config from the environment**, validated at startup with a readable error,
  rather than `require('./config.json')` from five modules.
- **`Math.random` → `crypto.randomInt`** for dice, so results are uniform and the
  rolls are injectable in tests.
- **Intents narrowed** from `[Guilds, GuildMessages]` to `[Guilds]`. The bot
  never read message content; asking for less is both faster and easier to get
  approved when a bot passes 75 servers.
- **`.gitignore` was Visual Studio's C#/.NET template** — hundreds of lines about
  ReSharper and MSBuild, for a Node project. Replaced with one that ignores
  `node_modules`, `.env`, `data/*.json` and `.DS_Store` (which was committed).
- **Tests and CI**, neither of which existed. 76 tests, no network required;
  GitHub Actions runs lint and tests on Node 18, 20 and 22.

### Behaviour that deliberately changed

- `/roll` no longer takes a die-type dropdown and a count. It takes notation:
  `/roll dice: 2d6+3`. This is the one change existing users will notice.
- `/rules` and `/condition` use autocomplete rather than a fixed dropdown.
- `/bullshit` is now `/bullshit call`, `/bullshit leaderboard` and
  `/bullshit reset`, and the count is per-server rather than global.
- The roll commentary bank is unchanged by default. `BANTER=clean` swaps in a
  non-sweary bank; `BANTER=off` disables commentary.

### Files that no longer exist

| v1 | v2 |
| --- | --- |
| `index.js` | `src/index.js` (wiring only) |
| `commands.js`, `roll-commands.js` | `src/commands/*.js` + `src/deploy-commands.js` |
| `commandFunctions.js` | `src/data/spells.js` |
| `rules.js` | `src/data/rules.js` + `src/data/conditions.js` + `src/commands/rules.js` |
| `config.json` | `.env` |
| `README.txt` | `README.md` |
| `bullshit.json` | `data/counters.json` (per server, per user) |
| `.DS_Store` | deleted, and now git-ignored |
