/*******************************************************
 *  Fixed DogeMoji — Dogecoin Emoji Address Protocol
 *  Version: 1.1 (fixed reversible emoji base64 + robust splitting)
 *  Features:
 *    - Encode Dogecoin address → Emoji sequence
 *    - Decode Emoji sequence → Dogecoin address
 *    - Verify checksum & structure
 *    - Compact and user-friendly format
 * 
 *  Author: Paulo Vidal (Dogecoin Foundation Dev)
 *  GitHub: https://github.com/qlpqlp
 *  X: https://x.com/inevitable360
 *  Website: https://dogecoin.org
 *******************************************************/

// 64 unique emojis for the base64 alphabet (no duplicates)
const EMOJI_BASE64 = [
    '🐕', '🚀', '🌙', '💎', '⭐', '🔥', '💫', '✨',
    '🌟', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈',
    '🥉', '🎯', '🎪', '🎨', '🎭', '🎬', '🎤', '🎧',
    '🎮', '🕹', '🎲', '🧩', '🎸', '🎹', '🥁', '🎺',
    '🎷', '🎻', '🎵', '🎶', '🎼', '🎞', '📽', '🎥',
    '📹', '📷', '📸', '📱', '💻', '⌚', '📺', '📻',
    '🔊', '🔉', '🔈', '📢', '📣', '🔔', '🔕', '📯',
    '📮', '💌', '💐', '🌹', '🌺', '🌻', '🌼', '🌱'
];

// Padding symbol for the emoji-base64 encoding (we keep it a single ASCII '=' to be safe and predictable)
const BASE64_PADDING = '=';

// Checksum emojis (different set for validation)
const CHECKSUM_EMOJIS = ['✅', '✔️', '✓', '☑️', '🔒', '🔐', '🔑', '🎫'];

// Address type emojis
const TYPE_EMOJIS = {
    '00': '🐕', // P2PKH
    '01': '🔐', // P2SH
    '02': '🚀', // P2WPKH
    '03': '⏰'  // P2SH-CLTV (Time-locked)
};

const TYPE_FROM_EMOJI = Object.fromEntries(
    Object.entries(TYPE_EMOJIS).map(([k, v]) => [v, k])
);

/************* UTILITY FUNCTIONS **************/
// Use BASE58 from diban.js if available (it's in module scope, so we'll define our own)
const DOGEMOJI_BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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
// Use the Base58 functions from diban.js if available, otherwise define local versions
function base58ToBytesLocal(str) {
    // Try to use the function from diban.js if available
    if (typeof base58ToBytes !== 'undefined') {
        return base58ToBytes(str);
    }
    
    // Local implementation (robust)
    if (!str) return new Uint8Array(0);
    let num = 0n;
    for (const c of str) {
        const val = DOGEMOJI_BASE58.indexOf(c);
        if (val < 0) throw new Error("Invalid Base58 character");
        num = num * 58n + BigInt(val);
    }

    // convert bigint to hex
    let hex = num.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    const bytes = hexToBytesLocal(hex);

    // handle leading '1's => leading zero bytes
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
    // Try to use the function from diban.js if available
    if (typeof bytesToBase58 !== 'undefined') {
        return bytesToBase58(bytes);
    }
    
    // Local implementation (should match diban.js exactly)
    let num = BigInt("0x" + bytesToHexLocal(bytes));
    let out = "";

    while (num > 0) {
        const r = num % 58n;
        num = num / 58n;
        out = DOGEMOJI_BASE58[Number(r)] + out;
    }

    // leading zeros
    for (const b of bytes) {
        if (b === 0) out = "1" + out;
        else break;
    }

    return out || "1";
}

