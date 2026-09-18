'use strict';

const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { config, assertValid } = require('./config');
const { createLogger } = require('./logger');
const { loadCommands } = require('./handlers/commandLoader');

/**
 * The single place slash commands get registered.
 *
 * v1 did this from three modules at import time, each sending a *different*
 * command list to the same global endpoint. `PUT` replaces the whole set, so
 * whichever request finished last deleted the other two files' commands. That
 * is the single biggest bug in the old codebase and this script is the fix:
 * one list, one request, run deliberately.
 *
 *   npm run deploy         register globally (can take up to an hour to appear)
 *   npm run deploy:guild   register to DISCORD_GUILD_ID (instant, for dev)
 *   npm run deploy:clear   remove all commands from that scope
 */
async function deploy(argv = process.argv.slice(2)) {
  const logger = createLogger(config.logLevel);
  assertValid(config, { requireClientId: true });

  const guildScope = argv.includes('--guild');
  const clear = argv.includes('--clear');

  if (guildScope && !config.guildId) {
    throw new Error('--guild needs DISCORD_GUILD_ID set in your .env');
  }

  const commands = loadCommands(path.join(__dirname, 'commands'), logger);
  const body = clear ? [] : [...commands.values()].map((c) => c.data.toJSON());

  const route = guildScope
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  const rest = new REST({ version: '10' }).setToken(config.token);
  const scope = guildScope ? `guild ${config.guildId}` : 'globally';

  logger.info(clear ? `Clearing all commands ${scope}…` : `Registering ${body.length} commands ${scope}…`);
  const result = await rest.put(route, { body });
  logger.info(`Done. ${result.length} command(s) now registered ${scope}.`);

  if (!guildScope && !clear) {
    logger.info('Global commands can take up to an hour to propagate. Use `npm run deploy:guild` while developing.');
  }
  return result;
}

if (require.main === module) {
  deploy().catch((error) => {
    console.error('\nDeploy failed:\n', error.message, '\n');
    if (error.rawError) console.error(JSON.stringify(error.rawError, null, 2));
    process.exit(1);
  });
}

module.exports = { deploy };
