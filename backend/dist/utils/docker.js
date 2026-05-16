"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerContainer = createServerContainer;
exports.stopServerContainer = stopServerContainer;
exports.startServerContainer = startServerContainer;
exports.deleteServerContainer = deleteServerContainer;
exports.getContainerStats = getContainerStats;
exports.getContainerLogs = getContainerLogs;
exports.deployFilesToContainer = deployFilesToContainer;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const DOCKER = process.env.DOCKER_BIN || 'docker';
async function createServerContainer(serverId, plan) {
    const port = 10000 + Math.floor(Math.random() * 10000);
    const containerName = `xhris-server-${serverId}`;
    const memoryMap = {
        STARTER: '512m', PRO: '1g', ADVANCED: '2g', ELITE: '4g'
    };
    const cpuMap = {
        STARTER: '0.5', PRO: '1', ADVANCED: '2', ELITE: '4'
    };
    const memory = memoryMap[plan] || '512m';
    const cpu = cpuMap[plan] || '0.5';
    const cmd = `${DOCKER} run -d --name ${containerName} \
    --memory=${memory} --cpus=${cpu} \
    -p ${port}:3000 \
    --restart unless-stopped \
    node:20-alpine sh -c "mkdir -p /app && tail -f /dev/null"`;
    const { stdout } = await execAsync(cmd);
    return { containerId: stdout.trim(), port };
}
async function stopServerContainer(serverId) {
    const containerName = `xhris-server-${serverId}`;
    await execAsync(`${DOCKER} stop ${containerName}`).catch(() => { });
}
async function startServerContainer(serverId) {
    const containerName = `xhris-server-${serverId}`;
    await execAsync(`${DOCKER} start ${containerName}`).catch(() => { });
}
async function deleteServerContainer(serverId) {
    const containerName = `xhris-server-${serverId}`;
    await execAsync(`${DOCKER} stop ${containerName}`).catch(() => { });
    await execAsync(`${DOCKER} rm ${containerName}`).catch(() => { });
}
async function getContainerStats(serverId) {
    try {
        const containerName = `xhris-server-${serverId}`;
        const { stdout } = await execAsync(`${DOCKER} stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
        const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
        return { cpu: cpu || 0, ram: ram || 0 };
    }
    catch {
        return { cpu: 0, ram: 0 };
    }
}
async function getContainerLogs(serverId) {
    try {
        const containerName = `xhris-server-${serverId}`;
        const { stdout } = await execAsync(`${DOCKER} logs ${containerName} --tail 50`);
        return stdout.split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
async function deployFilesToContainer(serverId, envVars) {
    const containerName = `xhris-server-${serverId}`;
    const dir = path_1.default.join('/tmp', 'xhris-uploads', serverId);
    const sourceDir = fs_1.default.existsSync(dir) ? resolveAppDir(dir) : dir;
    if (!fs_1.default.existsSync(dir))
        throw new Error('Aucun fichier à déployer — uploadez des fichiers d\'abord');
    const connectorDest = path_1.default.join(sourceDir, 'xhrishost-connector.js');
    if (!fs_1.default.existsSync(connectorDest)) {
        const connectorSrc = path_1.default.join(__dirname, '../../public/xhrishost-connector.js');
        if (fs_1.default.existsSync(connectorSrc))
            fs_1.default.copyFileSync(connectorSrc, connectorDest);
    }
    if (envVars && Object.keys(envVars).length > 0) {
        const envContent = Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n');
        fs_1.default.writeFileSync(path_1.default.join(sourceDir, '.env'), envContent);
    }
    await execAsync(`${DOCKER} cp ${sourceDir}/. ${containerName}:/app/`);
    const files = fs_1.default.readdirSync(sourceDir);
    const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'index.ts', 'main.ts', 'index.py', 'main.py', 'app.py'];
    const entry = candidates.find(c => files.includes(c)) || files.find(f => /\.(js|ts|py)$/.test(f));
    if (!entry)
        return;
    if (files.includes('package.json')) {
        await execAsync(`${DOCKER} exec ${containerName} sh -c "cd /app && npm install --production --silent 2>&1"`).catch(() => { });
    }
    const runCmd = entry.endsWith('.py') ? `python3 /app/${entry}` : `node /app/${entry}`;
    const startSh = `#!/bin/sh\n[ -f /app/.env ] && export $(grep -v '^#' /app/.env | xargs)\nexec ${runCmd} >> /app/app.log 2>&1\n`;
    const startShPath = path_1.default.join(sourceDir, 'start.sh');
    fs_1.default.writeFileSync(startShPath, startSh);
    await execAsync(`${DOCKER} cp ${startShPath} ${containerName}:/app/start.sh`);
    await execAsync(`${DOCKER} exec ${containerName} chmod +x /app/start.sh`).catch(() => { });
    await execAsync(`${DOCKER} exec ${containerName} sh -c "if [ -f /app/app.pid ]; then kill $(cat /app/app.pid) 2>/dev/null || true; rm -f /app/app.pid; fi; nohup /app/start.sh >/dev/null 2>&1 & echo $! > /app/app.pid"`).catch(() => { });
}
function resolveAppDir(baseDir) {
    const rootFiles = fs_1.default.readdirSync(baseDir);
    const candidates = ['package.json', 'index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'index.ts', 'main.ts', 'index.py', 'main.py', 'app.py'];
    if (rootFiles.some(f => candidates.includes(f)))
        return baseDir;
    const directories = rootFiles
        .map(name => path_1.default.join(baseDir, name))
        .filter(full => fs_1.default.existsSync(full) && fs_1.default.statSync(full).isDirectory());
    return directories.length === 1 ? directories[0] : baseDir;
}
