const { GoogleGenAI } = require("@google/genai");

// Initialize Google Gen AI with the API key from environment variables
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Use a model provided by env, fallback to gemini-2.5-flash
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/**
 * Generate a response using the Gemini API.
 * 
 * @param {Array} history - Array of previous messages in the conversation
 * @param {String} newMessage - The new message from the user
 * @param {String} systemInstruction - The persona and context instructions for the AI
 * @returns {String} The text response from Gemini
 */
const generateResponse = async (history, newMessage, systemInstruction, attachments = []) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API key is not configured.");
        }

        // Format history for the SDK's chat feature
        // @google/genai format uses `role` (user or model) and `parts` (array of text objects)
        const formattedHistory = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Start a chat session with the provided system instruction and history
        const chat = ai.chats.create({
            model: MODEL_NAME,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7, // Good balance for educational responses
            },
            history: formattedHistory
        });

        let messageParts = [];
        if (newMessage) {
            messageParts.push(newMessage);
        }
        
        if (attachments && attachments.length > 0) {
            attachments.forEach(att => {
                messageParts.push({
                    inlineData: {
                        data: att.data,
                        mimeType: att.mimeType
                    }
                });
            });
        }

        // If it's a single string, we can just pass the string, else we pass the array of parts
        const finalMessage = messageParts.length === 1 && typeof messageParts[0] === 'string' ? messageParts[0] : messageParts;

        // Send the new message
        const response = await chat.sendMessage({
            message: finalMessage
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

const generateResponseStream = async (history, newMessage, systemInstruction, attachments = []) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API key is not configured.");
        }

        const formattedHistory = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = ai.chats.create({
            model: MODEL_NAME,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            },
            history: formattedHistory
        });

        let messageParts = [];
        if (newMessage) {
            messageParts.push(newMessage);
        }
        
        if (attachments && attachments.length > 0) {
            attachments.forEach(att => {
                messageParts.push({
                    inlineData: {
                        data: att.data,
                        mimeType: att.mimeType
                    }
                });
            });
        }

        const finalMessage = messageParts.length === 1 && typeof messageParts[0] === 'string' ? messageParts[0] : messageParts;

        // Use sendMessageStream for streaming
        const responseStream = await chat.sendMessageStream({
            message: finalMessage
        });

        return responseStream;
    } catch (error) {
        console.error("Gemini API Stream Error:", error);
        throw error;
    }
};

module.exports = {
    generateResponse,
    generateResponseStream
};
