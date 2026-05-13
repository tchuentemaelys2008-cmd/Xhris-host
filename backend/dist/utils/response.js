"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaginated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', status = 200) => {
    res.status(status).json({ success: true, message, data });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, status = 400, errors) => {
    res.status(status).json({ success: false, message, ...(errors && { errors }) });
};
exports.sendError = sendError;
const sendPaginated = (res, data, total, page, limit) => {
    res.json({
        success: true,
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
};
exports.sendPaginated = sendPaginated;
