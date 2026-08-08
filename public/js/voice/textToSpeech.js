/**
 * EduSmart Text-to-Speech Utility
 * Provides a modular wrapper for the Web Speech API's SpeechSynthesis.
 */
class TextToSpeech {
    constructor(options = {}) {
        this.language = options.language || 'en-US';
        this.onStateChange = options.onStateChange || (() => {});
        this.isSupported = 'speechSynthesis' in window;
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.rate = options.rate || 1;
        this.activeUtterance = null;
        this.currentVoice = null;

        if (this.isSupported) {
            // Load voices initially
            this.loadVoices();
            // Wait for voices to be loaded (some browsers load them asynchronously)
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.loadVoices();
            }
        }
    }

    loadVoices() {
        if (!this.isSupported) return;
        this.voices = this.synth.getVoices();
        this.setVoiceForLanguage(this.language);
    }

    setLanguage(langCode) {
        this.language = langCode;
        this.setVoiceForLanguage(langCode);
    }
    
    setRate(rate) {
        this.rate = rate;
    }

    setVoiceForLanguage(langCode) {
        if (this.voices.length === 0) return;
        
        // Find a voice that matches the language
        // E.g., for 'en-US', we look for exactly 'en-US' or at least 'en'
        const exactMatch = this.voices.find(voice => voice.lang === langCode);
        const prefixMatch = this.voices.find(voice => voice.lang.startsWith(langCode.split('-')[0]));
        
        this.currentVoice = exactMatch || prefixMatch || this.voices[0]; // fallback to default
    }

    // Clean text by stripping HTML tags and markdown
    sanitizeText(text) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        let plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Remove basic markdown
        plainText = plainText.replace(/[*_#`~>]/g, '');
        return plainText;
    }

    speak(text) {
        if (!this.isSupported) {
            console.warn("Text-to-Speech is not supported in this browser.");
            return;
        }

        // Stop any ongoing speech
        this.stop();

        const sanitized = this.sanitizeText(text);
        if (!sanitized.trim()) return;

        this.activeUtterance = new SpeechSynthesisUtterance(sanitized);
        
        if (this.currentVoice) {
            this.activeUtterance.voice = this.currentVoice;
        }
        
        this.activeUtterance.lang = this.language;
        this.activeUtterance.rate = this.rate;

        this.activeUtterance.onstart = () => {
            this.onStateChange('PLAYING');
        };

        this.activeUtterance.onend = () => {
            this.activeUtterance = null;
            this.onStateChange('STOPPED');
        };

        this.activeUtterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            this.activeUtterance = null;
            // Ignore cancel errors which happen normally when we stop manually
            if (event.error !== 'canceled') {
                this.onStateChange('ERROR');
            }
        };

        this.synth.speak(this.activeUtterance);
    }

    pause() {
        if (this.isSupported && this.synth.speaking) {
            this.synth.pause();
            this.onStateChange('PAUSED');
        }
    }

    resume() {
        if (this.isSupported && this.synth.paused) {
            this.synth.resume();
            this.onStateChange('PLAYING');
        }
    }

    stop() {
        if (this.isSupported) {
            this.synth.cancel(); // Stops all speaking
            this.activeUtterance = null;
            this.onStateChange('STOPPED');
        }
    }
    
    toggle(text) {
        if (this.synth.speaking) {
            this.stop();
        } else {
            this.speak(text);
        }
    }
}

// Export to global scope
window.EduSmartTextToSpeech = TextToSpeech;
