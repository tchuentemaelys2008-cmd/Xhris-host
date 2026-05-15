import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { appendBotLog, readBotLogLines, resetBotLogFile } from './bot-log-files';

const execAsync = promisify(exec);
const DOCKER = process.env.DOCKER_BIN || 'docker';

export async function deployBotContainer(
  botId: string,
  platform: string,
  envVars: Record<string, string> = {},
): Promise<string> {
  const containerName = `xhris-bot-${botId}`;
  const workDir = `/tmp/xhris-bots/${botId}`;
  const appDir = `${workDir}/app`;

  resetBotLogFile(botId);
  appendBotLog(botId, `Preparing Docker deployment for ${platform}`);
  await execAsync(`${DOCKER} rm -f ${containerName}`).catch(() => {});
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(appDir, { recursive: true });

  const gitUrl = envVars.GITHUB_URL || envVars.GIT_URL;
  if (gitUrl) {
    appendBotLog(botId, 'Cloning bot source repository');
    await execAsync(`git clone --depth 1 "${gitUrl}" "${appDir}"`);
  } else if (envVars.SETUP_FILE_PATH) {
    const raw = envVars.SETUP_FILE_PATH;
    const setupPath = raw.startsWith('/') ? raw : path.join('/tmp/xhris-uploads', raw.replace(/^\/uploads\//, ''));
    if (fs.existsSync(setupPath)) {
      if (setupPath.endsWith('.zip')) {
        appendBotLog(botId, 'Extracting uploaded bot archive');
        await execAsync(`unzip -o "${setupPath}" -d "${appDir}"`);
      } else {
        appendBotLog(botId, 'Copying uploaded bot files');
        await execAsync(`cp -r "${setupPath}" "${appDir}/"`);
      }
    } else {
      appendBotLog(botId, 'Setup file not found; creating placeholder bot');
      writeDefaultIndex(appDir, botId, platform);
    }
  } else {
    appendBotLog(botId, 'No source provided; creating placeholder bot');
    writeDefaultIndex(appDir, botId, platform);
  }

  const sourceDir = resolveAppDir(appDir);

  // Inject connector if not present
  const connectorDest = `${sourceDir}/xhrishost-connector.js`;
  if (!fs.existsSync(connectorDest)) {
    const connectorSrc = path.join(__dirname, '../../public/xhrishost-connector.js');
    if (fs.existsSync(connectorSrc)) {
      fs.copyFileSync(connectorSrc, connectorDest);
      appendBotLog(botId, 'XHRIS connector injected');
    }
  }

  const internalKeys = new Set(['SETUP_FILE_PATH', 'GITHUB_URL', 'GIT_URL']);
  const envFlags = Object.entries(envVars)
    .filter(([k]) => !internalKeys.has(k))
    .map(([k, v]) => `-e "${k}=${v.replace(/"/g, '\\"')}"`)
    .join(' ');

  const files = fs.readdirSync(sourceDir);
  const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
  const entry = candidates.find(e => files.includes(e)) || files.find(f => f.endsWith('.js')) || 'index.js';
  const hasPackageJson = files.includes('package.json');

  const startSh = [
    '#!/bin/sh',
    'set -e',
    hasPackageJson ? 'npm install --production --silent 2>&1' : '',
    `exec node ${entry}`,
    '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(path.join(sourceDir, 'start.sh'), startSh);

  appendBotLog(botId, `Creating Docker container with entrypoint ${entry}`);
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
  appendBotLog(botId, `Container created: ${containerId.substring(0, 12)}`);
  await execAsync(`${DOCKER} cp "${sourceDir}" ${containerName}:/app`);
  appendBotLog(botId, 'Bot files copied into container');
  await execAsync(`${DOCKER} start ${containerName}`);
  appendBotLog(botId, 'Container started; waiting for bot readiness logs');
  return containerId;
}

function resolveAppDir(appDir: string): string {
  const rootFiles = fs.readdirSync(appDir);
  const candidates = ['package.json', 'index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
  if (rootFiles.some(f => candidates.includes(f))) return appDir;

  const directories = rootFiles
    .map(name => path.join(appDir, name))
    .filter(full => fs.existsSync(full) && fs.statSync(full).isDirectory());

  return directories.length === 1 ? directories[0] : appDir;
}

function writeDefaultIndex(appDir: string, botId: string, platform: string) {
  fs.writeFileSync(
    `${appDir}/index.js`,
    `// XHRIS HOST Bot — ${platform} | ${botId}\n` +
    `// Uploadez vos fichiers ou fournissez un lien GitHub\n` +
    `console.log('[XHRIS] Container prêt — en attente du code source');\n` +
    `setInterval(() => {}, 30000);\n`,
  );
}

export async function stopBotContainer(botId: string): Promise<void> {
  await execAsync(`${DOCKER} stop xhris-bot-${botId}`).catch(() => {});
}

export async function startBotContainer(botId: string): Promise<void> {
  await execAsync(`${DOCKER} start xhris-bot-${botId}`).catch(() => {});
  appendBotLog(botId, 'Container start requested');
}

export async function deleteBotContainer(botId: string): Promise<void> {
  const name = `xhris-bot-${botId}`;
  await execAsync(`${DOCKER} stop ${name}`).catch(() => {});
  await execAsync(`${DOCKER} rm ${name}`).catch(() => {});
  fs.rmSync(`/tmp/xhris-bots/${botId}`, { recursive: true, force: true });
}

export async function getBotContainerLogs(botId: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`${DOCKER} logs xhris-bot-${botId} --tail 100 2>&1`);
    const dockerLogs = stdout.split('\n').filter(Boolean);
    return dockerLogs.length > 0 ? dockerLogs : readBotLogLines(botId, 100);
  } catch {
    return readBotLogLines(botId, 100);
  }
}

export function followBotContainerLogs(
  botId: string,
  onLine: (line: string, stream: 'stdout' | 'stderr') => void,
  onExit?: (code: number | null) => void,
): () => void {
  const child = spawn(DOCKER, ['logs', '-f', `xhris-bot-${botId}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let closed = false;
  const consume = (stream: 'stdout' | 'stderr') => {
    let buffer = '';
    child[stream].on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        appendBotLog(botId, stream === 'stderr' ? `[stderr] ${line}` : line);
        onLine(line, stream);
      }
    });
  };

  consume('stdout');
  consume('stderr');

  child.on('error', (err) => {
    appendBotLog(botId, `Docker log stream failed: ${err.message}`);
  });

  child.on('close', (code) => {
    closed = true;
    appendBotLog(botId, `Docker log stream closed with code ${code ?? 'unknown'}`);
    onExit?.(code);
  });

  return () => {
    if (!closed) child.kill();
  };
}

export async function getBotContainerStats(botId: string): Promise<{ cpu: number; ram: number }> {
  try {
    const { stdout } = await execAsync(
      `${DOCKER} stats xhris-bot-${botId} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`,
    );
    const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
    return { cpu: cpu || 0, ram: ram || 0 };
  } catch {
    return { cpu: 0, ram: 0 };
  }
}
