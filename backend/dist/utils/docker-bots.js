"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployBotContainer = deployBotContainer;
exports.stopBotContainer = stopBotContainer;
exports.startBotContainer = startBotContainer;
exports.deleteBotContainer = deleteBotContainer;
exports.getBotContainerLogs = getBotContainerLogs;
exports.getBotContainerStats = getBotContainerStats;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function deployBotContainer(botId, platform, envVars = {}) {
    const containerName = `xhris-bot-${botId}`;
    const envString = Object.entries(envVars)
        .map(([k, v]) => `-e ${k}="${v}"`)
        .join(' ');
    const imageMap = {
        WHATSAPP: 'node:20-alpine',
        DISCORD: 'node:20-alpine',
        TELEGRAM: 'node:20-alpine',
    };
    const image = imageMap[platform] || 'node:20-alpine';
    const cmd = `docker run -d --name ${containerName} \
    --memory=256m --cpus=0.25 \
    --restart unless-stopped \
    ${envString} \
    ${image} sh -c "echo 'Bot ${botId} running on ${platform}' && while true; do sleep 30; done"`;
    const { stdout } = await execAsync(cmd);
    return stdout.trim();
}
async function stopBotContainer(botId) {
    const containerName = `xhris-bot-${botId}`;
    await execAsync(`docker stop ${containerName}`).catch(() => { });
}
async function startBotContainer(botId) {
    const containerName = `xhris-bot-${botId}`;
    await execAsync(`docker start ${containerName}`).catch(() => { });
}
async function deleteBotContainer(botId) {
    const containerName = `xhris-bot-${botId}`;
    await execAsync(`docker stop ${containerName}`).catch(() => { });
    await execAsync(`docker rm ${containerName}`).catch(() => { });
}
async function getBotContainerLogs(botId) {
    try {
        const containerName = `xhris-bot-${botId}`;
        const { stdout } = await execAsync(`docker logs ${containerName} --tail 50`);
        return stdout.split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
async function getBotContainerStats(botId) {
    try {
        const containerName = `xhris-bot-${botId}`;
        const { stdout } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
        const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
        return { cpu: cpu || 0, ram: ram || 0 };
    }
    catch {
        return { cpu: 0, ram: 0 };
    }
}
