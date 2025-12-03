/*******************************************************
 *  Steganography — Dogecoin Address Image Encoding
 *  Version: 1.0
 *  Features:
 *    - Encode Dogecoin address into image using LSB steganography
 *    - Decode Dogecoin address from image
 *    - Uses Least Significant Bit (LSB) encoding in RGB channels
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

/************* BASE58 ENCODING/DECODING **************/
// Use functions from diban.js if available, otherwise define local versions
function base58ToBytesSteg(str) {
    // Use base58ToBytes from diban.js if available
    if (typeof base58ToBytes !== 'undefined') {
        return base58ToBytes(str);
    }
    
    // Local implementation if diban.js not loaded
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
    // Use bytesToBase58 from diban.js if available
    if (typeof bytesToBase58 !== 'undefined') {
        return bytesToBase58(bytes);
    }
    
    // Local implementation if diban.js not loaded
    const BASE58_LOCAL = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
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

/************* LSB STEGANOGRAPHY FUNCTIONS **************/

// Encode bits into a pixel's RGB channels
// Each pixel can store 3 bits (one in each RGB channel)
function encodeBitsIntoPixel(pixelData, pixelIndex, bits, bitCount) {
    // pixelData is RGBA, so each pixel is 4 bytes
    const baseIndex = pixelIndex * 4;
    
    // Encode up to 3 bits into R, G, B channels
    if (bitCount > 0) {
        const bit0 = (bits >> 2) & 1;
        pixelData[baseIndex] = (pixelData[baseIndex] & 0xFE) | bit0; // R channel
    }
    if (bitCount > 1) {
        const bit1 = (bits >> 1) & 1;
        pixelData[baseIndex + 1] = (pixelData[baseIndex + 1] & 0xFE) | bit1; // G channel
    }
    if (bitCount > 2) {
        const bit2 = bits & 1;
        pixelData[baseIndex + 2] = (pixelData[baseIndex + 2] & 0xFE) | bit2; // B channel
    }
}

// Decode bits from a pixel's RGB channels
function decodeBitsFromPixel(pixelData, pixelIndex, bitCount) {
    const baseIndex = pixelIndex * 4;
    let bits = 0;
    
    // Decode from R, G, B channels
    if (bitCount > 0) {
        const bit0 = pixelData[baseIndex] & 1; // R channel
        bits |= (bit0 << 2);
    }
    if (bitCount > 1) {
        const bit1 = pixelData[baseIndex + 1] & 1; // G channel
        bits |= (bit1 << 1);
    }
    if (bitCount > 2) {
        const bit2 = pixelData[baseIndex + 2] & 1; // B channel
        bits |= bit2;
    }
    
    return bits;
}

// Calculate how many pixels are needed to encode data
function calculatePixelsNeeded(dataLength) {
    // Each pixel can encode 3 bits (RGB channels)
    // We need: 4 bytes (magic) + 2 bytes (length) + dataLength bytes
    const totalBytes = 4 + 2 + dataLength;
    const totalBits = totalBytes * 8;
    return Math.ceil(totalBits / 3);
}

/************* ENCODE ADDRESS INTO IMAGE **************/
function encodeAddressInImage(imageFile, dogeAddress) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.onload = function() {
                try {
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixelData = imageData.data;
                    
                    // Convert address to bytes
                    const addressType = detectAddressType(dogeAddress);
                    let addressBytes;
                    
                    if (addressType.code === "02") {
                        // Bech32 - encode as UTF-8
                        addressBytes = stringToBytes(dogeAddress);
                    } else {
                        // Base58 addresses
                        addressBytes = base58ToBytesSteg(dogeAddress);
                    }
                    
                    // Prepare data to encode: [MAGIC_MARKER (4 bytes)] + [LENGTH (2 bytes)] + [ADDRESS_BYTES]
                    const lengthBytes = new Uint8Array(2);
                    lengthBytes[0] = (addressBytes.length >> 8) & 0xFF;
                    lengthBytes[1] = addressBytes.length & 0xFF;
                    
                    const dataToEncode = new Uint8Array(4 + 2 + addressBytes.length);
                    dataToEncode.set(MAGIC_MARKER, 0);
                    dataToEncode.set(lengthBytes, 4);
                    dataToEncode.set(addressBytes, 6);
                    
                    // Check if image is large enough
                    const pixelsNeeded = calculatePixelsNeeded(addressBytes.length);
                    const totalPixels = canvas.width * canvas.height;
                    
                    if (pixelsNeeded > totalPixels) {
                        reject(new Error(`Image too small. Need at least ${pixelsNeeded} pixels, but image has ${totalPixels} pixels.`));
                        return;
                    }
                    
                    // Encode data into pixels using LSB
                    // Each pixel stores 3 bits, so we need to split bytes across pixels
                    let bitBuffer = 0;
                    let bitsInBuffer = 0;
                    let dataIndex = 0;
                    let pixelIndex = 0;
                    
                    while (dataIndex < dataToEncode.length || bitsInBuffer >= 3) {
                        // Fill buffer if needed
                        if (bitsInBuffer < 3 && dataIndex < dataToEncode.length) {
                            bitBuffer = (bitBuffer << 8) | dataToEncode[dataIndex];
                            bitsInBuffer += 8;
                            dataIndex++;
                        }
                        
                        // Extract 3 bits for this pixel
                        if (bitsInBuffer >= 3) {
                            const bitsToEncode = (bitBuffer >> (bitsInBuffer - 3)) & 0x7;
                            encodeBitsIntoPixel(pixelData, pixelIndex, bitsToEncode, 3);
                            // Clear the 3 bits we just used
                            const mask = bitsInBuffer > 3 ? ((1 << (bitsInBuffer - 3)) - 1) : 0;
                            bitBuffer = bitBuffer & mask;
                            bitsInBuffer -= 3;
                            pixelIndex++;
                        }
                        
                        if (pixelIndex >= totalPixels) break;
                    }
                    
                    // Put modified image data back
                    ctx.putImageData(imageData, 0, 0);
                    
                    // Convert canvas to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve({
                                blob: blob,
                                url: URL.createObjectURL(blob),
                                type: addressType,
                                originalSize: imageFile.size,
                                newSize: blob.size
                            });
                        } else {
                            reject(new Error('Failed to create image blob'));
                        }
                    }, 'image/png');
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(imageFile);
    });
}

