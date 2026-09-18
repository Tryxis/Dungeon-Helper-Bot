'use strict';

const path = require('node:path');

require('dotenv').config();

/**
 * Centralised, validated configuration.
 *
 * The old version did `require('./config.json')` from five different files,
 * which meant the token was committed-adjacent, undocumented and impossible to
 * override per environment. Everything now comes from the environment (or a
 * git-ignored .env) and is validated once, at startup, with a clear error.
 */

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const BANTER_MODES = ['rude', 'clean', 'off'];

function readConfig(env = process.env) {
  const config = {
    token: env.DISCORD_TOKEN?.trim() || '',
    clientId: env.DISCORD_CLIENT_ID?.trim() || '',
    guildId: env.DISCORD_GUILD_ID?.trim() || '',
    dataDir: path.resolve(env.DATA_DIR?.trim() || path.join(__dirname, '..', 'data')),
    logLevel: (env.LOG_LEVEL?.trim() || 'info').toLowerCase(),
    banter: (env.BANTER?.trim() || 'rude').toLowerCase(),
    nodeEnv: env.NODE_ENV?.trim() || 'development',
  };

  if (!LOG_LEVELS.includes(config.logLevel)) config.logLevel = 'info';
  if (!BANTER_MODES.includes(config.banter)) config.banter = 'rude';

  return config;
}

/**
 * @param {object} config
 * @param {{ requireClientId?: boolean }} [opts]
 * @returns {string[]} list of human-readable problems
 */
function validate(config, { requireClientId = false } = {}) {
  const problems = [];
  if (!config.token) {
    problems.push('DISCORD_TOKEN is missing. Copy .env.example to .env and paste your bot token.');
  }
  if (requireClientId && !config.clientId) {
    problems.push('DISCORD_CLIENT_ID is missing. Find it under "General Information" in the Discord developer portal.');
  }
  return problems;
}

function assertValid(config, opts) {
  const problems = validate(config, opts);
  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
  return config;
}

module.exports = { readConfig, validate, assertValid, config: readConfig() };