/************* EMOJI ENCODING/DECODING **************/
// Standard base64 algorithm using emojis instead of characters
// 3 bytes (24 bits) -> 4 emojis (24 bits = 4 * 6 bits)
function bytesToEmoji(bytes) {
    let emojiString = "";
    const len = bytes.length;
    let i = 0;
    
    // Process complete groups of 3 bytes
    while (i + 2 < len) {
        const byte1 = bytes[i];
        const byte2 = bytes[i + 1];
        const byte3 = bytes[i + 2];
        
        // Combine into 24-bit value (use regular numbers, max is 0xFFFFFF which fits in 32-bit)
        const combined = (byte1 << 16) | (byte2 << 8) | byte3;
        
        // Extract 4 groups of 6 bits
        emojiString += EMOJI_BASE64[(combined >> 18) & 0x3F];
        emojiString += EMOJI_BASE64[(combined >> 12) & 0x3F];
        emojiString += EMOJI_BASE64[(combined >> 6) & 0x3F];
        emojiString += EMOJI_BASE64[combined & 0x3F];
        
        i += 3;
    }
    
    // Handle remaining bytes (standard base64 padding logic)
    if (i < len) {
        if (i + 1 < len) {
            // 2 bytes remaining (16 bits) -> 3 emojis + 1 padding (we skip padding)
            const byte1 = bytes[i];
            const byte2 = bytes[i + 1];
            const combined = (byte1 << 8) | byte2;
            
            emojiString += EMOJI_BASE64[(combined >> 12) & 0x3F];
            emojiString += EMOJI_BASE64[(combined >> 6) & 0x3F];
            emojiString += EMOJI_BASE64[combined & 0x3F];
            // Note: In standard base64, 4th character would be '=', but we don't encode it
        } else {
            // 1 byte remaining (8 bits) -> 2 emojis + 2 padding (we skip padding)
            const byte1 = bytes[i];
            
            emojiString += EMOJI_BASE64[(byte1 >> 2) & 0x3F];
            emojiString += EMOJI_BASE64[((byte1 & 0x03) << 4) & 0x3F];
            // Note: In standard base64, 3rd and 4th characters would be '=', but we don't encode them
        }
    }
    
    return emojiString;
}

function emojiToBytes(emojiString, expectedLength = null) {
    const emojis = splitEmojis(emojiString);
    const bytes = [];
    const len = emojis.length;
    let i = 0;
    
    // Process complete groups of 4 emojis (representing 3 bytes)
    while (i + 3 < len) {
        const idx1 = findEmojiIndex(emojis[i], EMOJI_BASE64);
        const idx2 = findEmojiIndex(emojis[i + 1], EMOJI_BASE64);
        const idx3 = findEmojiIndex(emojis[i + 2], EMOJI_BASE64);
        const idx4 = findEmojiIndex(emojis[i + 3], EMOJI_BASE64);
        
        if (idx1 < 0 || idx2 < 0 || idx3 < 0 || idx4 < 0) {
            throw new Error(`Invalid emoji in payload at position ${i}`);
        }
        
        // Combine 4 groups of 6 bits into 24-bit value
        const combined = (idx1 << 18) | (idx2 << 12) | (idx3 << 6) | idx4;
        
        // Extract 3 bytes
        bytes.push((combined >> 16) & 0xFF);
        bytes.push((combined >> 8) & 0xFF);
        bytes.push(combined & 0xFF);
        
        i += 4;
    }
    
    // Handle remaining emojis (with padding handling)
    if (i < len) {
        if (i + 2 < len) {
            // 3 emojis remaining (representing 2 bytes, 4th would be padding)
            const idx1 = findEmojiIndex(emojis[i], EMOJI_BASE64);
            const idx2 = findEmojiIndex(emojis[i + 1], EMOJI_BASE64);
            const idx3 = findEmojiIndex(emojis[i + 2], EMOJI_BASE64);
            
            if (idx1 < 0 || idx2 < 0 || idx3 < 0) {
                throw new Error(`Invalid emoji in payload at position ${i}`);
            }
            
            const combined = (idx1 << 12) | (idx2 << 6) | idx3;
            bytes.push((combined >> 8) & 0xFF);
            bytes.push(combined & 0xFF);
        } else if (i + 1 < len) {
            // 2 emojis remaining (representing 1 byte, 3rd and 4th would be padding)
            const idx1 = findEmojiIndex(emojis[i], EMOJI_BASE64);
            const idx2 = findEmojiIndex(emojis[i + 1], EMOJI_BASE64);
            
            if (idx1 < 0 || idx2 < 0) {
                throw new Error(`Invalid emoji in payload at position ${i}`);
            }
            
            // idx1 has top 6 bits, idx2 has bottom 2 bits in top 2 positions
            // byte = (idx1 << 2) | (idx2 >> 4)
            const byte = (idx1 << 2) | (idx2 >> 4);
            bytes.push(byte & 0xFF);
        }
    }
    
    // Ensure exact length (trim if needed based on expectedLength)
    if (expectedLength !== null) {
        if (bytes.length !== expectedLength) {
            if (bytes.length > expectedLength) {
                // Trim excess bytes (shouldn't happen, but be safe)
                return new Uint8Array(bytes.slice(0, expectedLength));
            } else {
                // Not enough bytes - this indicates a problem
                throw new Error(`Decoded ${bytes.length} bytes, expected ${expectedLength}`);
            }
        }
    }
    
    return new Uint8Array(bytes);
}

