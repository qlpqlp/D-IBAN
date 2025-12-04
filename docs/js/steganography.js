/*******************************************************
 *  Steganography — Dogecoin Address/Private Key Image Encoding
 *  Version: 2.0
 *  Features:
 *    - Encode Dogecoin address or private key into image using LSB steganography
 *    - Decode Dogecoin address or private key from image
 *    - Uses Least Significant Bit (LSB) encoding in RGB channels
 *    - Supports both addresses (P2PKH, P2SH, P2WPKH) and private keys (WIF format)
 * 
 *  Author: Paulo Vidal (Dogecoin Foundation Dev)
 *  GitHub: https://github.com/qlpqlp
 *  X: https://x.com/inevitable360
 *  Website: https://dogecoin.org
 *******************************************************/

// Magic marker to identify encoded images (4 bytes: "DOGE")
const MAGIC_MARKER = [0x44, 0x4F, 0x47, 0x45]; // "DOGE" in ASCII

/************* UTILITY FUNCTIONS **************/
function hexToBytes(hex) {
    if (!hex) return new Uint8Array(0);
    if (hex.length % 2) hex = '0' + hex;
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

// Convert string to bytes (UTF-8)
function stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// Convert bytes to string (UTF-8)
function bytesToString(bytes) {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

/************* BASE58 ENCODING/DECODING (unchanged) **************/
// Use functions from diban.js if available, otherwise define local versions
function base58ToBytesSteg(str) {
    if (typeof base58ToBytes !== 'undefined') {
        return base58ToBytes(str);
    }

    const BASE58_LOCAL = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    if (!str) return new Uint8Array(0);
    let num = 0n;
    for (const c of str) {
        const val = BASE58_LOCAL.indexOf(c);
        if (val < 0) throw new Error("Invalid Base58 character");
        num = num * 58n + BigInt(val);
    }

    let hex = num.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    const bytes = hexToBytes(hex);

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

function bytesToBase58Steg(bytes) {
    if (typeof bytesToBase58 !== 'undefined') {
        return bytesToBase58(bytes);
    }

    const BASE58_LOCAL = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    // handle empty
    if (!bytes || bytes.length === 0) return "";
    let num = BigInt("0x" + bytesToHex(bytes));
    let out = "";

    while (num > 0) {
        const r = num % 58n;
        num = num / 58n;
        out = BASE58_LOCAL[Number(r)] + out;
    }

    for (const b of bytes) {
        if (b === 0) out = "1" + out;
        else break;
    }

    return out || "1";
}

/************* ADDRESS & PRIVATE KEY DETECTION **************/
function detectAddressType(dogeAddress) {
    const clean = dogeAddress.trim();

    if (clean.toLowerCase().startsWith('doge1')) {
        return { code: "02", name: "P2WPKH", description: "Bech32" };
    }

    if (clean.startsWith('9') || clean.startsWith('A')) {
        return { code: "01", name: "P2SH", description: "P2SH" };
    }

    if (clean.startsWith('D')) {
        return { code: "00", name: "P2PKH", description: "P2PKH" };
    }

    return { code: "00", name: "P2PKH", description: "P2PKH (detected)" };
}

function detectPrivateKeyType(privateKey) {
    const clean = privateKey.trim();
    if (clean.length >= 51 && clean.length <= 52) {
        if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(clean)) {
            try {
                base58ToBytesSteg(clean);
                return { code: "WIF", name: "WIF", description: "WIF (Base58)" };
            } catch (e) {
                // invalid base58 -> not a WIF
            }
        }
    }
    return null;
}

function detectDataType(input) {
    const clean = input.trim();
    const privateKeyType = detectPrivateKeyType(clean);
    if (privateKeyType) {
        return { type: "private_key", data: clean, info: privateKeyType };
    }
    const addressType = detectAddressType(clean);
    return { type: "address", data: clean, info: addressType };
}

/************* BIT QUEUE + PIXEL READER (correct, robust) **************/
// Simple FIFO bit queue (push bytes MSB-first, pop bits MSB-first)
class BitQueue {
    constructor() {
        this.bits = []; // array of 0/1
    }
    pushByte(byte) {
        for (let i = 7; i >= 0; i--) this.bits.push((byte >> i) & 1);
    }
    pushBitsFromValue(value, count) {
        // pushes `count` bits from value where highest-bit is first
        for (let i = count - 1; i >= 0; i--) {
            this.bits.push((value >> i) & 1);
        }
    }
    popBits(n) {
        if (this.bits.length < n) return null;
        let out = 0;
        for (let i = 0; i < n; i++) {
            out = (out << 1) | this.bits.shift();
        }
        return out;
    }
    popByte() {
        return this.popBits(8);
    }
    size() {
        return this.bits.length;
    }
}

// PixelBitWriter: write bits into pixel rgba array (pixels is Uint8ClampedArray or Uint8Array)
function encodeLSB(pixels, dataBytes) {
    // create queue of bits to write
    const q = new BitQueue();
    for (let i = 0; i < dataBytes.length; i++) q.pushByte(dataBytes[i]);

    const totalPixels = pixels.length / 4;
    let pixelIndex = 0;

    while (q.size() > 0) {
        if (pixelIndex >= totalPixels) throw new Error("Image too small for data");
        // get up to 3 bits (if fewer than 3 bits left, pad with zeros on the right)
        let bits = 0;
        const remaining = q.size();
        if (remaining >= 3) {
            bits = q.popBits(3);
        } else {
            // build partial value so that MSB of the 3 corresponds to next bit
            bits = 0;
            for (let i = 0; i < 3; i++) {
                const b = q.popBits(1);
                bits = (bits << 1) | (b === null ? 0 : b);
            }
        }
        const base = pixelIndex * 4;
        pixels[base]     = (pixels[base]     & 0xFE) | ((bits >> 2) & 1); // R
        pixels[base + 1] = (pixels[base + 1] & 0xFE) | ((bits >> 1) & 1); // G
        pixels[base + 2] = (pixels[base + 2] & 0xFE) | (bits & 1);        // B
        // Set alpha to 255 (fully opaque) to remove transparency
        pixels[base + 3] = 255;

        pixelIndex++;
    }
}

// PixelBitReader: read bits from pixels sequentially; maintains pixelIndex & bit queue
class PixelBitReader {
    constructor(pixels) {
        this.pixels = pixels;
        this.pixelIndex = 0;
        this.q = new BitQueue();
        this.totalPixels = Math.floor(pixels.length / 4);
    }
    // ensure at least n bits in queue (returns false if not enough pixels remain)
    _fillBits(n) {
        while (this.q.size() < n) {
            if (this.pixelIndex >= this.totalPixels) return false;
            const base = this.pixelIndex * 4;
            const b0 = this.pixels[base] & 1;
            const b1 = this.pixels[base + 1] & 1;
            const b2 = this.pixels[base + 2] & 1;
            const bits = (b0 << 2) | (b1 << 1) | b2;
            // push 3 bits MSB first
            this.q.pushBitsFromValue(bits, 3);
            this.pixelIndex++;
        }
        return true;
    }
    popBits(n) {
        if (!this._fillBits(n)) return null;
        return this.q.popBits(n);
    }
    popByte() {
        return this.popBits(8);
    }
    // read `count` bytes and return Uint8Array, throws on insufficient data
    readBytes(count) {
        const out = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            const b = this.popByte();
            if (b === null) throw new Error("Not enough data in image while reading bytes");
            out[i] = b;
        }
        return out;
    }
}

/************* ENCODE ADDRESS OR PRIVATE KEY INTO IMAGE (fixed) **************/
async function loadImageFromFile(imageFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = function(e) {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(imageFile);
    });
}

