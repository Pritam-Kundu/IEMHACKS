const mongoose = require('mongoose');

// Global cache for the Mongoose connection
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in the environment variables');
        }

        console.log('Initializing new MongoDB connection...');
        cached.promise = mongoose.connect(uri).then((mongoose) => {
            console.log(`MongoDB Atlas Connected: ${mongoose.connection.host}`);
            return mongoose;
        });
    }
    
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        console.error('MongoDB Connection Error:', error.message);
        throw error;
    }
};

module.exports = connectDB;
