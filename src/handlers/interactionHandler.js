'use strict';

const { Collection, MessageFlags } = require('discord.js');
const embeds = require('../lib/embeds');

/**
 * One router for every interaction.
 *
 * v1 attached five separate `InteractionCreate` listeners, each of which ran on
 * every single interaction and each of which re-checked the command name. That
 * is O(listeners) work per interaction, it made ordering unpredictable, and
 * because none of them had a try/catch, one thrown error meant Discord showed
 * "The application did not respond" with nothing in the logs explaining why.
 *
 * This version: one listener, a command lookup, per-user cooldowns, and error
 * handling that always replies to the user *and* logs the cause.
 */
function createInteractionHandler(ctx) {
  const { commands, logger } = ctx;
  const cooldowns = new Collection();

  function checkCooldown(command, userId) {
    const seconds = command.cooldown ?? 0;
    if (!seconds) return 0;
    const key = command.data.name;
    if (!cooldowns.has(key)) cooldowns.set(key, new Collection());
    const timestamps = cooldowns.get(key);
    const now = Date.now();
    const expires = (timestamps.get(userId) ?? 0) + seconds * 1000;
    if (now < expires) return Math.ceil((expires - now) / 1000);
    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), seconds * 1000).unref?.();
    return 0;
  }

  /** Reply safely whatever state the interaction is in. */
  async function respondWithError(interaction, embed) {
    const payload = { embeds: [embed], flags: MessageFlags.Ephemeral };
    try {
      if (interaction.deferred) await interaction.editReply({ embeds: [embed] });
      else if (interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch (error) {
      logger.error('Could not deliver the error message to Discord:', error);
    }
  }

  async function handleChatInput(interaction) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Received /${interaction.commandName}, which isn't registered locally. Run \`npm run deploy\`.`);
      await respondWithError(
        interaction,
        embeds.error(`\`/${interaction.commandName}\` isn't available any more.`, 'The bot may have been updated; try again in a minute.'),
      );
      return;
    }

    const wait = checkCooldown(command, interaction.user.id);
    if (wait > 0) {
      await respondWithError(interaction, embeds.error(`Steady on — try \`/${command.data.name}\` again in ${wait}s.`));
      return;
    }

    logger.debug(`/${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name ?? 'DM'}`);
    await command.execute(interaction, ctx);
  }

  async function handleAutocomplete(interaction) {
    const command = commands.get(interaction.commandName);
    if (!command?.autocomplete) return interaction.respond([]);
    return command.autocomplete(interaction, ctx);
  }

  return async function onInteraction(interaction) {
    try {
      if (interaction.isChatInputCommand()) return await handleChatInput(interaction);
      if (interaction.isAutocomplete()) return await handleAutocomplete(interaction);
    } catch (error) {
      // Expected, user-facing failures carry a `userMessage`; everything else
      // is a bug and gets logged with a stack.
      if (error?.userMessage) {
        logger.debug(`/${interaction.commandName} rejected input: ${error.message}`);
        if (!interaction.isAutocomplete()) {
          await respondWithError(interaction, embeds.error(error.userMessage, error.hint));
        }
        return undefined;
      }

      logger.error(`Unhandled error in /${interaction.commandName}:`, error);
      if (interaction.isAutocomplete()) {
        try {
          await interaction.respond([]);
        } catch {
          /* the autocomplete window has already closed */
        }
        return undefined;
      }
      await respondWithError(
        interaction,
        embeds.error('Something went wrong on my end.', 'It has been logged. Try again, and tell the bot owner if it keeps happening.'),
      );
    }
    return undefined;
  };
}

/** Throw this for problems the user caused and can fix. */
class UserError extends Error {
  constructor(message, hint) {
    super(message);
    this.name = 'UserError';
    this.userMessage = message;
    this.hint = hint;
  }
}

module.exports = { createInteractionHandler, UserError };
