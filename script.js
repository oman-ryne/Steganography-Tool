class SteganographyTool {
    constructor() {
        this.selectedImage = null;
        this.imagePreview = '';
        this.message = '';
        this.extractedMessage = '';
        this.processedImageUrl = '';
        this.isProcessing = false;
        this.showMessage = false;

        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            imageInput: document.getElementById('imageInput'),
            uploadArea: document.getElementById('uploadArea'),
            messageInput: document.getElementById('messageInput'),
            hideButton: document.getElementById('hideButton'),
            extractButton: document.getElementById('extractButton'),
            downloadButton: document.getElementById('downloadButton'),
            originalImage: document.getElementById('originalImage'),
            processedImage: document.getElementById('processedImage'),
            originalImageCard: document.getElementById('originalImageCard'),
            processedImageCard: document.getElementById('processedImageCard'),
            extractedMessageArea: document.getElementById('extractedMessageArea'),
            extractedMessage: document.getElementById('extractedMessage'),
            toggleVisibility: document.getElementById('toggleVisibility'),
            eyeIcon: document.getElementById('eyeIcon'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage')
        };

        this.tabTriggers = document.querySelectorAll('.tab-trigger');
        this.tabContents = document.querySelectorAll('.tab-content');
    }

    bindEvents() {
        // Image upload
        this.elements.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('drag-over');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('drag-over');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processImageFile(files[0]);
            }
        });

        // Message input
        this.elements.messageInput.addEventListener('input', (e) => {
            this.message = e.target.value;
            this.updateButtonStates();
        });

        // Buttons
        this.elements.hideButton.addEventListener('click', () => this.hideMessage());
        this.elements.extractButton.addEventListener('click', () => this.extractMessage());
        this.elements.downloadButton.addEventListener('click', () => this.downloadImage());
        this.elements.toggleVisibility.addEventListener('click', () => this.toggleMessageVisibility());

        // Tabs
        this.tabTriggers.forEach(trigger => {
            trigger.addEventListener('click', () => this.switchTab(trigger.dataset.tab));
        });
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }

    processImageFile(file) {
        if (file && file.type.startsWith('image/')) {
            if (file.size > 10 * 1024 * 1024) {
                this.showToast('Image size exceeds 10MB limit. Please choose a smaller file.', 'error');
                return;
            }

            this.selectedImage = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview = e.target.result;
                this.elements.originalImage.src = this.imagePreview;
                this.elements.originalImageCard.style.display = 'block';
                this.updateButtonStates();
                this.resetResults();
                this.showToast('Image uploaded successfully!', 'success');
            };
            reader.readAsDataURL(file);
        } else {
            this.showToast('Invalid file type. Please select a valid image file (PNG, JPG, etc.)', 'error');
        }
    }

    updateButtonStates() {
        const hasImage = !!this.selectedImage;
        const hasMessage = this.message.trim().length > 0;

        this.elements.hideButton.disabled = !hasImage || !hasMessage || this.isProcessing;
        this.elements.extractButton.disabled = !hasImage || this.isProcessing;
    }

    resetResults() {
        this.extractedMessage = '';
        this.processedImageUrl = '';
        this.elements.processedImageCard.style.display = 'none';
        this.elements.extractedMessageArea.style.display = 'none';
    }

    switchTab(tabName) {
        this.tabTriggers.forEach(trigger => {
            trigger.classList.toggle('active', trigger.dataset.tab === tabName);
        });

        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    stringToBinary(str) {
        return str.split('').map(char => 
            char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join('');
    }

    binaryToString(binary) {
        const chars = binary.match(/.{8}/g) || [];
        return chars.map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
    }

    async hideMessage() {
        if (!this.selectedImage || !this.message.trim()) {
            this.showToast('Please select an image and enter a message to hide.', 'error');
            return;
        }

        this.setProcessing(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const binaryMessage = this.stringToBinary(this.message + '\0');
                
                if (binaryMessage.length > data.length * 0.25) {
                    this.showToast('Message too large for selected image. Try a larger image or shorter message.', 'error');
                    this.setProcessing(false);
                    return;
                }
                
                let messageIndex = 0;
                
                for (let i = 0; i < data.length && messageIndex < binaryMessage.length; i += 4) {
                    data[i] = (data[i] & 0xFE) | parseInt(binaryMessage[messageIndex]);
                    messageIndex++;
                }

                ctx.putImageData(imageData, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        if (this.processedImageUrl) {
                            URL.revokeObjectURL(this.processedImageUrl);
                        }
                        this.processedImageUrl = URL.createObjectURL(blob);
                        this.elements.processedImage.src = this.processedImageUrl;
                        this.elements.processedImageCard.style.display = 'block';
                        this.showToast('Message hidden successfully!', 'success');
                    }
                }, 'image/png');
                
                this.setProcessing(false);
            };

            img.src = this.imagePreview;
        } catch (error) {
            console.error('Error hiding message:', error);
            this.showToast('Failed to hide message in image.', 'error');
            this.setProcessing(false);
        }
    }

    async extractMessage() {
        if (!this.selectedImage) {
            this.showToast('Please select an image to extract a message from.', 'error');
            return;
        }

        this.setProcessing(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let binaryMessage = '';
                
                for (let i = 0; i < data.length; i += 4) {
                    binaryMessage += (data[i] & 1).toString();
                }

                let extractedText = '';
                for (let i = 0; i < binaryMessage.length; i += 8) {
                    const byte = binaryMessage.substr(i, 8);
                    if (byte.length === 8) {
                        const char = String.fromCharCode(parseInt(byte, 2));
                        if (char === '\0') break;
                        extractedText += char;
                    }
                }

                this.extractedMessage = extractedText;
                
                if (extractedText.trim()) {
                    this.elements.extractedMessage.textContent = this.showMessage ? extractedText : '•'.repeat(extractedText.length);
                    this.elements.extractedMessageArea.style.display = 'block';
                    this.showToast('Message extracted successfully!', 'success');
                } else {
                    this.showToast('No hidden message found in this image.', 'error');
                }
                
                this.setProcessing(false);
            };

            img.src = this.imagePreview;
        } catch (error) {
            console.error('Error extracting message:', error);
            this.showToast('Failed to extract message from image.', 'error');
            this.setProcessing(false);
        }
    }

    toggleMessageVisibility() {
        this.showMessage = !this.showMessage;
        if (this.extractedMessage) {
            this.elements.extractedMessage.textContent = this.showMessage 
                ? this.extractedMessage 
                : '•'.repeat(this.extractedMessage.length);
        }
        
        this.elements.eyeIcon.className = this.showMessage ? 'fas fa-eye' : 'fas fa-eye-slash';
    }

    downloadImage() {
        if (this.processedImageUrl) {
            const link = document.createElement('a');
            link.href = this.processedImageUrl;
            link.download = 'steganographic_image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        this.updateButtonStates();
        
        if (processing) {
            this.elements.hideButton.innerHTML = '<div class="loading-spinner"></div> Processing...';
            this.elements.extractButton.innerHTML = '<div class="loading-spinner"></div> Processing...';
            this.elements.hideButton.classList.add('loading');
            this.elements.extractButton.classList.add('loading');
        } else {
            this.elements.hideButton.innerHTML = '<i class="fas fa-lock"></i> Hide Message';
            this.elements.extractButton.innerHTML = '<i class="fas fa-key"></i> Extract Message';
            this.elements.hideButton.classList.remove('loading');
            this.elements.extractButton.classList.remove('loading');
        }
    }

    showToast(message, type = 'info') {
        this.elements.toastMessage.textContent = message;
        this.elements.toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SteganographyTool();
});

