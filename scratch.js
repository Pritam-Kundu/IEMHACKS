require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function listModels() {
    try {
        const response = await ai.models.list();
        let models = [];
        // response might be an async iterable
        if (response && response[Symbol.asyncIterator]) {
            for await (const model of response) {
                models.push(model.name);
            }
        } else if (Array.isArray(response)) {
            models = response.map(m => m.name);
        } else {
            models = Object.keys(response).map(k => response[k].name).filter(Boolean);
        }
        
        fs.writeFileSync('models.json', JSON.stringify(models, null, 2));
        console.log("Saved to models.json");
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