/************* CHECKSUM CALCULATION **************/
function calculateChecksum(data) {
    // Simple checksum: sum of all bytes mod 8 (for 8 checksum emojis)
    let sum = 0;
    for (const byte of data) {
        sum += byte;
    }
    return sum % CHECKSUM_EMOJIS.length;
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

/************* ENCODE DOGE → EMOJI **************/
function encodeDogeMoji(dogeAddress) {
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
        // Base58 addresses - use the function from diban.js directly if available
        if (typeof base58ToBytes !== 'undefined') {
            payload = base58ToBytes(dogeAddress);
        } else {
            payload = base58ToBytesLocal(dogeAddress);
        }
        // Valid Dogecoin Base58Check addresses are exactly 25 bytes (1 version + 20 hash + 4 checksum)
        // DO NOT pad or truncate - this would corrupt the address checksum!
        if (payload.length !== 25) {
            throw new Error(`Invalid Dogecoin address length: expected 25 bytes, got ${payload.length}`);
        }
    }
    
    // Encode payload to emojis (should be exactly 25 bytes)
    const emojiPayload = bytesToEmoji(payload);
    
    // Calculate checksum
    const checksumIndex = calculateChecksum(payload);
    const checksumEmoji = CHECKSUM_EMOJIS[checksumIndex];
    
    // Get type emoji
    const typeEmoji = TYPE_EMOJIS[addressType.code];
    
    // Format: [Type][Payload][Checksum]
    return {
        emoji: typeEmoji + emojiPayload + checksumEmoji,
        type: addressType,
        compact: true
    };
}

/************* EMOJI STRING HELPERS **************/
// Normalize emoji by removing variation selectors for matching
function normalizeEmoji(emoji) {
    // Remove variation selectors (U+FE00-U+FE0F) and zero-width joiners
    return emoji.replace(/[\uFE00-\uFE0F\u200D]/g, '');
}

// Find emoji in array (handles variation selectors)
function findEmojiIndex(emoji, array) {
    // Try exact match first
    let index = array.indexOf(emoji);
    if (index >= 0) return index;
    
    // Try normalized match
    const normalized = normalizeEmoji(emoji);
    for (let i = 0; i < array.length; i++) {
        if (normalizeEmoji(array[i]) === normalized) {
            return i;
        }
    }
    return -1;
}

