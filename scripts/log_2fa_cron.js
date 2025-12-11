#!/usr/bin/env node
// scripts/log_2fa_cron.js
// Cron script: read hex seed from DATA_DIR/seed.txt, generate TOTP, print:
// YYYY-MM-DD HH:MM:SS - 2FA Code: XXXXXX
// - Uses UTC timestamps
// - Exits with non-zero on unexpected error (cron will log)

'use strict';

const fs = require('fs');
const path = require('path');
const { generateTotp } = require('../app/totp'); // expects app/totp.js exists

const DATA_DIR = process.env.DATA_DIR || './data';
const SEED_PATH = path.join(DATA_DIR, 'seed.txt');

function utcNowString() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const HH = String(d.getUTCHours()).padStart(2, '0');
  const MM = String(d.getUTCMinutes()).padStart(2, '0');
  const SS = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}

try {
  if (!fs.existsSync(SEED_PATH)) {
    // Seed missing is not fatal for cron; write to stderr for visibility
    console.error(`${utcNowString()} - Seed not found at ${SEED_PATH}`);
    process.exit(0);
  }

  const hex = fs.readFileSync(SEED_PATH, 'utf8').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    console.error(`${utcNowString()} - Invalid seed format at ${SEED_PATH}`);
    process.exit(0);
  }

  const { code } = generateTotp(hex); // { code, valid_for }
  console.log(`${utcNowString()} - 2FA Code: ${code}`);
  process.exit(0);
} catch (err) {
  console.error(`${utcNowString()} - ERROR: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
}
