'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

/**
 * Discovers command modules from src/commands.
 *
 * In v1, adding a command meant editing four files and hoping you remembered
 * all of them — which is exactly how `/roll` ended up defined in one file,
 * registered in another, and missing from the ready handler in a third. Now a
 * command is one self-contained module and this loader finds it.
 *
 * A module must export:
 *   data     — a SlashCommandBuilder (or anything with .toJSON())
 *   execute  — async (interaction, ctx) => void
 * and may export:
 *   autocomplete — async (interaction, ctx) => void
 *   cooldown     — seconds between uses per user
 */
function loadCommands(dir = path.join(__dirname, '..', 'commands'), logger = console) {
  const commands = new Collection();
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.js') && !file.startsWith('_') && !file.endsWith('.test.js'));

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const command = require(fullPath);

    if (!command?.data || typeof command.execute !== 'function') {
      logger.warn?.(`Skipping ${file}: it must export { data, execute }.`);
      continue;
    }

    const name = command.data.name ?? command.data.toJSON?.().name;
    if (!name) {
      logger.warn?.(`Skipping ${file}: its command data has no name.`);
      continue;
    }
    if (commands.has(name)) {
      throw new Error(`Two command modules both define /${name}. Rename one of them.`);
    }

    commands.set(name, command);
    logger.debug?.(`Loaded /${name} from ${file}`);
  }

  if (commands.size === 0) throw new Error(`No command modules found in ${dir}`);
  return commands;
}

module.exports = { loadCommands };
