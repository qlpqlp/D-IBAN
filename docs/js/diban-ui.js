/*******************************************************
 *  D-IBAN UI Functions
 *  User interface handlers for the D-IBAN web converter
 * 
 *  Author: Paulo Vidal (Dogecoin Foundation Dev)
 *  GitHub: https://github.com/qlpqlp
 *  X: https://x.com/inevitable360
 *  Website: https://dogecoin.org
 *******************************************************/

/************* UI FUNCTIONS **************/
function toggleProtocolDescription(header) {
    const content = header.nextElementSibling;
    const isExpanded = header.classList.contains('expanded');
    
    if (isExpanded) {
        header.classList.remove('expanded');
        content.classList.remove('expanded');
    } else {
        header.classList.add('expanded');
        content.classList.add('expanded');
    }
}

function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const tabElement = document.getElementById(tabName + '-tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Handle "Other Converters" tab button activation
    if (tabName === 'dogemoji' || tabName === 'dogewords' || tabName === 'steganography') {
        // Find the "Other Converters" button and make it active
        const otherConvertersButton = Array.from(document.querySelectorAll('.tab-button')).find(btn => {
            const text = btn.textContent.trim();
            return text.includes('Other Converters');
        });
        if (otherConvertersButton) {
            otherConvertersButton.classList.add('active');
        }
    }
    
    // Add active class to clicked button (for non-dropdown tabs)
    if (tabName !== 'dogemoji' && tabName !== 'dogewords' && tabName !== 'steganography') {
        const evt = typeof event !== 'undefined' ? event : window.event;
        if (evt) {
            const clickedButton = evt.target.closest('.tab-button');
            if (clickedButton && !clickedButton.closest('.dropdown-tab')) {
                clickedButton.classList.add('active');
            }
        }
    }
}

function showConverterModal() {
    const modal = document.getElementById('converter-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeConverterModal(event) {
    // If event is provided, only close if clicking the overlay (not the modal itself)
    if (event) {
        if (event.target !== event.currentTarget) {
            return; // Don't close if clicking inside modal
        }
    }
    const modal = document.getElementById('converter-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function selectConverter(tabName) {
    closeConverterModal();
    // Small delay to allow modal to close first
    setTimeout(() => {
        switchTab(tabName);
    }, 100);
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeConverterModal();
    }
});

function convertToDIBAN() {
    const input = document.getElementById('doge-input').value.trim();
    const resultDiv = document.getElementById('encode-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a Dogecoin address';
        resultDiv.style.display = 'block';
        return;
    }

    try {
        const result = encodeDIBAN(input);
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">account_balance_wallet</span> D-IBAN Code:</span>
            <div style="font-size: 1.1em; margin: 10px 0;">${result.diban}</div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
            </div>
            <button class="copy-button" onclick="copyToClipboard('${result.diban.replace(/\s+/g, '')}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy D-IBAN</button>
        `;
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        resultDiv.style.display = 'block';
    }
}

function verifyDIBANInput() {
    const input = document.getElementById('verify-input').value.trim();
    const resultDiv = document.getElementById('verify-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a D-IBAN code';
        resultDiv.style.display = 'block';
        return;
    }

    const isValid = verifyDIBAN(input);
    if (isValid) {
        resultDiv.className = 'result success';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">check_circle</span> Valid D-IBAN</span>The D-IBAN code is valid and checksum verified.';
    } else {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">cancel</span> Invalid D-IBAN</span>The D-IBAN code is invalid or checksum verification failed.';
    }
    resultDiv.style.display = 'block';
}

function decodeDIBANInput() {
    const input = document.getElementById('decode-input').value.trim();
    const resultDiv = document.getElementById('decode-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a D-IBAN code';
        resultDiv.style.display = 'block';
        return;
    }

    try {
        const result = decodeDIBAN(input);
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">account_balance_wallet</span> Dogecoin Address:</span>
            <div style="font-size: 1.1em; margin: 10px 0;">${result.address}</div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
            </div>
            <button class="copy-button" onclick="copyToClipboard('${result.address}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy Address</button>
        `;
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        resultDiv.style.display = 'block';
    }
}

function copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const button = buttonElement || (window.event && window.event.target.closest('.copy-button')) || (window.event && window.event.target);
        if (!button) {
            console.warn('Copy button element not found');
            return;
        }
        
        const originalHTML = button.innerHTML;
        button.classList.add('copied');
        button.innerHTML = '<span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">check</span> Copied!';
        button.style.background = '#4caf50';
        button.style.borderColor = '#4caf50';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
            button.style.background = '#333333';
            button.style.borderColor = '#444444';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function copyCode(button) {
    const codeContainer = button.closest('.code-container');
    const codeElement = codeContainer.querySelector('pre code');
    const codeText = codeElement.textContent || codeElement.innerText;
    
    navigator.clipboard.writeText(codeText).then(() => {
        // Show feedback
        const originalHTML = button.innerHTML;
        button.classList.add('copied');
        button.innerHTML = '<span class="material-icons">check</span><span>Copied!</span>';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        // Fallback: select text
        const range = document.createRange();
        range.selectNode(codeElement);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    });
}

