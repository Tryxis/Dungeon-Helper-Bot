'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

/**
 * A tiny persistent JSON store.
 *
 * v1 persisted the counter with a synchronous `fs.writeFileSync` inside the
 * interaction handler, reading from a relative path. Three problems:
 *   - the relative path meant it only worked if you launched from the repo root;
 *   - a synchronous write blocks the whole event loop, so the bot stalls for
 *     every other user while the disk works;
 *   - a crash mid-write left a truncated file that failed to parse on restart,
 *     silently resetting the count to 0.
 *
 * This version resolves paths absolutely, writes asynchronously via a
 * write-behind queue (so a burst of updates collapses into one write), and
 * writes atomically: temp file, fsync, rename.
 */
class JsonStore {
  /**
   * @param {string} file absolute path to the JSON file
   * @param {any} defaults value used when the file is missing or corrupt
   * @param {{flushDelayMs?: number, logger?: object}} [opts]
   */
  constructor(file, defaults = {}, { flushDelayMs = 250, logger = console } = {}) {
    this.file = path.resolve(file);
    this.defaults = defaults;
    this.flushDelayMs = flushDelayMs;
    this.logger = logger;
    this.data = structuredClone(defaults);
    this._timer = null;
    this._writing = null;
    this._dirty = false;
  }

  /** Load from disk. Never throws: a broken file is backed up and reset. */
  async load() {
    try {
      const raw = await fsp.readFile(this.file, 'utf8');
      this.data = JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.data = structuredClone(this.defaults);
        await this.flush();
      } else {
        const backup = `${this.file}.corrupt-${Date.now()}`;
        this.logger.warn?.(`Could not parse ${this.file} (${error.message}); moving it to ${backup} and starting fresh.`);
        try {
          await fsp.rename(this.file, backup);
        } catch {
          /* best effort */
        }
        this.data = structuredClone(this.defaults);
        await this.flush();
      }
    }
    return this.data;
  }

  get(key, fallback) {
    return key === undefined ? this.data : (this.data[key] ?? fallback);
  }

  set(key, value) {
    this.data[key] = value;
    this.markDirty();
    return value;
  }

  /** Mutate the whole document then schedule a save. */
  update(mutator) {
    const result = mutator(this.data);
    this.markDirty();
    return result;
  }

  markDirty() {
    this._dirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush().catch((error) => this.logger.error?.('Store flush failed:', error));
    }, this.flushDelayMs);
    this._timer.unref?.();
  }

  /** Write immediately. Serialised so two flushes can't interleave. */
  async flush() {
    if (this._writing) {
      await this._writing;
    }
    this._writing = this._write();
    try {
      await this._writing;
    } finally {
      this._writing = null;
    }
  }

  async _write() {
    const payload = `${JSON.stringify(this.data, null, 2)}\n`;
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fsp.mkdir(path.dirname(this.file), { recursive: true });
    const handle = await fsp.open(tmp, 'w');
    try {
      await handle.writeFile(payload, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fsp.rename(tmp, this.file);
    this._dirty = false;
  }

  /** Synchronous last-chance save, for process exit handlers. */
  flushSync() {
    if (!this._dirty) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.exit.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
      fs.renameSync(tmp, this.file);
      this._dirty = false;
    } catch (error) {
      this.logger.error?.('Final store write failed:', error);
    }
  }

  close() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
    this.flushSync();
  }
}

module.exports = { JsonStore };
