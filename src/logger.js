'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * A dependency-free levelled logger. The old code scattered `console.log`
 * everywhere, including logging every roll result and every condition lookup at
 * full volume; those are now `debug` and stay quiet in production.
 */
function createLogger(level = 'info', out = console) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const emit = (name, method) => (...args) => {
    if (LEVELS[name] > threshold) return;
    const stamp = new Date().toISOString();
    out[method](`${stamp} [${name.toUpperCase()}]`, ...args);
  };

  return {
    level,
    error: emit('error', 'error'),
    warn: emit('warn', 'warn'),
    info: emit('info', 'log'),
    debug: emit('debug', 'log'),
    child(prefix) {
      const parent = this;
      const wrap = (name) => (...args) => parent[name](`[${prefix}]`, ...args);
      return { level, error: wrap('error'), warn: wrap('warn'), info: wrap('info'), debug: wrap('debug'), child: this.child };
    },
  };
}

module.exports = { createLogger, LEVELS };
