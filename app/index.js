
require("dotenv").config();

const express = require("express");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { generateTotp, verifyTotp } = require('./totp');
const { decryptSeedBase64 } = require("./crypto");

const app = express();
app.use(express.json({ limit: "1mb" }));


const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || "./data";
const SEED_PATH = path.join(DATA_DIR, "seed.txt");


app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


app.post("/decrypt-seed", async (req, res) => {
  try {
    const { encrypted_seed } = req.body || {};

    if (!encrypted_seed) {
      return res.status(400).json({ error: "Missing encrypted_seed" });
    }

    // 1️⃣ Decrypt the seed
    let decryptedHex = "";
    try {
      decryptedHex = decryptSeedBase64(encrypted_seed);
    } catch (err) {
      console.error("Decryption error:", err.message);
      return res.status(500).json({ error: "Decryption failed" });
    }

    // 2️⃣ Validate seed format: must be 64 hex chars
    if (!/^[0-9a-fA-F]{64}$/.test(decryptedHex.trim())) {
      console.error("Invalid seed format:", decryptedHex);
      return res.status(500).json({ error: "Decryption failed" });
    }

    // 3️⃣ Persist to /data/seed.txt (or ./data/seed.txt in dev)
        // 3️⃣ Persist to /data/seed.txt (or ./data/seed.txt in dev)
    try {
      console.log('DEBUG: About to create DATA_DIR at:', DATA_DIR);
      console.log('DEBUG: SEED_PATH will be:', SEED_PATH);
      console.log('DEBUG: process.cwd():', process.cwd());
      console.log('DEBUG: __dirname (file dir):', __dirname);

      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(SEED_PATH, decryptedHex.trim(), {
        encoding: "utf8",
        mode: 0o600,
      });

      // Verify file exists and print stats
      try {
        const st = await fs.stat(SEED_PATH);
        console.log(`DEBUG: WROTE SEED -> ${SEED_PATH} (size=${st.size} bytes, mode=${(st.mode & 0o777).toString(8)})`);
      } catch (statErr) {
        console.error('DEBUG: write succeeded but stat failed:', statErr);
      }
    } catch (err) {
      console.error("Error writing seed file:", err);
      return res.status(500).json({ error: "Failed to persist seed" });
    }


    // Success 🎉
    return res.json({ status: "ok" });

  } catch (err) {
    console.error("Unexpected server error:", err);
    return res.status(500).json({ error: "Decryption failed" });
  }
});

// GET /generate-2fa
app.get('/generate-2fa', async (req, res) => {
  try {
    if (!fsSync.existsSync(SEED_PATH)) return res.status(500).json({ error: 'Seed not decrypted yet' });
    const hex = (await fs.readFile(SEED_PATH, 'utf8')).trim();
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) return res.status(500).json({ error: 'Seed not decrypted yet' });

    const { code, valid_for } = generateTotp(hex);
    return res.json({ code, valid_for });
  } catch (err) {
    console.error('/generate-2fa err:', err);
    return res.status(500).json({ error: 'Seed not decrypted yet' });
  }
});

// POST /verify-2fa
app.post('/verify-2fa', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Missing code' });

    if (!fsSync.existsSync(SEED_PATH)) return res.status(500).json({ error: 'Seed not decrypted yet' });
    const hex = (await fs.readFile(SEED_PATH, 'utf8')).trim();
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) return res.status(500).json({ error: 'Seed not decrypted yet' });

    const valid = verifyTotp(hex, String(code), 1); // ±1 period tolerance
    return res.json({ valid: Boolean(valid) });
  } catch (err) {
    console.error('/verify-2fa err:', err);
    return res.status(500).json({ error: 'Seed not decrypted yet' });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`DATA_DIR=${DATA_DIR}`);
  console.log(`SEED_PATH=${SEED_PATH}`);
});
