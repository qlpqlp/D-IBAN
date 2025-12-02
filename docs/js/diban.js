/*******************************************************
 *  D-IBAN — Dogecoin IBAN-Style Address Format
 *  Version: 1.0
 *  Features:
 *    - Encode Dogecoin Base58Check address → D-IBAN
 *    - Decode D-IBAN → Dogecoin Base58Check address
 *    - Verify checksum & structure
 *    - Support for multiple address types (P2PKH, P2SH, P2WPKH, Time-locked)
 *  Compliant with ISO 13616-1:2020 International Standard
 * 
 *  Author: Paulo Vidal (Dogecoin Foundation Dev)
 *  GitHub: https://github.com/qlpqlp
 *  X: https://x.com/inevitable360
 *  Website: https://dogecoin.org
 *******************************************************/

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/************* UTILITY FUNCTIONS **************/
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/************* BASE58 ENCODING/DECODING **************/
function base58ToBytes(str) {
    let num = 0n;
    for (const c of str) {
        const val = BASE58.indexOf(c);
        if (val < 0) throw new Error("Invalid Base58 character");
        num = num * 58n + BigInt(val);
    }

    let hex = num.toString(16);
    if (hex.length % 2) hex = "0" + hex;

    let bytes = hexToBytes(hex);

    // handle leading zeros encoded as '1'
    let zeroCount = 0;
    for (const c of str) {
        if (c === "1") zeroCount++; else break;
    }
    return Uint8Array.from([...Array(zeroCount).fill(0), ...bytes]);
}

function bytesToBase58(bytes) {
    let num = BigInt("0x" + bytesToHex(bytes));
    let out = "";

    while (num > 0) {
        const r = num % 58n;
        num = num / 58n;
        out = BASE58[Number(r)] + out;
    }

    // leading zeros
    for (const b of bytes) {
        if (b === 0) out = "1" + out;
        else break;
    }

    return out || "1";
}

/************* BASE36 ENCODING/DECODING **************/
function bytesToBase36(bytes) {
    let num = BigInt("0x" + bytesToHex(bytes));
    if (num === 0n) return "0";

    let out = "";
    while (num > 0) {
        const r = num % 36n;
        num = num / 36n;
        out = BASE36[Number(r)] + out;
    }

    return out;
}

function base36ToBytes(str, byteLen = 25) {
    let num = 0n;
    for (const c of str) {
        const v = BASE36.indexOf(c);
        if (v < 0) throw new Error("Invalid Base36 character");
        num = num * 36n + BigInt(v);
    }

    let hex = num.toString(16);
    if (hex.length % 2) hex = "0" + hex;

    let bytes = hexToBytes(hex);

    // pad to specified length
    if (bytes.length < byteLen) {
        const pad = Array(byteLen - bytes.length).fill(0);
        bytes = Uint8Array.from([...pad, ...bytes]);
    }

    return bytes;
}

/************* IBAN MOD-97 CHECKSUM **************/
function ibanMod97(str) {
    let converted = "";
    for (const c of str) {
        if (/[0-9]/.test(c)) converted += c;
        else converted += (c.charCodeAt(0) - 55).toString(); // A=10
    }

    // mod-97 in chunks
    let remainder = 0n;
    for (const d of converted) {
        remainder = (remainder * 10n + BigInt(d)) % 97n;
    }

    return remainder;
}

/************* ADDRESS TYPE DETECTION **************/
function detectAddressType(dogeAddress) {
    // Remove whitespace
    const clean = dogeAddress.trim();
    
    // P2WPKH (Bech32) - starts with 'doge1'
    if (clean.toLowerCase().startsWith('doge1')) {
        return { code: "02", name: "P2WPKH", description: "Pay-to-Witness-Public-Key-Hash (Bech32)" };
    }
    
    // P2SH - starts with '9' or 'A' (mainnet)
    if (clean.startsWith('9') || clean.startsWith('A')) {
        return { code: "01", name: "P2SH", description: "Pay-to-Script-Hash (Multisig, Time-locked, etc.)" };
    }
    
    // P2PKH - starts with 'D' (mainnet) - most common
    if (clean.startsWith('D')) {
        return { code: "00", name: "P2PKH", description: "Pay-to-Public-Key-Hash" };
    }
    
    // Legacy or unknown - default to P2PKH
    return { code: "00", name: "P2PKH", description: "Pay-to-Public-Key-Hash (detected)" };
}

