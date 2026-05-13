"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireWebhook = fireWebhook;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
async function fireWebhook(userId, event, data) {
    try {
        const webhooks = await prisma_1.prisma.webhook.findMany({
            where: { userId, status: 'ACTIVE', events: { has: event } },
        });
        for (const wh of webhooks) {
            try {
                const payload = { event, timestamp: new Date().toISOString(), data };
                const sig = crypto_1.default.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');
                const resp = await fetch(wh.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-XHRIS-Signature': `sha256=${sig}`,
                    },
                    body: JSON.stringify(payload),
                });
                await prisma_1.prisma.webhook.update({
                    where: { id: wh.id },
                    data: { lastActivity: new Date(), lastStatus: `${resp.status}` },
                });
            }
            catch (err) {
                logger_1.logger.error(`Webhook fire error for ${wh.id}:`, err);
            }
        }
    }
    catch (err) {
        logger_1.logger.error('fireWebhook error:', err);
    }
}