/************* DOGEMOJI UI FUNCTIONS **************/
function convertToDogeMoji() {
    const input = document.getElementById('dogemoji-input').value.trim();
    const resultDiv = document.getElementById('dogemoji-encode-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a Dogecoin address';
        resultDiv.style.display = 'block';
        return;
    }

    try {
        const result = encodeDogeMoji(input);
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">emoji_emotions</span> DogeMoji Sequence:</span>
            <div style="font-size: 2em; margin: 15px 0; word-break: break-all; line-height: 1.5;">${result.emoji}</div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
            </div>
            <button class="copy-button" onclick="copyToClipboard('${result.emoji}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy DogeMoji</button>
        `;
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        resultDiv.style.display = 'block';
    }
}

function verifyDogeMojiInput() {
    const input = document.getElementById('dogemoji-verify-input').value.trim();
    const resultDiv = document.getElementById('dogemoji-verify-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a DogeMoji sequence';
        resultDiv.style.display = 'block';
        return;
    }

    const isValid = verifyDogeMoji(input);
    if (isValid) {
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">check_circle</span> Valid DogeMoji</span>
            <div style="font-size: 1.5em; margin: 10px 0;">${input}</div>
            <p>The DogeMoji sequence is valid and checksum verified.</p>
        `;
    } else {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">cancel</span> Invalid DogeMoji</span>The DogeMoji sequence is invalid or checksum verification failed.';
    }
    resultDiv.style.display = 'block';
}

function decodeDogeMojiInput() {
    const input = document.getElementById('dogemoji-decode-input').value.trim();
    const resultDiv = document.getElementById('dogemoji-decode-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a DogeMoji sequence';
        resultDiv.style.display = 'block';
        return;
    }

    try {
        const result = decodeDogeMoji(input);
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">account_balance_wallet</span> Dogecoin Address:</span>
            <div style="font-size: 1.1em; margin: 10px 0;">${result.address}</div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
            </div>
            <button class="copy-button" onclick="copyToClipboard('${result.address}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy Address</button>
        `;
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        resultDiv.style.display = 'block';
    }
}

/************* DOGEWORDS UI FUNCTIONS **************/
function convertToDogeWords() {
    const input = document.getElementById('dogewords-input').value.trim();
    const resultDiv = document.getElementById('dogewords-encode-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a Dogecoin address';
        resultDiv.style.display = 'block';
        return;
    }

    try {
        const result = encodeDogeWords(input);
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">text_fields</span> DogeWords Sequence:</span>
            <div style="font-size: 1.2em; margin: 15px 0; word-break: break-word; line-height: 1.8; padding: 15px; background: rgba(255, 193, 7, 0.05); border-radius: 6px;">${result.words}</div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
            </div>
            <button class="copy-button" onclick="copyToClipboard('${result.words}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy DogeWords</button>
        `;
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        resultDiv.style.display = 'block';
    }
}