/************* ADDRESS TYPE CODES **************/
const ADDRESS_TYPES = {
    "00": { name: "P2PKH", description: "Pay-to-Public-Key-Hash" },
    "01": { name: "P2SH", description: "Pay-to-Script-Hash (Multisig, Time-locked, etc.)" },
    "02": { name: "P2WPKH", description: "Pay-to-Witness-Public-Key-Hash (Bech32)" },
    "03": { name: "P2SH-CLTV", description: "Pay-to-Script-Hash with CheckLockTimeVerify (Time-locked)" }
};

/************* ENCODE DOGE → D-IBAN **************/
function encodeDIBAN(dogeAddress) {
    const addressType = detectAddressType(dogeAddress);
    let payload;
    
    // Handle Bech32 addresses differently (they're not Base58)
    if (addressType.code === "02") {
        // For Bech32, encode the string as UTF-8 bytes
        const encoder = new TextEncoder();
        payload = encoder.encode(dogeAddress);
        // Pad or truncate to 25 bytes
        if (payload.length < 25) {
            const padded = new Uint8Array(25);
            padded.set(payload, 25 - payload.length);
            payload = padded;
        } else if (payload.length > 25) {
            payload = payload.slice(0, 25);
        }
    } else {
        // Base58 addresses (P2PKH, P2SH)
        payload = base58ToBytes(dogeAddress);
    }
    
    const payload36 = bytesToBase36(payload).padStart(39, "0");
    const type = addressType.code;
    const temp = "DO00" + type + payload36;

    // Move first 4 chars to end for checksum calc
    const rearr = temp.slice(4) + temp.slice(0, 4);

    const mod = ibanMod97(rearr);
    let checksum = 98n - mod;
    if (checksum < 10) checksum = "0" + checksum;
    else checksum = checksum.toString();

    const final = "DO" + checksum + type + payload36;
    // Format like standard IBAN: groups of 4 characters with spaces
    // Example: "DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789"
    const formatted = final.match(/.{1,4}/g).join(' ');
    return {
        diban: formatted,
        type: addressType
    };
}

/************* VERIFY D-IBAN **************/
function verifyDIBAN(diban) {
    const clean = diban.replace(/\s+/g, "");

    if (!/^DO[0-9]{2}[0-9]{2}[A-Z0-9]{39}$/i.test(clean))
        return false;

    const rearr = clean.slice(4) + clean.slice(0, 4);
    return ibanMod97(rearr) === 1n;
}

/************* DECODE D-IBAN → DOGE **************/
function decodeDIBAN(diban) {
    if (!verifyDIBAN(diban))
        throw new Error("Invalid DIBAN checksum");

    const clean = diban.replace(/\s+/g, "");
    const typeCode = clean.slice(4, 6); // Extract type code
    const payload36 = clean.slice(6); // skip DO + CC + type

    const payloadBytes = base36ToBytes(payload36, 25);
    
    // Handle different address types
    const addressType = ADDRESS_TYPES[typeCode] || { name: "Unknown", description: "Unknown address type" };
    
    let doge;
    if (typeCode === "02") {
        // Bech32 addresses - decode from UTF-8
        const decoder = new TextDecoder();
        doge = decoder.decode(payloadBytes).replace(/\0/g, '').trim();
    } else {
        // Base58 addresses (P2PKH, P2SH)
        doge = bytesToBase58(payloadBytes);
    }

    return {
        address: doge,
        type: {
            code: typeCode,
            ...addressType
        }
    };
}

// Export functions for use in Node.js or as ES6 module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encodeDIBAN,
        decodeDIBAN,
        verifyDIBAN,
        detectAddressType,
        ADDRESS_TYPES,
        BASE58,
        BASE36
    };
}