/************* DECODE ADDRESS FROM IMAGE **************/
function decodeAddressFromImage(imageFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.onload = function() {
                try {
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixelData = imageData.data;
                    
                    // Read magic marker (4 bytes)
                    // Each pixel gives 3 bits, so we need multiple pixels per byte
                    const magicBytes = new Uint8Array(4);
                    let bitBuffer = 0;
                    let bitsInBuffer = 0;
                    let byteIndex = 0;
                    let pixelIndex = 0;
                    
                    while (byteIndex < 4 && pixelIndex < canvas.width * canvas.height) {
                        // Read 3 bits from pixel
                        const bits = decodeBitsFromPixel(pixelData, pixelIndex, 3);
                        bitBuffer = (bitBuffer << 3) | bits;
                        bitsInBuffer += 3;
                        pixelIndex++;
                        
                        // Extract complete bytes
                        while (bitsInBuffer >= 8 && byteIndex < 4) {
                            magicBytes[byteIndex] = (bitBuffer >> (bitsInBuffer - 8)) & 0xFF;
                            // Clear the byte we just extracted
                            const mask = bitsInBuffer > 8 ? ((1 << (bitsInBuffer - 8)) - 1) : 0;
                            bitBuffer = bitBuffer & mask;
                            bitsInBuffer -= 8;
                            byteIndex++;
                        }
                    }
                    
                    // Verify magic marker
                    let isValid = true;
                    for (let i = 0; i < 4; i++) {
                        if (magicBytes[i] !== MAGIC_MARKER[i]) {
                            isValid = false;
                            break;
                        }
                    }
                    
                    if (!isValid) {
                        reject(new Error('Image does not contain encoded Dogecoin address (magic marker not found)'));
                        return;
                    }
                    
                    // Read length (2 bytes)
                    const lengthBytes = new Uint8Array(2);
                    byteIndex = 0;
                    
                    while (byteIndex < 2 && pixelIndex < canvas.width * canvas.height) {
                        // Read 3 bits from pixel
                        const bits = decodeBitsFromPixel(pixelData, pixelIndex, 3);
                        bitBuffer = (bitBuffer << 3) | bits;
                        bitsInBuffer += 3;
                        pixelIndex++;
                        
                        // Extract complete bytes
                        while (bitsInBuffer >= 8 && byteIndex < 2) {
                            lengthBytes[byteIndex] = (bitBuffer >> (bitsInBuffer - 8)) & 0xFF;
                            // Clear the byte we just extracted
                            const mask = bitsInBuffer > 8 ? ((1 << (bitsInBuffer - 8)) - 1) : 0;
                            bitBuffer = bitBuffer & mask;
                            bitsInBuffer -= 8;
                            byteIndex++;
                        }
                    }
                    
                    const addressLength = (lengthBytes[0] << 8) | lengthBytes[1];
                    
                    if (addressLength > 1000 || addressLength < 1) {
                        reject(new Error('Invalid address length detected'));
                        return;
                    }
                    
                    // Read address bytes
                    const addressBytes = new Uint8Array(addressLength);
                    byteIndex = 0;
                    
                    while (byteIndex < addressLength && pixelIndex < canvas.width * canvas.height) {
                        // Read 3 bits from pixel
                        const bits = decodeBitsFromPixel(pixelData, pixelIndex, 3);
                        bitBuffer = (bitBuffer << 3) | bits;
                        bitsInBuffer += 3;
                        pixelIndex++;
                        
                        // Extract complete bytes
                        while (bitsInBuffer >= 8 && byteIndex < addressLength) {
                            addressBytes[byteIndex] = (bitBuffer >> (bitsInBuffer - 8)) & 0xFF;
                            // Clear the byte we just extracted
                            const mask = bitsInBuffer > 8 ? ((1 << (bitsInBuffer - 8)) - 1) : 0;
                            bitBuffer = bitBuffer & mask;
                            bitsInBuffer -= 8;
                            byteIndex++;
                        }
                    }
                    
                    // Convert bytes to address
                    // Try Base58 first (most common), then UTF-8 for Bech32
                    let dogeAddress;
                    let addressType;
                    
                    try {
                        // Try as Base58
                        dogeAddress = bytesToBase58Steg(addressBytes);
                        addressType = detectAddressType(dogeAddress);
                    } catch (e) {
                        // Try as UTF-8 (Bech32)
                        try {
                            dogeAddress = bytesToString(addressBytes).replace(/\0/g, '').trim();
                            addressType = detectAddressType(dogeAddress);
                        } catch (e2) {
                            reject(new Error('Failed to decode address from bytes'));
                            return;
                        }
                    }
                    
                    resolve({
                        address: dogeAddress,
                        type: addressType
                    });
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(imageFile);
    });
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

