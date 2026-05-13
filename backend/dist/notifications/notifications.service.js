"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
async function createNotification(userId, title, message, type = 'INFO') {
    try {
        await prisma_1.prisma.notification.create({
            data: { userId, title, message, type: type },
        });
    }
    catch (err) {
        logger_1.logger.error('createNotification error:', err);
    }
}