function verifyDogeWordsInput() {
    const input = document.getElementById('dogewords-verify-input').value.trim();
    const resultDiv = document.getElementById('dogewords-verify-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a DogeWords sequence';
        resultDiv.style.display = 'block';
        return;
    }

    const isValid = verifyDogeWords(input);
    if (isValid) {
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">check_circle</span> Valid DogeWords</span>
            <div style="font-size: 1.1em; margin: 10px 0; word-break: break-word; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 6px;">${input}</div>
            <p>The DogeWords sequence is valid and checksum verified.</p>
        `;
    } else {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">cancel</span> Invalid DogeWords</span>The DogeWords sequence is invalid or checksum verification failed.';
    }
    resultDiv.style.display = 'block';
}

function decodeDogeWordsInput() {
    const input = document.getElementById('dogewords-decode-input').value.trim();
    const resultDiv = document.getElementById('dogewords-decode-result');
    
    if (!input) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a DogeWords sequence';
        resultDiv.style.display = 'block';
        return;
    }

    try {
        const result = decodeDogeWords(input);
        resultDiv.className = 'result success';
        resultDiv.innerHTML = `
            <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">account_balance_wallet</span> Dogecoin Address:</span>
            <div style="font-size: 1.1em; margin: 10px 0;">${result.address}</div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
            </div>
            <button class="copy-button" onclick="copyToClipboard('${result.address}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy Address</button>
        `;
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        resultDiv.style.display = 'block';
    }
}

/************* STEGANOGRAPHY UI FUNCTIONS **************/
function encodeAddressInImageUI() {
    const addressInput = document.getElementById('steg-address-input').value.trim();
    const imageInput = document.getElementById('steg-image-input');
    const resultDiv = document.getElementById('steg-encode-result');
    
    if (!addressInput) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please enter a Dogecoin address';
        resultDiv.style.display = 'block';
        return;
    }
    
    if (!imageInput.files || imageInput.files.length === 0) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please select an image file';
        resultDiv.style.display = 'block';
        return;
    }
    
    const imageFile = imageInput.files[0];
    
    // Show loading state
    resultDiv.className = 'result info';
    resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">hourglass_empty</span> Processing...</span>Encoding address into image...';
    resultDiv.style.display = 'block';
    
    window.encodeAddressInImage(imageFile, addressInput)
        .then(result => {
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">image</span> Encoded Image:</span>
                <div style="margin: 15px 0;">
                    <img src="${result.url}" alt="Encoded image" style="max-width: 100%; border-radius: 8px; border: 2px solid #333333;">
                </div>
                <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                    <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})<br>
                    <strong style="color: #ffc107;">Original Size:</strong> ${(result.originalSize / 1024).toFixed(2)} KB<br>
                    <strong style="color: #ffc107;">Encoded Size:</strong> ${(result.newSize / 1024).toFixed(2)} KB
                </div>
                <a href="${result.url}" download="dogecoin-encoded.png" class="button" style="margin-top: 15px; text-decoration: none; display: inline-block; text-align: center;">
                    <span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">download</span> Download Encoded Image
                </a>
            `;
        })
        .catch(error => {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        });
}

function decodeAddressFromImageUI() {
    const imageInput = document.getElementById('steg-decode-image-input');
    const resultDiv = document.getElementById('steg-decode-result');
    
    if (!imageInput.files || imageInput.files.length === 0) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>Please select an image file';
        resultDiv.style.display = 'block';
        return;
    }
    
    const imageFile = imageInput.files[0];
    
    // Show loading state
    resultDiv.className = 'result info';
    resultDiv.innerHTML = '<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">hourglass_empty</span> Processing...</span>Decoding address from image...';
    resultDiv.style.display = 'block';
    
    window.decodeAddressFromImage(imageFile)
        .then(result => {
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                <span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">account_balance_wallet</span> Dogecoin Address:</span>
                <div style="font-size: 1.1em; margin: 10px 0;">${result.address}</div>
                <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                    <strong style="color: #ffc107;">Address Type:</strong> ${result.type.name} (${result.type.description})
                </div>
                <button class="copy-button" onclick="copyToClipboard('${result.address}', this)"><span class="material-icons" style="font-size: 0.9em; vertical-align: middle;">content_copy</span> Copy Address</button>
            `;
        })
        .catch(error => {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = `<span class="result-label"><span class="material-icons" style="font-size: 1em; vertical-align: middle;">error</span> Error:</span>${error.message}`;
        });
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Allow Enter key to trigger conversion
    const dogeInput = document.getElementById('doge-input');
    const verifyInput = document.getElementById('verify-input');
    const decodeInput = document.getElementById('decode-input');
    
    if (dogeInput) {
        dogeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') convertToDIBAN();
        });
    }
    
    if (verifyInput) {
        verifyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyDIBANInput();
        });
    }
    
    if (decodeInput) {
        decodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') decodeDIBANInput();
        });
    }

    // DogeMoji event listeners
    const dogemojiInput = document.getElementById('dogemoji-input');
    const dogemojiVerifyInput = document.getElementById('dogemoji-verify-input');
    const dogemojiDecodeInput = document.getElementById('dogemoji-decode-input');
    
    if (dogemojiInput) {
        dogemojiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') convertToDogeMoji();
        });
    }
    
    if (dogemojiVerifyInput) {
        dogemojiVerifyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyDogeMojiInput();
        });
    }
    
    if (dogemojiDecodeInput) {
        dogemojiDecodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') decodeDogeMojiInput();
        });
    }

    // DogeWords event listeners
    const dogewordsInput = document.getElementById('dogewords-input');
    const dogewordsVerifyInput = document.getElementById('dogewords-verify-input');
    const dogewordsDecodeInput = document.getElementById('dogewords-decode-input');
    
    if (dogewordsInput) {
        dogewordsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') convertToDogeWords();
        });
    }
    
    if (dogewordsVerifyInput) {
        dogewordsVerifyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyDogeWordsInput();
        });
    }
    
    if (dogewordsDecodeInput) {
        dogewordsDecodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') decodeDogeWordsInput();
        });
    }
});

