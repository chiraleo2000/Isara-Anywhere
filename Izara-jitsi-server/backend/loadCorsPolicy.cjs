'use strict';
/**
 * Resolve shared/corsPolicy.cjs in monorepo dev and Docker (/app/shared).
 */
const path = require('path');
const fs = require('fs');

const candidates = [
  path.join(__dirname, '..', '..', 'shared', 'corsPolicy.cjs'),
  path.join(__dirname, '..', 'shared', 'corsPolicy.cjs'),
  '/shared/corsPolicy.cjs',
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    module.exports = require(candidate);
    return;
  }
}

throw new Error(`corsPolicy.cjs not found. Tried: ${candidates.join(', ')}`);
