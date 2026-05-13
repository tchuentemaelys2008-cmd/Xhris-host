"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerContainer = createServerContainer;
exports.stopServerContainer = stopServerContainer;
exports.startServerContainer = startServerContainer;
exports.deleteServerContainer = deleteServerContainer;
exports.getContainerStats = getContainerStats;
exports.getContainerLogs = getContainerLogs;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
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
    const cmd = `docker run -d --name ${containerName} \
    --memory=${memory} --cpus=${cpu} \
    -p ${port}:3000 \
    --restart unless-stopped \
    node:20-alpine sh -c "mkdir -p /app && echo 'const http=require(\"http\");http.createServer((req,res)=>{res.end(\"Server running!\")}).listen(3000)' > /app/index.js && node /app/index.js"`;
    const { stdout } = await execAsync(cmd);
    return { containerId: stdout.trim(), port };
}
async function stopServerContainer(serverId) {
    const containerName = `xhris-server-${serverId}`;
    await execAsync(`docker stop ${containerName}`).catch(() => { });
}
async function startServerContainer(serverId) {
    const containerName = `xhris-server-${serverId}`;
    await execAsync(`docker start ${containerName}`).catch(() => { });
}
async function deleteServerContainer(serverId) {
    const containerName = `xhris-server-${serverId}`;
    await execAsync(`docker stop ${containerName}`).catch(() => { });
    await execAsync(`docker rm ${containerName}`).catch(() => { });
}
async function getContainerStats(serverId) {
    try {
        const containerName = `xhris-server-${serverId}`;
        const { stdout } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
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
        const { stdout } = await execAsync(`docker logs ${containerName} --tail 50`);
        return stdout.split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
