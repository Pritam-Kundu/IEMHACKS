const admin = require('firebase-admin');

// Initialize Firebase Admin only if credentials are provided in the environment
const initializeFirebaseAdmin = () => {
    try {
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('Firebase Admin credentials missing in .env. Authentication middleware will fail if accessed.');
            return null;
        }

        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle escaped newlines in private key which often happens when passed via .env
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            })
        });
        
        console.log('Firebase Admin Initialized Successfully');
        return app;
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error.message);
        return null;
    }
};

const app = initializeFirebaseAdmin();

module.exports = { admin, app };
