/**
 * EduSmart Speech-to-Text Utility
 * Provides a modular wrapper for the Web Speech API's SpeechRecognition.
 */
class SpeechToText {
    constructor(options = {}) {
        this.language = options.language || 'en-US';
        this.onResult = options.onResult || (() => {});
        this.onError = options.onError || (() => {});
        this.onStateChange = options.onStateChange || (() => {});
        this.isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        
        this.isListening = false;
        this.recognition = null;

        if (this.isSupported) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false; // Stop after a single utterance
            this.recognition.interimResults = true; // Show interim results
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.onStateChange('LISTENING');
            };
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                this.onResult({
                    final: finalTranscript,
                    interim: interimTranscript,
                    isFinal: finalTranscript.length > 0
                });
            };
            
            this.recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                this.isListening = false;
                
                let errorMessage = 'An error occurred with speech recognition.';
                if (event.error === 'not-allowed') {
                    errorMessage = 'Microphone access is blocked. Please allow microphone access in your browser settings to use voice input.';
                } else if (event.error === 'no-speech') {
                    errorMessage = 'No speech detected. Please try again.';
                } else if (event.error === 'network') {
                    errorMessage = 'Network error occurred during speech recognition.';
                }
                
                this.onError(errorMessage);
                this.onStateChange('ERROR');
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.onStateChange('STOPPED');
            };
        }
    }

    setLanguage(langCode) {
        this.language = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
    }

    start() {
        if (!this.isSupported) {
            this.onError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or another supported browser.");
            return;
        }
        if (this.isListening) return;
        
        try {
            this.recognition.lang = this.language;
            this.recognition.start();
            this.onStateChange('PROCESSING'); // Intermediate state before onstart fires
        } catch (error) {
            console.error("Error starting speech recognition:", error);
            this.onError("Failed to start microphone. It may already be in use.");
            this.onStateChange('ERROR');
        }
    }

    stop() {
        if (!this.isListening || !this.recognition) return;
        this.recognition.stop();
        this.isListening = false;
        this.onStateChange('STOPPED');
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }
}

// Export to global scope if not using a module bundler
window.EduSmartSpeechToText = SpeechToText;
