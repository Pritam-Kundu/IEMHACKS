const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in the environment variables');
        }
        await mongoose.connect(uri);
        console.log(`MongoDB Atlas Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
