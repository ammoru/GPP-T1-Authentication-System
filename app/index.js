const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { generateTotp, verifyTotp } = require('./totp');
const { decryptSeed } = require('./crypto');

dotenv.config();

const app = express();
app.use(express.json());

const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'student_private.pem');
const SEED_PATH = '/data/seed.txt';
const PORT = process.env.PORT || 8080;

app.post('/decrypt-seed', async (req, res) => {
    try {
        const { encrypted_seed } = req.body;

        if (!encrypted_seed) {
            return res.status(400).json({ error: 'Missing encrypted_seed' });
        }

        if (!fs.existsSync(PRIVATE_KEY_PATH)) {
            return res.status(500).json({ error: 'Private key not found' });
        }
        const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

        const hexSeed = decryptSeed(encrypted_seed, privateKeyPem);

        if (!/^[0-9a-f]{64}$/i.test(hexSeed)) {
            return res.status(500).json({ error: 'Decryption failed' });
        }

        const dataDir = path.dirname(SEED_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(SEED_PATH, hexSeed, 'utf8');

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('[decrypt-seed error]', error.message);
        res.status(500).json({ error: 'Decryption failed' });
    }
});

app.get('/generate-2fa', (req, res) => {
    try {
        if (!fs.existsSync(SEED_PATH)) {
            return res.status(500).json({ error: 'Seed not decrypted yet' });
        }

        const hexSeed = fs.readFileSync(SEED_PATH, 'utf8').trim();

        if (!/^[0-9a-f]{64}$/i.test(hexSeed)) {
            return res.status(500).json({ error: 'Invalid seed format' });
        }

        const { code, validFor } = generateTotp(hexSeed);

        res.status(200).json({ code, valid_for: validFor });
    } catch (error) {
        console.error('[generate-2fa error]', error.message);
        res.status(500).json({ error: 'Failed to generate 2FA code' });
    }
});

app.post('/verify-2fa', (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Missing code' });
        }

        if (!fs.existsSync(SEED_PATH)) {
            return res.status(500).json({ error: 'Seed not decrypted yet' });
        }

        const hexSeed = fs.readFileSync(SEED_PATH, 'utf8').trim();

        if (!/^[0-9a-f]{64}$/i.test(hexSeed)) {
            return res.status(500).json({ error: 'Invalid seed format' });
        }

        const isValid = verifyTotp(hexSeed, code, 1);

        res.status(200).json({ valid: isValid });
    } catch (error) {
        console.error('[verify-2fa error]', error.message);
        res.status(500).json({ error: 'Failed to verify 2FA code' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[pki-2fa server] listening on 0.0.0.0:${PORT}`);
});
