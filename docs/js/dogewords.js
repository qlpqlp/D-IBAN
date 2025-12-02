/*******************************************************
 *  DogeWords — Dogecoin Word Address Protocol
 *  Version: 1.0
 *  Features:
 *    - Encode Dogecoin address → Word sequence (mnemonic-style)
 *    - Decode Word sequence → Dogecoin address
 *    - Verify checksum & structure
 *    - Uses short, positive, kind words
 * 
 *  Author: Paulo Vidal (Dogecoin Foundation Dev)
 *  GitHub: https://github.com/qlpqlp
 *  X: https://x.com/inevitable360
 *  Website: https://dogecoin.org
 *******************************************************/

// 64 short, positive, kind words for the base64 alphabet
const WORD_BASE64 = [
    'joy', 'love', 'hope', 'calm', 'warm', 'kind', 'nice', 'cool',
    'safe', 'sure', 'true', 'wise', 'bold', 'free', 'pure', 'rich',
    'soft', 'sweet', 'bright', 'clear', 'fresh', 'gentle', 'happy', 'lucky',
    'magic', 'peace', 'quiet', 'rapid', 'smooth', 'strong', 'sunny', 'swift',
    'trust', 'vital', 'zest', 'zen', 'ace', 'art', 'beam', 'bliss',
    'bloom', 'brave', 'cheer', 'charm', 'dream', 'ease', 'faith', 'flame',
    'flash', 'glow', 'grace', 'heart', 'honor', 'light', 'mercy', 'mirth',
    'noble', 'pride', 'smile', 'spark', 'unity', 'valor', 'vivid', 'whole'
];

// Checksum words (different set for validation)
const CHECKSUM_WORDS = ['valid', 'check', 'proof', 'solid', 'sound', 'sure', 'true', 'good'];

// Address type words
const TYPE_WORDS = {
    '00': 'dog',  // P2PKH
    '01': 'safe', // P2SH
    '02': 'fast', // P2WPKH
    '03': 'time'  // P2SH-CLTV (Time-locked)
};

const TYPE_FROM_WORD = Object.fromEntries(
    Object.entries(TYPE_WORDS).map(([k, v]) => [v, k])
);

