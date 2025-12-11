const hiBase32 = require('hi-base32');
const { totp } = require('otplib');

totp.options = { step: 30, digits: 6, algorithm: 'sha1' };

function hexToBase32(hexSeed) {
  if (!hexSeed || typeof hexSeed !== 'string') throw new Error('Missing hex seed');
  const b = Buffer.from(hexSeed, 'hex');
  let b32 = hiBase32.encode(b);
  // strip padding '='
  b32 = b32.replace(/=+$/g, '');
  return b32;
}


function generateTotp(hexSeed) {
  const b32 = hexToBase32(hexSeed);
  const code = totp.generate(b32);
  const now = Math.floor(Date.now() / 1000);
  const valid_for = 30 - (now % 30);
  return { code, valid_for };
}


function verifyTotp(hexSeed, code, window = 1) {
  const b32 = hexToBase32(hexSeed);
  // totp.check accepts string code
  return totp.check(String(code), b32, { window });
}

module.exports = {
  hexToBase32,
  generateTotp,
  verifyTotp
};
