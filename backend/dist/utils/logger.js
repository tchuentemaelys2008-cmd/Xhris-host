"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${stack || message}`;
    if (Object.keys(meta).length)
        log += ` ${JSON.stringify(meta)}`;
    return log;
});
const transports = [
    new winston_1.default.transports.Console({
        format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
];
if (process.env.NODE_ENV === 'production') {
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
    }), new winston_daily_rotate_file_1.default({
        filename: path_1.default.join('logs', 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
    }));
}
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp(), logFormat),
    transports,
    exitOnError: false,
});
