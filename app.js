require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const i18n = require('./middleware/i18n');
const routes = require('./routes');

// Initialize Express App
const app = express();

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
// Disable specific helmet rules if they conflict with Tailwind CDN or Firebase client scripts for now
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());

// Mux Webhook (Needs raw body for signature verification)
const muxWebhookRouter = require('./routes/muxWebhook');
app.use('/api/webhooks/mux', express.raw({ type: 'application/json' }), muxWebhookRouter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// i18n Middleware
app.use(i18n);

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

module.exports = app;
