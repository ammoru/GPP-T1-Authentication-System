const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.join(process.cwd(), 'student_private.pem');
const instructorPubPath = path.join(process.cwd(), 'instructor_public.pem');

function loadPEM(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { console.error('Cannot read', p); process.exit(2); }
}

async function main() {
  const commitHash = process.argv[2] || (require('child_process').execSync('git log -1 --format=%H').toString().trim());
  if (!/^[0-9a-f]{40}$/i.test(commitHash)) {
    console.error('Invalid commit hash:', commitHash);
    process.exit(2);
  }

  const privPEM = loadPEM(privateKeyPath);
  const instrPEM = loadPEM(instructorPubPath);

  // Sign commit hash (ASCII) with RSA-PSS SHA256, salt length = max
  const signer = crypto.createSign('sha256');
  signer.update(commitHash, 'utf8');
  signer.end();
  const privateKey = { key: privPEM, passphrase: '' };
  const signature = signer.sign({
    key: privPEM,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN
  });

  // Encrypt signature with instructor public key using OAEP-SHA256
  const encrypted = crypto.publicEncrypt({
    key: instrPEM,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, signature);

  // Output base64 single-line
  const b64 = encrypted.toString('base64');
  console.log('COMMIT_HASH=' + commitHash);
  console.log('ENCRYPTED_SIGNATURE_BASE64=' + b64);
}

main().catch(err => { console.error(err); process.exit(1); });