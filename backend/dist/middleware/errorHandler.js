"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Erreur interne du serveur';
    if (err.code === 'P2002') {
        statusCode = 409;
        message = 'Cette ressource existe déjà';
    }
    else if (err.code === 'P2025') {
        statusCode = 404;
        message = 'Ressource non trouvée';
    }
    else if (err.code === 'P2003') {
        statusCode = 400;
        message = 'Référence invalide';
    }
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Token invalide';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expiré';
    }
    if (err.name === 'ValidationError') {
        statusCode = 422;
        message = err.message;
    }
    if (statusCode === 500) {
        logger_1.logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, url: req.url, method: req.method });
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
