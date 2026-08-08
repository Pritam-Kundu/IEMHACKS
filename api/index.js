const app = require('../app');
const connectDB = require('../config/db');

// Export an async function that ensures the DB is connected before handling the request
module.exports = async (req, res) => {
    await connectDB();
    return app(req, res);
};
