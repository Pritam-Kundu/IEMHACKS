require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
// Connection happens asynchronously before app starts

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
// Disable specific helmet rules if they conflict with Tailwind CDN or Firebase client scripts for now
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Ignore favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Routes
app.use('/', routes);

// 404 Handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.statusCode = 404;
    next(err);
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