/************* UTILITY FUNCTIONS **************/
const DOGEWORDS_BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function hexToBytesLocal(hex) {
    if (!hex) return new Uint8Array(0);
    if (hex.length % 2) hex = '0' + hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function bytesToHexLocal(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/************* BASE58 ENCODING/DECODING **************/
function base58ToBytesLocal(str) {
    if (typeof base58ToBytes !== 'undefined') {
        return base58ToBytes(str);
    }
    
    if (!str) return new Uint8Array(0);
    let num = 0n;
    for (const c of str) {
        const val = DOGEWORDS_BASE58.indexOf(c);
        if (val < 0) throw new Error("Invalid Base58 character");
        num = num * 58n + BigInt(val);
    }

    let hex = num.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    const bytes = hexToBytesLocal(hex);

    let zeroCount = 0;
    for (const c of str) {
        if (c === '1') zeroCount++; else break;
    }

    if (bytes.length === 0) {
        return Uint8Array.from({length: zeroCount}, () => 0);
    }

    const out = new Uint8Array(zeroCount + bytes.length);
    out.set(bytes, zeroCount);
    return out;
}

function bytesToBase58Local(bytes) {
    if (typeof bytesToBase58 !== 'undefined') {
        return bytesToBase58(bytes);
    }
    
    let num = BigInt("0x" + bytesToHexLocal(bytes));
    let out = "";

    while (num > 0) {
        const r = num % 58n;
        num = num / 58n;
        out = DOGEWORDS_BASE58[Number(r)] + out;
    }

    for (const b of bytes) {
        if (b === 0) out = "1" + out;
        else break;
    }

    return out || "1";
}

/************* WORD ENCODING/DECODING **************/
// Standard base64 algorithm using words instead of characters
// 3 bytes (24 bits) -> 4 words (24 bits = 4 * 6 bits)
function bytesToWords(bytes) {
    let wordString = "";
    const len = bytes.length;
    let i = 0;
    
    // Process complete groups of 3 bytes
    while (i + 2 < len) {
        const byte1 = bytes[i];
        const byte2 = bytes[i + 1];
        const byte3 = bytes[i + 2];
        
        const combined = (byte1 << 16) | (byte2 << 8) | byte3;
        
        wordString += WORD_BASE64[(combined >> 18) & 0x3F] + ' ';
        wordString += WORD_BASE64[(combined >> 12) & 0x3F] + ' ';
        wordString += WORD_BASE64[(combined >> 6) & 0x3F] + ' ';
        wordString += WORD_BASE64[combined & 0x3F] + ' ';
        
        i += 3;
    }
    
    // Handle remaining bytes
    if (i < len) {
        if (i + 1 < len) {
            // 2 bytes remaining
            const byte1 = bytes[i];
            const byte2 = bytes[i + 1];
            const combined = (byte1 << 8) | byte2;
            
            wordString += WORD_BASE64[(combined >> 12) & 0x3F] + ' ';
            wordString += WORD_BASE64[(combined >> 6) & 0x3F] + ' ';
            wordString += WORD_BASE64[combined & 0x3F] + ' ';
        } else {
            // 1 byte remaining
            const byte1 = bytes[i];
            
            wordString += WORD_BASE64[(byte1 >> 2) & 0x3F] + ' ';
            wordString += WORD_BASE64[((byte1 & 0x03) << 4) & 0x3F] + ' ';
        }
    }
    
    return wordString.trim();
}

function wordsToBytes(wordString, expectedLength = null) {
    const words = wordString.trim().split(/\s+/).filter(w => w.length > 0);
    const bytes = [];
    const len = words.length;
    let i = 0;
    
    // Process complete groups of 4 words (representing 3 bytes)
    while (i + 3 < len) {
        const idx1 = WORD_BASE64.indexOf(words[i]);
        const idx2 = WORD_BASE64.indexOf(words[i + 1]);
        const idx3 = WORD_BASE64.indexOf(words[i + 2]);
        const idx4 = WORD_BASE64.indexOf(words[i + 3]);
        
        if (idx1 < 0 || idx2 < 0 || idx3 < 0 || idx4 < 0) {
            throw new Error(`Invalid word in payload at position ${i}: ${words[i] || 'unknown'}`);
        }
        
        const combined = (idx1 << 18) | (idx2 << 12) | (idx3 << 6) | idx4;
        
        bytes.push((combined >> 16) & 0xFF);
        bytes.push((combined >> 8) & 0xFF);
        bytes.push(combined & 0xFF);
        
        i += 4;
    }
    
    // Handle remaining words
    if (i < len) {
        if (i + 2 < len) {
            // 3 words remaining (representing 2 bytes)
            const idx1 = WORD_BASE64.indexOf(words[i]);
            const idx2 = WORD_BASE64.indexOf(words[i + 1]);
            const idx3 = WORD_BASE64.indexOf(words[i + 2]);
            
            if (idx1 < 0 || idx2 < 0 || idx3 < 0) {
                throw new Error(`Invalid word in payload at position ${i}`);
            }
            
            const combined = (idx1 << 12) | (idx2 << 6) | idx3;
            bytes.push((combined >> 8) & 0xFF);
            bytes.push(combined & 0xFF);
        } else if (i + 1 < len) {
            // 2 words remaining (representing 1 byte)
            const idx1 = WORD_BASE64.indexOf(words[i]);
            const idx2 = WORD_BASE64.indexOf(words[i + 1]);
            
            if (idx1 < 0 || idx2 < 0) {
                throw new Error(`Invalid word in payload at position ${i}`);
            }
            
            const byte = (idx1 << 2) | (idx2 >> 4);
            bytes.push(byte & 0xFF);
        }
    }
    
    if (expectedLength !== null) {
        if (bytes.length !== expectedLength) {
            if (bytes.length > expectedLength) {
                return new Uint8Array(bytes.slice(0, expectedLength));
            } else {
                throw new Error(`Decoded ${bytes.length} bytes, expected ${expectedLength}`);
            }
        }
    }
    
    return new Uint8Array(bytes);
}

/************* CHECKSUM CALCULATION **************/
function calculateChecksum(data) {
    let sum = 0;
    for (const byte of data) {
        sum += byte;
    }
    return sum % CHECKSUM_WORDS.length;
}

/************* ADDRESS TYPE DETECTION **************/
function detectAddressType(dogeAddress) {
    const clean = dogeAddress.trim();
    
    if (clean.toLowerCase().startsWith('doge1')) {
        return { code: "02", name: "P2WPKH", description: "Pay-to-Witness-Public-Key-Hash (Bech32)" };
    }
    
    if (clean.startsWith('9') || clean.startsWith('A')) {
        return { code: "01", name: "P2SH", description: "Pay-to-Script-Hash (Multisig, Time-locked, etc.)" };
    }
    
    if (clean.startsWith('D')) {
        return { code: "00", name: "P2PKH", description: "Pay-to-Public-Key-Hash" };
    }
    
    return { code: "00", name: "P2PKH", description: "Pay-to-Public-Key-Hash (detected)" };
}

/************* ENCODE DOGE → WORDS **************/
function encodeDogeWords(dogeAddress) {
    const addressType = detectAddressType(dogeAddress);
    let payload;
    
    // Handle Bech32 addresses
    if (addressType.code === "02") {
        const encoder = new TextEncoder();
        payload = encoder.encode(dogeAddress);
        if (payload.length < 25) {
            const padded = new Uint8Array(25);
            padded.set(payload, 25 - payload.length);
            payload = padded;
        } else if (payload.length > 25) {
            payload = payload.slice(0, 25);
        }
    } else {
        // Base58 addresses
        if (typeof base58ToBytes !== 'undefined') {
            payload = base58ToBytes(dogeAddress);
        } else {
            payload = base58ToBytesLocal(dogeAddress);
        }
        if (payload.length !== 25) {
            throw new Error(`Invalid Dogecoin address length: expected 25 bytes, got ${payload.length}`);
        }
    }
    
    // Encode payload to words
    const wordPayload = bytesToWords(payload);
    
    // Calculate checksum
    const checksumIndex = calculateChecksum(payload);
    const checksumWord = CHECKSUM_WORDS[checksumIndex];
    
    // Get type word
    const typeWord = TYPE_WORDS[addressType.code];
    
    // Format: [Type] [Payload] [Checksum]
    return {
        words: typeWord + ' ' + wordPayload + ' ' + checksumWord,
        type: addressType,
        compact: true
    };
}

/************* VERIFY WORD ADDRESS **************/
function verifyDogeWords(wordAddress) {
    if (!wordAddress || wordAddress.trim().length === 0) return false;
    
    try {
        const words = wordAddress.trim().split(/\s+/).filter(w => w.length > 0);
        
        if (words.length < 3) return false;
        
        // Extract components
        const typeWord = words[0];
        const checksumWord = words[words.length - 1];
        const payloadWords = words.slice(1, -1);
        
        // Verify type word
        const typeCode = Object.keys(TYPE_WORDS).find(key => {
            return TYPE_WORDS[key] === typeWord;
        });
        if (!typeCode) return false;
        
        // Verify checksum word
        const checksumIndex = CHECKSUM_WORDS.indexOf(checksumWord);
        if (checksumIndex < 0) return false;
        
        // Decode payload (25 bytes for Dogecoin addresses)
        const payloadBytes = wordsToBytes(payloadWords.join(' '), 25);
        
        // Verify checksum
        const expectedChecksum = calculateChecksum(payloadBytes);
        const actualChecksum = checksumIndex;
        
        return expectedChecksum === actualChecksum;
    } catch (error) {
        console.error('DogeWords verification error:', error);
        return false;
    }
}

/************* DECODE WORDS → DOGE **************/
function decodeDogeWords(wordAddress) {
    if (!verifyDogeWords(wordAddress)) {
        throw new Error("Invalid DogeWords checksum or format");
    }
    
    const words = wordAddress.trim().split(/\s+/).filter(w => w.length > 0);
    
    // Extract components
    const typeWord = words[0];
    const payloadWords = words.slice(1, -1);
    
    // Get type code
    const typeCode = Object.keys(TYPE_WORDS).find(key => {
        return TYPE_WORDS[key] === typeWord;
    });
    if (!typeCode) {
        throw new Error("Invalid type word");
    }
    const addressType = {
        "00": { name: "P2PKH", description: "Pay-to-Public-Key-Hash" },
        "01": { name: "P2SH", description: "Pay-to-Script-Hash (Multisig, Time-locked, etc.)" },
        "02": { name: "P2WPKH", description: "Pay-to-Witness-Public-Key-Hash (Bech32)" },
        "03": { name: "P2SH-CLTV", description: "Pay-to-Script-Hash with CheckLockTimeVerify (Time-locked)" }
    }[typeCode] || { name: "Unknown", description: "Unknown address type" };
    
    // Decode payload
    const payloadBytes = wordsToBytes(payloadWords.join(' '), 25);
    
    // Reconstruct address
    let dogeAddress;
    if (typeCode === "02") {
        const decoder = new TextDecoder();
        dogeAddress = decoder.decode(payloadBytes).replace(/\0/g, '').trim();
    } else {
        // Base58 addresses
        if (typeof bytesToBase58 !== 'undefined') {
            dogeAddress = bytesToBase58(payloadBytes);
        } else {
            dogeAddress = bytesToBase58Local(payloadBytes);
        }
    }
    
    return {
        address: dogeAddress,
        type: {
            code: typeCode,
            ...addressType
        }
    };
}

// Make functions available globally for browser
if (typeof window !== 'undefined') {
    window.encodeDogeWords = encodeDogeWords;
    window.decodeDogeWords = decodeDogeWords;
    window.verifyDogeWords = verifyDogeWords;
}

// Export functions for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encodeDogeWords,
        decodeDogeWords,
        verifyDogeWords,
        detectAddressType,
        WORD_BASE64,
        TYPE_WORDS
    };
}

