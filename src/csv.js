const { createWriteStream } = require('node:fs');
const { rename, unlink } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

function csvLine(values) {
  return values.map((value) => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',') + '\r\n';
}

async function writeCsv(filePath, chunks) {
  // Publish only a complete export; a failed query must not overwrite an existing file.
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await pipeline(Readable.from(chunks), createWriteStream(temporaryPath, { flags: 'wx' }));
    await rename(temporaryPath, filePath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

module.exports = { csvLine, writeCsv };