// Properly split emoji string into array of emojis
function splitEmojis(str) {
    const emojis = [];
    const allEmojis = [...EMOJI_BASE64, ...CHECKSUM_EMOJIS, ...Object.values(TYPE_EMOJIS)];
    
    // Use a more robust approach: try to match known emojis
    let i = 0;
    while (i < str.length) {
        let matched = false;
        
        // Try matching from 1 to 4 characters (for emojis with variation selectors)
        for (let len = Math.min(4, str.length - i); len >= 1; len--) {
            const candidate = str.substring(i, i + len);
            
            // Check if it matches any emoji in our sets
            for (const knownEmoji of allEmojis) {
                if (candidate === knownEmoji || normalizeEmoji(candidate) === normalizeEmoji(knownEmoji)) {
                    emojis.push(knownEmoji); // Use the canonical version
                    i += len;
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }
        
        if (!matched) {
            // Skip whitespace and other non-emoji characters
            if (/\s/.test(str[i])) {
                i++;
            } else {
                // Unknown character, skip it
                i++;
            }
        }
    }
    
    return emojis;
}

// Join emoji array back to string
function joinEmojis(emojiArray) {
    return emojiArray.join('');
}

/************* VERIFY EMOJI ADDRESS **************/
function verifyDogeMoji(emojiAddress) {
    if (!emojiAddress || emojiAddress.trim().length === 0) return false;
    
    try {
        // Properly split emojis (handles multi-character emojis)
        const emojis = splitEmojis(emojiAddress.trim());
        
        if (emojis.length < 3) return false;
        
        // Extract components
        const typeEmoji = emojis[0];
        const checksumEmoji = emojis[emojis.length - 1];
        const payloadEmojis = emojis.slice(1, -1);
        
        // Verify type emoji (handle variation selectors)
        const typeCode = Object.keys(TYPE_EMOJIS).find(key => {
            const canonical = TYPE_EMOJIS[key];
            return typeEmoji === canonical || normalizeEmoji(typeEmoji) === normalizeEmoji(canonical);
        });
        if (!typeCode) return false;
        
        // Verify checksum emoji (handle variation selectors)
        const checksumIndex = findEmojiIndex(checksumEmoji, CHECKSUM_EMOJIS);
        if (checksumIndex < 0) return false;
        
        // Decode payload (25 bytes for Dogecoin addresses)
        const payloadBytes = emojiToBytes(joinEmojis(payloadEmojis), 25);
        
        // Verify checksum
        const expectedChecksum = calculateChecksum(payloadBytes);
        const actualChecksum = checksumIndex;
        
        return expectedChecksum === actualChecksum;
    } catch (error) {
        console.error('DogeMoji verification error:', error);
        return false;
    }
}

/************* DECODE EMOJI → DOGE **************/
function decodeDogeMoji(emojiAddress) {
    if (!verifyDogeMoji(emojiAddress)) {
        throw new Error("Invalid DogeMoji checksum or format");
    }
    
    // Properly split emojis
    const emojis = splitEmojis(emojiAddress.trim());
    
    // Extract components
    const typeEmoji = emojis[0];
    const payloadEmojis = emojis.slice(1, -1);
    
    // Get type code (handle variation selectors)
    const typeCode = Object.keys(TYPE_EMOJIS).find(key => {
        const canonical = TYPE_EMOJIS[key];
        return typeEmoji === canonical || normalizeEmoji(typeEmoji) === normalizeEmoji(canonical);
    });
    if (!typeCode) {
        throw new Error("Invalid type emoji");
    }
    const addressType = {
        "00": { name: "P2PKH", description: "Pay-to-Public-Key-Hash" },
        "01": { name: "P2SH", description: "Pay-to-Script-Hash (Multisig, Time-locked, etc.)" },
        "02": { name: "P2WPKH", description: "Pay-to-Witness-Public-Key-Hash (Bech32)" },
        "03": { name: "P2SH-CLTV", description: "Pay-to-Script-Hash with CheckLockTimeVerify (Time-locked)" }
    }[typeCode] || { name: "Unknown", description: "Unknown address type" };
    
    // Decode payload (join array back to string)
    const payloadBytes = emojiToBytes(joinEmojis(payloadEmojis), 25);
    
    // Reconstruct address
    let dogeAddress;
    if (typeCode === "02") {
        const decoder = new TextDecoder();
        dogeAddress = decoder.decode(payloadBytes).replace(/\0/g, '').trim();
    } else {
        // Base58 addresses - use the function from diban.js directly if available
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
    window.encodeDogeMoji = encodeDogeMoji;
    window.decodeDogeMoji = decodeDogeMoji;
    window.verifyDogeMoji = verifyDogeMoji;
}

// Export functions for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encodeDogeMoji,
        decodeDogeMoji,
        verifyDogeMoji,
        detectAddressType,
        EMOJI_BASE64,
        TYPE_EMOJIS
    };
}

