/**
 * Centralised error handler.
 *
 * Any controller / route that throws or calls `next(err)` ends up here. We
 * normalise the error shape so clients always get `{ error: string }` and
 * unexpected errors are logged on the server for debugging.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    if (status >= 500) {
        console.error('[errorHandler]', err);
    }

    res.status(status).json({ error: message });
};

module.exports = { errorHandler };
