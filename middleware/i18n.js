const fs = require('fs');
const path = require('path');

// Cache the locales to avoid reading files on every request
const localesPath = path.join(__dirname, '..', 'locales');
const locales = {
    en: JSON.parse(fs.readFileSync(path.join(localesPath, 'en.json'), 'utf8')),
    bn: JSON.parse(fs.readFileSync(path.join(localesPath, 'bn.json'), 'utf8'))
};

// Helper function to resolve dot-notation keys (e.g., 'common.login')
function resolveKey(obj, path) {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

const i18n = (req, res, next) => {
    // 1. Get language from cookie, default to 'en'
    let lang = req.cookies.edusmart_language || 'en';
    
    // Validate language
    if (!['en', 'bn'].includes(lang)) {
        lang = 'en';
    }
    
    req.language = lang;
    res.locals.language = lang;
    res.locals.direction = 'ltr'; // Both EN and BN are LTR
    
    // 2. Attach translation function 't' to res.locals
    res.locals.t = (key, replacements = {}) => {
        // Find the string in the requested language
        let str = resolveKey(locales[lang], key);
        
        // Fallback to English if key is missing in Bengali
        if (str === undefined && lang !== 'en') {
            str = resolveKey(locales['en'], key);
            console.warn(`[i18n] Missing key '${key}' in locale '${lang}'. Falling back to 'en'.`);
        }
        
        // If still missing, return the key itself
        if (str === undefined) {
            console.warn(`[i18n] Missing key '${key}' in all locales.`);
            return key;
        }
        
        // 3. Handle dynamic replacements (e.g., {{name}})
        for (const [placeholder, value] of Object.entries(replacements)) {
            str = str.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
        }
        
        return str;
    };
    
    next();
};

module.exports = i18n;
