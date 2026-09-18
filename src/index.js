'use strict';

const path = require('node:path');
const { Client, Events, GatewayIntentBits } = require('discord.js');

const { config, assertValid } = require('./config');
const { createLogger } = require('./logger');
const { loadCommands } = require('./handlers/commandLoader');
const { createInteractionHandler } = require('./handlers/interactionHandler');
const { JsonStore } = require('./lib/store');
const { SpellBook } = require('./data/spells');

/**
 * Entry point.
 *
 * Notable difference from v1: this file no longer registers slash commands.
 * v1 registered them from `index.js`'s ready handler *and* from three modules
 * that each fired a `REST.put` at import time — so every boot raced three
 * overlapping global overwrites, and whichever landed last won. That is why
 * commands kept disappearing. Registration now happens only when you explicitly
 * run `npm run deploy`.
 *
 * Intents: Guilds is all a slash-command bot needs. v1 also asked for
 * GuildMessages, which it never used and which is a privileged-adjacent
 * permission you shouldn't request without cause.
 */
async function main() {
  const logger = createLogger(config.logLevel);
  assertValid(config);

  const commands = loadCommands(path.join(__dirname, 'commands'), logger);
  logger.info(`Loaded ${commands.size} commands: ${[...commands.keys()].map((c) => `/${c}`).join(' ')}`);

  const spells = SpellBook.load();
  logger.info(`Indexed ${spells.size} spells.`);

  const stores = {
    counters: new JsonStore(path.join(config.dataDir, 'counters.json'), { guilds: {} }, { logger }),
    encounters: new JsonStore(path.join(config.dataDir, 'encounters.json'), { channels: {} }, { logger }),
  };
  await Promise.all(Object.values(stores).map((store) => store.load()));
  logger.debug(`State loaded from ${config.dataDir}`);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  /** Shared context handed to every command — no module-level globals. */
  const ctx = { client, config, logger, commands, spells, stores };

  client.once(Events.ClientReady, (c) => {
    logger.info(`Logged in as ${c.user.tag} — serving ${c.guilds.cache.size} server(s).`);
    c.user.setPresence({ activities: [{ name: '/help · rolling dice' }], status: 'online' });
  });

  client.on(Events.InteractionCreate, createInteractionHandler(ctx));
  client.on(Events.Error, (error) => logger.error('Discord client error:', error));
  client.on(Events.Warn, (warning) => logger.warn('Discord client warning:', warning));

  // A bot that dies silently at 3am is the worst kind. Log everything, flush
  // state, then exit for the supervisor (systemd, pm2, Docker) to restart.
  let shuttingDown = false;
  const shutdown = (reason, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Shutting down (${reason})…`);
    for (const store of Object.values(stores)) store.close();
    client.destroy();
    setTimeout(() => process.exit(code), 250).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (error) => logger.error('Unhandled promise rejection:', error));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException', 1);
  });

  try {
    await client.login(config.token);
  } catch (error) {
    // discord.js reports a bad token as a bare "No Description", which tells
    // you nothing. Translate the ones people actually hit.
    if (error.code === 'TokenInvalid' || /disallowed|invalid token|no description/i.test(error.message)) {
      throw new Error(
        'Discord rejected the token.\n' +
          '  • Check DISCORD_TOKEN in your .env is the **bot** token, not the client secret or application ID.\n' +
          '  • If you regenerated it recently, copy the new one.\n' +
          '  • If you have enabled privileged intents in the portal, this bot does not need them — turn them back off.',
      );
    }
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\nFailed to start:\n', error.message, '\n');
    process.exit(1);
  });
}

module.exports = { main };
