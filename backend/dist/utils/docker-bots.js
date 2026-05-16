"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployBotContainer = deployBotContainer;
exports.stopBotContainer = stopBotContainer;
exports.startBotContainer = startBotContainer;
exports.deleteBotContainer = deleteBotContainer;
exports.getBotContainerLogs = getBotContainerLogs;
exports.followBotContainerLogs = followBotContainerLogs;
exports.getBotContainerStats = getBotContainerStats;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bot_log_files_1 = require("./bot-log-files");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const DOCKER = process.env.DOCKER_BIN || 'docker';
async function deployBotContainer(botId, platform, envVars = {}) {
    const containerName = `xhris-bot-${botId}`;
    const workDir = `/tmp/xhris-bots/${botId}`;
    const appDir = `${workDir}/app`;
    (0, bot_log_files_1.resetBotLogFile)(botId);
    (0, bot_log_files_1.appendBotLog)(botId, `Preparing Docker deployment for ${platform}`);
    await execAsync(`${DOCKER} rm -f ${containerName}`).catch(() => { });
    fs_1.default.rmSync(workDir, { recursive: true, force: true });
    fs_1.default.mkdirSync(appDir, { recursive: true });
    const gitUrl = envVars.GITHUB_URL || envVars.GIT_URL;
    if (gitUrl) {
        (0, bot_log_files_1.appendBotLog)(botId, `Cloning bot source repository: ${gitUrl}`);
        await execAsync(`git clone --depth 1 "${gitUrl}" "${appDir}"`);
    }
    else if (envVars.SETUP_FILE_PATH) {
        const raw = envVars.SETUP_FILE_PATH;
        const setupPath = raw.startsWith('/') ? raw : path_1.default.join('/tmp/xhris-uploads', raw.replace(/^\/uploads\//, ''));
        if (fs_1.default.existsSync(setupPath)) {
            if (setupPath.endsWith('.zip')) {
                (0, bot_log_files_1.appendBotLog)(botId, 'Extracting uploaded bot archive');
                await execAsync(`unzip -o "${setupPath}" -d "${appDir}"`);
            }
            else {
                (0, bot_log_files_1.appendBotLog)(botId, 'Copying uploaded bot files');
                await execAsync(`cp -r "${setupPath}" "${appDir}/"`);
            }
        }
        else {
            (0, bot_log_files_1.appendBotLog)(botId, 'Setup file not found; creating placeholder bot');
            writeDefaultIndex(appDir, botId, platform);
        }
    }
    else {
        (0, bot_log_files_1.appendBotLog)(botId, 'No source provided; creating placeholder bot');
        writeDefaultIndex(appDir, botId, platform);
    }
    const sourceDir = resolveAppDir(appDir);
    const connectorDest = `${sourceDir}/xhrishost-connector.js`;
    if (!fs_1.default.existsSync(connectorDest)) {
        const connectorSrc = path_1.default.join(__dirname, '../../public/xhrishost-connector.js');
        if (fs_1.default.existsSync(connectorSrc)) {
            fs_1.default.copyFileSync(connectorSrc, connectorDest);
            (0, bot_log_files_1.appendBotLog)(botId, 'XHRIS connector injected');
        }
    }
    const internalKeys = new Set(['SETUP_FILE_PATH', 'GITHUB_URL', 'GIT_URL']);
    const envFlags = Object.entries(envVars)
        .filter(([k]) => !internalKeys.has(k))
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `-e "${k}=${String(v).replace(/"/g, '\\"')}"`)
        .join(' ');
    const files = fs_1.default.readdirSync(sourceDir);
    const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
    const entry = candidates.find(e => files.includes(e)) || files.find(f => f.endsWith('.js')) || 'index.js';
    const hasPackageJson = files.includes('package.json');
    const packageJson = hasPackageJson ? readPackageJson(path_1.default.join(sourceDir, 'package.json')) : null;
    const hasStartScript = Boolean(packageJson?.scripts?.start);
    const envKeys = Object.keys(envVars)
        .filter(k => !['XHRIS_API_KEY', 'SESSION_ID', 'SESSION', 'SESSIONID', 'SESSION_STRING'].includes(k))
        .sort();
    (0, bot_log_files_1.appendBotLog)(botId, `Runtime env keys injected: ${envKeys.join(', ') || 'none'}`);
    const startSh = [
        '#!/bin/sh',
        'set -e',
        hasPackageJson ? 'npm install --omit=dev 2>&1' : '',
        hasStartScript ? 'exec npm start 2>&1' : `exec node ${entry} 2>&1`,
        '',
    ].filter(Boolean).join('\n');
    fs_1.default.writeFileSync(path_1.default.join(sourceDir, 'start.sh'), startSh);
    (0, bot_log_files_1.appendBotLog)(botId, `Creating Docker container with entrypoint ${entry}`);
    const createCmd = [
        `${DOCKER} create`,
        `--name ${containerName}`,
        '--memory=256m --cpus=0.25',
        '--restart unless-stopped',
        envFlags,
        'node:20-alpine',
        'sh',
        '-c',
        `"cd /app && chmod +x /app/start.sh && /app/start.sh"`,
    ].join(' ');
    const { stdout } = await execAsync(createCmd);
    const containerId = stdout.trim();
    (0, bot_log_files_1.appendBotLog)(botId, `Container created: ${containerId.substring(0, 12)}`);
    await execAsync(`${DOCKER} cp "${sourceDir}" ${containerName}:/app`);
    (0, bot_log_files_1.appendBotLog)(botId, 'Bot files copied into container');
    await execAsync(`${DOCKER} start ${containerName}`);
    (0, bot_log_files_1.appendBotLog)(botId, 'Container started; waiting for bot readiness logs');
    return containerId;
}
function resolveAppDir(appDir) {
    const rootFiles = fs_1.default.readdirSync(appDir);
    const candidates = ['package.json', 'index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
    if (rootFiles.some(f => candidates.includes(f)))
        return appDir;
    const directories = rootFiles
        .map(name => path_1.default.join(appDir, name))
        .filter(full => fs_1.default.existsSync(full) && fs_1.default.statSync(full).isDirectory());
    return directories.length === 1 ? directories[0] : appDir;
}
function readPackageJson(packagePath) {
    try {
        return JSON.parse(fs_1.default.readFileSync(packagePath, 'utf8'));
    }
    catch {
        return null;
    }
}
function writeDefaultIndex(appDir, botId, platform) {
    fs_1.default.writeFileSync(`${appDir}/index.js`, `// XHRIS HOST Bot — ${platform} | ${botId}\n` +
        `// Uploadez vos fichiers ou fournissez un lien GitHub\n` +
        `console.log('[XHRIS] Container prêt — en attente du code source');\n` +
        `setInterval(() => {}, 30000);\n`);
}
async function stopBotContainer(botId) {
    await execAsync(`${DOCKER} stop xhris-bot-${botId}`).catch(() => { });
}
async function startBotContainer(botId) {
    await execAsync(`${DOCKER} start xhris-bot-${botId}`).catch(() => { });
    (0, bot_log_files_1.appendBotLog)(botId, 'Container start requested');
}
async function deleteBotContainer(botId) {
    const name = `xhris-bot-${botId}`;
    await execAsync(`${DOCKER} stop ${name}`).catch(() => { });
    await execAsync(`${DOCKER} rm ${name}`).catch(() => { });
    fs_1.default.rmSync(`/tmp/xhris-bots/${botId}`, { recursive: true, force: true });
}
async function getBotContainerLogs(botId) {
    try {
        const { stdout } = await execAsync(`${DOCKER} logs xhris-bot-${botId} --tail 100 2>&1`);
        const dockerLogs = stdout.split('\n').filter(Boolean);
        return dockerLogs.length > 0 ? dockerLogs : (0, bot_log_files_1.readBotLogLines)(botId, 100);
    }
    catch {
        return (0, bot_log_files_1.readBotLogLines)(botId, 100);
    }
}
function followBotContainerLogs(botId, onLine, onExit) {
    const child = (0, child_process_1.spawn)(DOCKER, ['logs', '-f', `xhris-bot-${botId}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let closed = false;
    const consume = (stream) => {
        let buffer = '';
        child[stream].on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.trim())
                    continue;
                (0, bot_log_files_1.appendBotLog)(botId, stream === 'stderr' ? `[stderr] ${line}` : line);
                onLine(line, stream);
            }
        });
    };
    consume('stdout');
    consume('stderr');
    child.on('error', (err) => {
        (0, bot_log_files_1.appendBotLog)(botId, `Docker log stream failed: ${err.message}`);
    });
    child.on('close', (code) => {
        closed = true;
        (0, bot_log_files_1.appendBotLog)(botId, `Docker log stream closed with code ${code ?? 'unknown'}`);
        onExit?.(code);
    });
    return () => {
        if (!closed)
            child.kill();
    };
}
async function getBotContainerStats(botId) {
    try {
        const { stdout } = await execAsync(`${DOCKER} stats xhris-bot-${botId} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
        const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
        return { cpu: cpu || 0, ram: ram || 0 };
    }
    catch {
        return { cpu: 0, ram: 0 };
    }
}
