# D-IBAN - Dogecoin Protocol IBAN Address Format

**D-IBAN** (Dogecoin IBAN) is a protocol that converts Dogecoin addresses into IBAN-format codes, using the same **ISO 13616-1:2020** international standard that banks worldwide use for international bank account numbers.

## Author

**Paulo Vidal** (Dogecoin Foundation Dev)

- GitHub: [https://github.com/qlpqlp](https://github.com/qlpqlp)
- X: [https://x.com/inevitable360](https://x.com/inevitable360)
- Website: [https://dogecoin.org](https://dogecoin.org)

## 🌟 Features

### D-IBAN Protocol
- ✅ **ISO 13616-1:2020 Compliant** - Uses the same standard as traditional bank IBANs
- ✅ **Multiple Address Types** - Supports P2PKH, P2SH, P2WPKH, and Time-locked addresses
- ✅ **Automatic Type Detection** - Detects address type from prefix
- ✅ **MOD-97-10 Checksum** - Same validation algorithm used by banks worldwide
- ✅ **Reversible Encoding** - 100% lossless conversion (encode ↔ decode)
- ✅ **Standard IBAN Format** - Groups of 4 characters with spaces for readability

### DogeMoji Protocol
- 🐕 **Emoji-Based Encoding** - Convert addresses to fun, memorable emoji sequences
- 📦 **Compact Format** - Shorter and easier to share than traditional addresses
- ✅ **Built-in Validation** - Checksum emoji for error detection
- 🔄 **Fully Reversible** - 100% lossless conversion back to original address
- 🎨 **Visual Appeal** - Perfect for social media, QR codes, and sharing

### DogeWords Protocol (NEW!)
- 📝 **Word-Based Encoding** - Convert addresses to mnemonic-style word sequences
- 💬 **Human-Friendly** - Uses short, positive, kind words that are easy to read and remember
- ✅ **Built-in Validation** - Checksum word for error detection
- 🔄 **Fully Reversible** - 100% lossless conversion back to original address
- 🎯 **Mnemonic Style** - Similar to seed phrase mnemonics, but for addresses

## 📋 Table of Contents

- [What is D-IBAN?](#what-is-d-iban)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Address Types](#address-types)
- [Protocol Specification](#protocol-specification)
- [Examples](#examples)
- [DogeMoji Protocol](#dogemoji-protocol)
- [DogeWords Protocol](#dogewords-protocol)
- [Browser Support](#browser-support)
- [Bank Implementation](#bank-implementation)
- [License](#license)

## What is D-IBAN?

D-IBAN converts Dogecoin blockchain addresses into a standardized IBAN format that's compatible with traditional banking systems, payment processors, and financial software. This enables:

- **Banking Integration**: Use Dogecoin addresses in systems expecting IBAN format
- **Payment Processing**: Integrate with payment gateways that require IBAN codes
- **Accounting Software**: Import Dogecoin addresses into financial reporting tools
- **International Standards**: Follow the same format used by banks globally

## How It Works

### Encoding Process

1. **Address Type Detection**: Automatically detects the address type from the prefix:
   - `D...` → P2PKH (Pay-to-Public-Key-Hash)
   - `9...` or `A...` → P2SH (Pay-to-Script-Hash)
   - `doge1...` → P2WPKH (Bech32 witness addresses)

2. **Base58 to Bytes**: Converts the Base58Check address to its raw 25-byte representation

3. **Base36 Encoding**: Encodes the bytes into Base36 format (0-9, A-Z) to create a 39-character payload compatible with IBAN's alphanumeric requirements

4. **IBAN Structure**: Creates the D-IBAN following the standard format:
   ```
   DO[CC][TT][BBBB...]
   ```
   - `DO` = Country code (Dogecoin)
   - `CC` = 2-digit checksum (MOD-97-10 algorithm)
   - `TT` = Address type code (00-03)
   - `BBBB...` = 39-character Base36 encoded payload

5. **Checksum Calculation**: Uses the MOD-97-10 algorithm (same as banks) to calculate and embed the checksum

6. **Formatting**: Formats the result in standard IBAN style with spaces every 4 characters

### Decoding Process

1. **Verification**: Validates the D-IBAN using MOD-97-10 checksum
2. **Type Extraction**: Extracts the address type code
3. **Payload Extraction**: Extracts the 39-character Base36 payload
4. **Base36 to Bytes**: Converts Base36 back to 25 bytes
5. **Address Reconstruction**: Reconstructs the original Dogecoin address based on type:
   - P2PKH/P2SH: Base58Check encoding
   - P2WPKH: UTF-8 decoding for Bech32 addresses

### Verification Process

1. **Format Check**: Validates structure matches IBAN pattern
2. **Character Validation**: Ensures only valid alphanumeric characters
3. **MOD-97-10 Algorithm**: Performs the same checksum validation banks use
4. **Result**: Returns `true` if valid, `false` otherwise

## Installation

### Browser (HTML)

Include the JavaScript files in your HTML:

```html
<!-- Core D-IBAN library -->
<script src="js/diban.js"></script>

<!-- Optional: DogeMoji converter -->
<script src="js/dogemoji.js"></script>

<!-- Optional: DogeWords converter -->
<script src="js/dogewords.js"></script>

<!-- UI functions -->
<script src="js/diban-ui.js"></script>
```

### Node.js

```bash
npm install diban
```

Or copy the `js/diban.js` file to your project and require it:

```javascript
const { encodeDIBAN, decodeDIBAN, verifyDIBAN } = require('./js/diban.js');
```

## Usage

### Basic Usage

```javascript
// Encode a Dogecoin address to D-IBAN
const dogeAddress = "DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n";
const result = encodeDIBAN(dogeAddress);

console.log(result.diban);  // "DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789"
console.log(result.type);   // { code: "00", name: "P2PKH", description: "..." }

// Verify a D-IBAN
const isValid = verifyDIBAN("DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789");
console.log(isValid);  // true

// Decode a D-IBAN back to Dogecoin address
const decoded = decodeDIBAN("DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789");
console.log(decoded.address);  // "DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n"
console.log(decoded.type);     // { code: "00", name: "P2PKH", ... }
```

### Web Interface

Open `docs/index.html` in a web browser to use the interactive converter with:
- **Convert Tab**: Convert Dogecoin addresses to D-IBAN
- **Verify Tab**: Verify D-IBAN codes
- **Decode Tab**: Decode D-IBAN back to Dogecoin addresses
- **Other Converters**: Access additional conversion options:
  - **DogeMoji**: Convert addresses to emoji sequences
  - **DogeWords**: Convert addresses to word sequences (mnemonic-style)

## API Reference

### `encodeDIBAN(dogeAddress)`

Encodes a Dogecoin address to D-IBAN format.

**Parameters:**
- `dogeAddress` (string): A valid Dogecoin address (P2PKH, P2SH, or P2WPKH)

**Returns:**
```javascript
{
    diban: string,  // Formatted D-IBAN code (with spaces)
    type: {
        code: string,        // "00", "01", "02", or "03"
        name: string,        // "P2PKH", "P2SH", "P2WPKH", etc.
        description: string // Full description
    }
}
```

**Example:**
```javascript
const result = encodeDIBAN("DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n");
// Returns: { diban: "DO12 0000 ...", type: { code: "00", name: "P2PKH", ... } }
```

### `decodeDIBAN(diban)`

Decodes a D-IBAN code back to the original Dogecoin address.

**Parameters:**
- `diban` (string): A valid D-IBAN code (spaces are automatically removed)

**Returns:**
```javascript
{
    address: string,  // Original Dogecoin address
    type: {
        code: string,
        name: string,
        description: string
    }
}
```

**Throws:**
- `Error`: If the D-IBAN checksum is invalid

**Example:**
```javascript
const result = decodeDIBAN("DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789");
// Returns: { address: "DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n", type: {...} }
```

### `verifyDIBAN(diban)`

Verifies if a D-IBAN code is valid.

**Parameters:**
- `diban` (string): A D-IBAN code to verify

**Returns:**
- `boolean`: `true` if valid, `false` otherwise

**Example:**
```javascript
const isValid = verifyDIBAN("DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789");
// Returns: true
```

### `detectAddressType(dogeAddress)`

Detects the type of a Dogecoin address.

**Parameters:**
- `dogeAddress` (string): A Dogecoin address

**Returns:**
```javascript
{
    code: string,        // "00", "01", "02", or "03"
    name: string,        // "P2PKH", "P2SH", "P2WPKH", etc.
    description: string  // Full description
}
```

## Address Types

D-IBAN supports multiple Dogecoin address types:

| Code | Type | Prefix | Description |
|------|------|--------|-------------|
| `00` | P2PKH | `D...` | Pay-to-Public-Key-Hash (most common, standard addresses) |
| `01` | P2SH | `9...` or `A...` | Pay-to-Script-Hash (multisig, time-locked, advanced scripts) |
| `02` | P2WPKH | `doge1...` | Pay-to-Witness-Public-Key-Hash (Bech32 witness addresses) |
| `03` | P2SH-CLTV | `9...` or `A...` | Pay-to-Script-Hash with CheckLockTimeVerify (time-locked) |

### Address Type Detection

The protocol automatically detects address types:

- **P2PKH**: Addresses starting with `D` (mainnet)
- **P2SH**: Addresses starting with `9` or `A` (mainnet)
- **P2WPKH**: Addresses starting with `doge1` (Bech32 format)

## Protocol Specification

### D-IBAN Structure

```
DO[CC][TT][BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB]
│  │  │  └─ 39 characters: Base36 encoded payload
│  │  └─ 2 digits: Address type code (00-03)
│  └─ 2 digits: MOD-97-10 checksum
└─ 2 letters: Country code (DO = Dogecoin)
```

**Total Length**: 45 characters (without spaces) or 51 characters (with spaces in groups of 4)

### Checksum Algorithm

D-IBAN uses the **MOD-97-10** algorithm, the same standard used by banks worldwide:

1. Rearrange: Move first 4 characters (country code + checksum) to the end
2. Convert: Replace letters with numbers (A=10, B=11, ..., Z=35)
3. Calculate: Perform MOD-97 operation
4. Validate: Result must equal 1 for valid IBANs

### Base36 Encoding

The 25-byte address payload is encoded in Base36 (0-9, A-Z) to create a 39-character string that's compatible with IBAN's alphanumeric requirements.

### ISO 13616-1:2020 Compliance

D-IBAN fully complies with [ISO 13616-1:2020](https://www.iso.org/standard/81090.html) (Financial services — International bank account number — Part 1: Structure of the IBAN), ensuring:

- ✅ Standard IBAN structure and format
- ✅ MOD-97-10 checksum validation
- ✅ Compatibility with banking systems
- ✅ International standard compliance

## Examples

### Example 1: P2PKH Address

```javascript
// Encode
const address = "DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n";
const encoded = encodeDIBAN(address);
console.log(encoded.diban);
// Output: "DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789"

// Decode
const decoded = decodeDIBAN(encoded.diban);
console.log(decoded.address === address);  // true
```

### Example 2: P2SH Address (Multisig)

```javascript
const multisigAddress = "9xxx...";  // P2SH address
const encoded = encodeDIBAN(multisigAddress);
console.log(encoded.type.name);  // "P2SH"
```

### Example 3: Verification

```javascript
const diban = "DO12 0000 1234 5678 9012 3456 7890 1234 5678 9012 3456 789";
if (verifyDIBAN(diban)) {
    console.log("Valid D-IBAN");
    const decoded = decodeDIBAN(diban);
    console.log("Address:", decoded.address);
} else {
    console.log("Invalid D-IBAN");
}
```

## DogeMoji Protocol

**DogeMoji** is a compact, user-friendly protocol that converts Dogecoin addresses into emoji sequences. It's designed to be more memorable, shareable, and visually appealing than traditional addresses.

### Why DogeMoji?

- **Compact**: Emoji sequences are shorter than traditional addresses
- **Memorable**: Visual emojis are easier to remember than alphanumeric strings
- **Shareable**: Perfect for social media, messaging, and QR codes
- **Validatable**: Built-in checksum emoji for error detection
- **Universal**: Works with all Dogecoin address types

### How DogeMoji Works

1. **Type Emoji**: First emoji indicates address type
   - 🐕 = P2PKH (standard addresses)
   - 🔐 = P2SH (multisig, scripts)
   - 🚀 = P2WPKH (Bech32 witness)
   - ⏰ = P2SH-CLTV (time-locked)

2. **Payload Encoding**: Address bytes encoded as emoji sequence using 64-emoji base encoding

3. **Checksum Emoji**: Last emoji is a checksum for validation (✅, ✔️, ✓, ☑️, 🔒, 🔐, 🔑, 🎫)

### Example

```javascript
// Encode
const address = "DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n";
const result = encodeDogeMoji(address);
console.log(result.emoji);  // "🐕🚀🌙💎⭐🔥💫✨..."

// Verify
const isValid = verifyDogeMoji(result.emoji);
console.log(isValid);  // true

// Decode
const decoded = decodeDogeMoji(result.emoji);
console.log(decoded.address === address);  // true
```

### Usage

```javascript
// Include the library
<script src="js/dogemoji.js"></script>

// Encode address to emoji
const emoji = encodeDogeMoji("DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n");
console.log(emoji.emoji);  // Emoji sequence

// Verify emoji address
if (verifyDogeMoji(emoji.emoji)) {
    console.log("Valid DogeMoji!");
}

// Decode back to address
const address = decodeDogeMoji(emoji.emoji);
console.log(address.address);  // Original Dogecoin address
```

## DogeWords Protocol

**DogeWords** is a mnemonic-style protocol that converts Dogecoin addresses into sequences of short, positive, kind words. It's designed to be easy to read, remember, and share - perfect for human-friendly address representation.

### Why DogeWords?

- **Human-Friendly**: Uses short, positive words that are easy to read and remember
- **Kind & Positive**: All words are carefully selected to be positive and kind
- **Mnemonic Style**: Similar to seed phrase mnemonics, but for addresses
- **Validatable**: Built-in checksum word for error detection
- **Universal**: Works with all Dogecoin address types

### How DogeWords Works

1. **Type Word**: First word indicates address type
   - `dog` = P2PKH (standard addresses)
   - `safe` = P2SH (multisig, scripts)
   - `fast` = P2WPKH (Bech32 witness)
   - `time` = P2SH-CLTV (time-locked)

2. **Payload Encoding**: Address bytes encoded as word sequence using 64-word base encoding

3. **Checksum Word**: Last word is a checksum for validation (`valid`, `check`, `proof`, `solid`, `sound`, `sure`, `true`, `good`)

### Word List

DogeWords uses 64 carefully selected short, positive, kind words:
- Examples: `joy`, `love`, `hope`, `calm`, `warm`, `kind`, `nice`, `cool`, `safe`, `sure`, `true`, `wise`, `bold`, `free`, `pure`, `rich`, `soft`, `sweet`, `bright`, `clear`, `fresh`, `gentle`, `happy`, `lucky`, `magic`, `peace`, `quiet`, `rapid`, `smooth`, `strong`, `sunny`, `swift`, `trust`, `vital`, `zest`, `zen`, `ace`, `art`, `beam`, `bliss`, `bloom`, `brave`, `cheer`, `charm`, `dream`, `ease`, `faith`, `flame`, `flash`, `glow`, `grace`, `heart`, `honor`, `light`, `mercy`, `mirth`, `noble`, `pride`, `smile`, `spark`, `unity`, `valor`, `vivid`, `whole`

### Example

```javascript
// Encode
const address = "DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n";
const result = encodeDogeWords(address);
console.log(result.words);  // "dog joy love hope calm warm kind nice cool ..."

// Verify
const isValid = verifyDogeWords(result.words);
console.log(isValid);  // true

// Decode
const decoded = decodeDogeWords(result.words);
console.log(decoded.address === address);  // true
```

### Usage

```javascript
// Include the library
<script src="js/dogewords.js"></script>

// Encode address to words
const words = encodeDogeWords("DTqAFgNNUgiPEfFmc4HZUkqJ4sz5vADd1n");
console.log(words.words);  // Word sequence

// Verify word address
if (verifyDogeWords(words.words)) {
    console.log("Valid DogeWords!");
}

// Decode back to address
const address = decodeDogeWords(words.words);
console.log(address.address);  // Original Dogecoin address
```

## Browser Support

D-IBAN requires modern browser features:

- **BigInt** support (Chrome 67+, Firefox 68+, Safari 14+, Edge 79+)
- **TextEncoder/TextDecoder** (all modern browsers)
- **Uint8Array** (all modern browsers)

For older browsers, consider using a polyfill for BigInt.

## Bank Implementation

Banks can implement D-IBAN with **minimal structural changes** because it uses the same **ISO 13616-1:2020** standard that banks already use for traditional IBAN processing.

### Key Benefits for Banks:

- ✅ **Reuses Existing Infrastructure**: Same validation, same checksum algorithm, same format
- ✅ **Minimal Code Changes**: ~260 lines of isolated, testable code
- ✅ **No Core System Changes**: Additive implementation only
- ✅ **Standards Compliant**: Uses existing ISO 13616-1:2020 standard
- ✅ **Low Risk**: Isolated module, easy to test and deploy

### Implementation Approaches:

1. **Country Code Registration**: Treat "DO" as official IBAN country code
2. **Extended IBAN Format**: Add Dogecoin handling to existing IBAN router
3. **Middleware Integration**: Add D-IBAN layer before existing processing

### What Banks Need to Change:

**Existing Systems (No Changes):**
- IBAN validation engine
- MOD-97-10 checksum algorithm
- Payment routing infrastructure
- Transaction processing systems

**New Components (Isolated):**
- D-IBAN decoder module
- Dogecoin address validator
- Country code router condition

For detailed implementation guide, see **[BANK_IMPLEMENTATION.md](docs/BANK_IMPLEMENTATION.md)** which includes:
- Complete integration examples
- Code samples
- Implementation phases
- Cost estimation
- Security considerations
- Compliance guidelines

## Use Cases

### Banking Integration
Convert Dogecoin addresses to IBAN format for integration with banking systems that expect IBAN codes.

### Payment Processing
Use D-IBAN codes in payment gateways and financial software that require IBAN-format account numbers.

### Accounting Software
Import Dogecoin addresses into accounting and financial reporting tools that support IBAN format.

### Financial Reporting
Generate reports with standardized IBAN-format codes for compliance and auditing purposes.

## Security Notes

- ✅ **Checksum Validation**: All D-IBAN codes include MOD-97-10 checksum validation
- ✅ **Error Detection**: Can detect single-digit errors, transpositions, and common mistakes
- ✅ **Reversible**: Encoding and decoding are 100% reversible (lossless)
- ⚠️ **Address Validation**: Always validate Dogecoin addresses before encoding
- ⚠️ **Type Detection**: Address type is detected from prefix; verify if critical

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source. See LICENSE file for details.

## References

- [ISO 13616-1:2020 Standard](https://www.iso.org/standard/81090.html)
- [IBAN Wikipedia](https://en.wikipedia.org/wiki/International_Bank_Account_Number)
- [Dogecoin Documentation](https://dogecoin.com/)

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**D-IBAN v1.0** - Dogecoin Protocol IBAN Address Format Converter  
Compliant with **ISO 13616-1:2020** International Standard