async function encodeAddressInImage(imageFile, dogeAddressOrPrivateKey) {
    const img = await loadImageFromFile(imageFile);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // Fill canvas with white background to remove transparency
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw image on top (this will composite transparent areas onto white)
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Detect data type
    const dataInfo = detectDataType(dogeAddressOrPrivateKey);
    let dataBytes;
    let dataTypeByte;

    if (dataInfo.type === "private_key") {
        dataTypeByte = 0x01;
        dataBytes = base58ToBytesSteg(dataInfo.data);
    } else {
        dataTypeByte = 0x00;
        if (dataInfo.info.code === "02") {
            dataBytes = new TextEncoder().encode(dataInfo.data);
        } else {
            dataBytes = base58ToBytesSteg(dataInfo.data);
        }
    }

    const lengthBytes = new Uint8Array([
        (dataBytes.length >> 8) & 0xFF,
        dataBytes.length & 0xFF
    ]);

    // Format: [MAGIC (4)] + [TYPE (1)] + [LENGTH (2)] + [DATA]
    const full = new Uint8Array(4 + 1 + 2 + dataBytes.length);
    full.set(MAGIC_MARKER, 0);
    full[4] = dataTypeByte;
    full[5] = lengthBytes[0];
    full[6] = lengthBytes[1];
    full.set(dataBytes, 7);

    // Check capacity
    const totalBits = full.length * 8;
    const pixelsNeeded = Math.ceil(totalBits / 3);
    const totalPixels = (pixels.length / 4);
    if (pixelsNeeded > totalPixels) {
        throw new Error(`Image too small. Need ${pixelsNeeded} pixels but have ${totalPixels}`);
    }

    // Encode
    encodeLSB(pixels, full);
    ctx.putImageData(imageData, 0, 0);

    return new Promise(resolve => {
        canvas.toBlob(b => {
            resolve({
                blob: b,
                url: URL.createObjectURL(b),
                type: dataInfo.info,
                dataType: dataInfo.type
            });
        }, "image/png");
    });
}

