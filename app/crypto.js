

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");


const DEFAULT_PRIVATE_KEY_PATH =
  process.env.PRIVATE_KEY_PATH || path.join(__dirname, "..", "student_private.pem");


function loadPrivateKey(privateKeyPath = DEFAULT_PRIVATE_KEY_PATH) {
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`Private key not found at: ${privateKeyPath}`);
  }
  return fs.readFileSync(privateKeyPath, "utf8");
}


function decryptSeedBase64(encryptedB64, privateKeyPath = DEFAULT_PRIVATE_KEY_PATH) {
  if (!encryptedB64 || typeof encryptedB64 !== "string") {
    throw new Error("Invalid encrypted seed - must be base64 string");
  }

  const encryptedBuffer = Buffer.from(encryptedB64, "base64");
  const privateKey = loadPrivateKey(privateKeyPath);

  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      encryptedBuffer
    );

    return decrypted.toString("utf8").trim();
  } catch (err) {
    throw new Error("Decryption failed: " + err.message);
  }
}

module.exports = {
  decryptSeedBase64,
};
