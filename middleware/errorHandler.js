/**
 * Centralized error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Depending on the request type, we either send JSON or render an error page
    if (req.accepts('html')) {
        // We will create a views/pages/error.ejs later
        // For now, just send text or basic HTML
        res.status(statusCode).send(`<h1>Error ${statusCode}</h1><p>${message}</p>`);
    } else {
        res.status(statusCode).json({
            success: false,
            error: message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        });
    }
};

module.exports = errorHandler;
