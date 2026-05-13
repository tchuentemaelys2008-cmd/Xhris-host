"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailToken = exports.generatePasswordResetToken = exports.generateEmailToken = exports.verifyRefreshToken = exports.verifyToken = exports.generateTokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const JWT_SECRET = process.env.JWT_SECRET || 'xhris_super_secret_change_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'xhris_refresh_secret';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '30d';
const generateTokens = (payload) => {
    const sessionId = (0, uuid_1.v4)();
    const accessToken = jsonwebtoken_1.default.sign({ ...payload, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId, sessionId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
    return { accessToken, refreshToken, sessionId };
};
exports.generateTokens = generateTokens;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyToken = verifyToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
const generateEmailToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'email_verify' }, JWT_SECRET, { expiresIn: '24h' });
};
exports.generateEmailToken = generateEmailToken;
const generatePasswordResetToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
};
exports.generatePasswordResetToken = generatePasswordResetToken;
const verifyEmailToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyEmailToken = verifyEmailToken;
