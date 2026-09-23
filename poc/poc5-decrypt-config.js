

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

console.log("=== PoC 5: Decrypt Firebase & ICE Configuration ===");
console.log("Static Firebase Key: keysefghijkldesk");
console.log("Static ICE Key:      icesefghijklmnop");
console.log("\nUsage:");
console.log("const fbConfig = decryptECB(encryptedPayload, FIREBASE_KEY);");
