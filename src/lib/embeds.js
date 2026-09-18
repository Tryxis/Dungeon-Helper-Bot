'use strict';

const { EmbedBuilder } = require('discord.js');

/**
 * Consistent embed styling, plus the length guards v1 didn't have.
 *
 * A long spell like Antimagic Field is ~3.7k characters of description. v1
 * pasted it into a plain `interaction.reply()`, which Discord rejects over 2000
 * characters — the interaction then failed with "The application did not
 * respond". Embeds give 4096 for a description and 1024 per field, and
 * everything below is truncated to fit rather than thrown away.
 */

const COLORS = {
  default: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  critical: 0xfaa61a,
  fumble: 0x992d22,
  magic: 0x9b59b6,
  info: 0x3498db,
  neutral: 0x99aab5,
};

const LIMITS = {
  description: 4096,
  fieldValue: 1024,
  fieldName: 256,
  title: 256,
  footer: 2048,
  fields: 25,
  content: 2000,
};

/** Truncate on a word boundary where possible, with an ellipsis. */
function truncate(text, max) {
  const value = String(text ?? '');
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastBreak = cut.lastIndexOf(' ');
  return `${lastBreak > max * 0.6 ? cut.slice(0, lastBreak) : cut}…`;
}

/**
 * Split long text into embed-field-sized chunks on paragraph/sentence breaks,
 * so a spell's "Description" can continue into "Description (cont.)".
 */
function chunk(text, size = LIMITS.fieldValue) {
  const value = String(text ?? '').trim();
  if (value.length <= size) return value ? [value] : [];

  const chunks = [];
  let remaining = value;
  while (remaining.length > size) {
    let cut = remaining.lastIndexOf('\n\n', size);
    if (cut < size * 0.5) cut = remaining.lastIndexOf('. ', size);
    if (cut < size * 0.5) cut = remaining.lastIndexOf(' ', size);
    if (cut <= 0) cut = size;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function base({ title, description, color = COLORS.default, footer, fields = [] } = {}) {
  const embed = new EmbedBuilder().setColor(color);
  if (title) embed.setTitle(truncate(title, LIMITS.title));
  if (description) embed.setDescription(truncate(description, LIMITS.description));
  if (footer) embed.setFooter({ text: truncate(footer, LIMITS.footer) });
  const safeFields = fields
    .filter((f) => f && f.value !== undefined && f.value !== null && String(f.value).length > 0)
    .slice(0, LIMITS.fields)
    .map((f) => ({
      name: truncate(f.name, LIMITS.fieldName),
      value: truncate(f.value, LIMITS.fieldValue),
      inline: Boolean(f.inline),
    }));
  if (safeFields.length) embed.addFields(safeFields);
  return embed;
}

const error = (message, hint) =>
  base({
    title: '❌ That didn\'t work',
    description: hint ? `${message}\n\n*${hint}*` : message,
    color: COLORS.danger,
  });

const success = (title, description) => base({ title, description, color: COLORS.success });
const info = (title, description) => base({ title, description, color: COLORS.info });

module.exports = { COLORS, LIMITS, truncate, chunk, base, error, success, info };