/************* DECODE ADDRESS OR PRIVATE KEY FROM IMAGE (fixed) **************/
async function decodeAddressFromImage(imageFile) {
    const img = await loadImageFromFile(imageFile);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // Fill canvas with white background to remove transparency
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw image on top (this will composite transparent areas onto white)
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const reader = new PixelBitReader(pixels);

    // 1) Read magic (4 bytes)
    const magic = reader.readBytes(4);
    for (let i = 0; i < 4; i++) {
        if (magic[i] !== MAGIC_MARKER[i]) {
            throw new Error("Magic marker not found");
        }
    }

    // 2) Backward-compatible detection:
    // Peek next 3 bytes (type + lenHi + lenLo) without committing beyond them.
    // Because PixelBitReader consumes bits as it reads, we need a strategy to peek.
    // Simple approach: we'll read 3 bytes, then decide. If it's not new-format, we treat those as length bytes.
    // (This preserves backward compatibility with old encoded images.)
    // Note: PixelBitReader cannot "rewind" easily; so we will create a new reader that starts from beginning + 4 bytes.
    // To do this robustly, reconstruct a fresh reader and advance exactly to after magic, then read 3 bytes to decide.

    // Recreate a fresh reader and advance by 4 bytes
    const reader2 = new PixelBitReader(pixels);
    // advance 4 bytes (magic)
    reader2.readBytes(4);

    // read the next 3 bytes to inspect
    const peek = reader2.readBytes(3); // [firstByte, lenHi, lenLo]
    const firstByte = peek[0];
    const lenHi = peek[1];
    const lenLo = peek[2];

    // Decide format:
    let isNewFormat = false;
    let dataTypeByte = 0x00;
    let dataLength = 0;
    // If firstByte is 0x00 or 0x01 treat as candidate new format, but only accept if length plausible
    const possibleLen = (lenHi << 8) | lenLo;
    if ((firstByte === 0x00 || firstByte === 0x01) && possibleLen >= 1 && possibleLen <= 2000) {
        isNewFormat = true;
        dataTypeByte = firstByte;
        dataLength = possibleLen;
    } else {
        // Old format: firstByte is high length, secondByte is low length.
        // We read three bytes where peek[0] is high, peek[1] is low, peek[2] is actually first data byte.
        // So compute length from first two peek bytes:
        dataTypeByte = 0x00; // default for old format
        dataLength = (peek[0] << 8) | peek[1];
        // The third peek byte is actually the first data byte; we will need to assemble reader to start after the two length bytes.
        // To simplify, rebuild reader3, advance 4(magic) + 2(length) and then read dataLength bytes.
        const reader3 = new PixelBitReader(pixels);
        reader3.readBytes(4); // magic
        // advance 2 bytes (length) - these are peek[0], peek[1]
        reader3.readBytes(2);
        const dataBytesOld = reader3.readBytes(dataLength);
        // Now decode as address (old format always address)
        // Try UTF-8 first (Bech32) then Base58
        let addrUTF8 = new TextDecoder().decode(dataBytesOld).trim();
        if (addrUTF8.startsWith("doge1")) {
            return {
                address: addrUTF8,
                type: detectAddressType(addrUTF8),
                dataType: "address"
            };
        } else {
            const base58 = bytesToBase58Steg(dataBytesOld);
            return {
                address: base58,
                type: detectAddressType(base58),
                dataType: "address"
            };
        }
    }

    // If new format accepted: reader2 is positioned after the 3 peek bytes; we can continue using it.
    // Read dataLength bytes from reader2
    if (isNewFormat) {
        if (dataLength < 1 || dataLength > 2000) throw new Error("Invalid data length");
        const dataBytes = reader2.readBytes(dataLength);

        if (dataTypeByte === 0x01) {
            // Private key stored as Base58 bytes — decode to Base58 string
            const privateKey = bytesToBase58Steg(dataBytes);
            return {
                privateKey: privateKey,
                type: detectPrivateKeyType(privateKey),
                dataType: "private_key"
            };
        } else {
            // Address: try UTF-8 first (Bech32)
            const addrUTF8 = new TextDecoder().decode(dataBytes).trim();
            if (addrUTF8.startsWith("doge1")) {
                return {
                    address: addrUTF8,
                    type: detectAddressType(addrUTF8),
                    dataType: "address"
                };
            } else {
                const base58 = bytesToBase58Steg(dataBytes);
                return {
                    address: base58,
                    type: detectAddressType(base58),
                    dataType: "address"
                };
            }
        }
    }

    // unreachable
    throw new Error("Unexpected decode path");
}

// Make functions available globally for browser
if (typeof window !== 'undefined') {
    window.encodeAddressInImage = encodeAddressInImage;
    window.decodeAddressFromImage = decodeAddressFromImage;
}

// Export functions for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encodeAddressInImage,
        decodeAddressFromImage,
        detectAddressType,
        MAGIC_MARKER
    };
}
