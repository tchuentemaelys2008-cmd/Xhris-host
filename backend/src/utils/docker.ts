import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const DOCKER = process.env.DOCKER_BIN || 'docker';

export async function createServerContainer(serverId: string, plan: string): Promise<{ containerId: string; port: number }> {
  const port = 10000 + Math.floor(Math.random() * 10000);
  const containerName = `xhris-server-${serverId}`;

  const memoryMap: Record<string, string> = {
    STARTER: '512m', PRO: '1g', ADVANCED: '2g', ELITE: '4g'
  };
  const cpuMap: Record<string, string> = {
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

export async function stopServerContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  await execAsync(`${DOCKER} stop ${containerName}`).catch(() => {});
}

export async function startServerContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  await execAsync(`${DOCKER} start ${containerName}`).catch(() => {});
}

export async function deleteServerContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  await execAsync(`${DOCKER} stop ${containerName}`).catch(() => {});
  await execAsync(`${DOCKER} rm ${containerName}`).catch(() => {});
}

export async function getContainerStats(serverId: string): Promise<{ cpu: number; ram: number }> {
  try {
    const containerName = `xhris-server-${serverId}`;
    const { stdout } = await execAsync(`${DOCKER} stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
    const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
    return { cpu: cpu || 0, ram: ram || 0 };
  } catch {
    return { cpu: 0, ram: 0 };
  }
}

export async function getContainerLogs(serverId: string): Promise<string[]> {
  try {
    const containerName = `xhris-server-${serverId}`;
    const { stdout } = await execAsync(`${DOCKER} logs ${containerName} --tail 50`);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function deployFilesToContainer(
  serverId: string,
  envVars?: Record<string, string>,
): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  const dir = path.join('/tmp', 'xhris-uploads', serverId);
  const sourceDir = fs.existsSync(dir) ? resolveAppDir(dir) : dir;

  if (!fs.existsSync(dir)) throw new Error('Aucun fichier à déployer — uploadez des fichiers d\'abord');

  // Inject connector if not present
  const connectorDest = path.join(sourceDir, 'xhrishost-connector.js');
  if (!fs.existsSync(connectorDest)) {
    const connectorSrc = path.join(__dirname, '../../public/xhrishost-connector.js');
    if (fs.existsSync(connectorSrc)) fs.copyFileSync(connectorSrc, connectorDest);
  }

  // Inject .env file if env vars provided
  if (envVars && Object.keys(envVars).length > 0) {
    const envContent = Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(path.join(sourceDir, '.env'), envContent);
  }

  await execAsync(`${DOCKER} cp ${sourceDir}/. ${containerName}:/app/`);

  const files = fs.readdirSync(sourceDir);
  const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'index.ts', 'main.ts', 'index.py', 'main.py', 'app.py'];
  const entry = candidates.find(c => files.includes(c)) || files.find(f => /\.(js|ts|py)$/.test(f));

  if (!entry) return;

  // npm install if package.json exists
  if (files.includes('package.json')) {
    await execAsync(
      `${DOCKER} exec ${containerName} sh -c "cd /app && npm install --production --silent 2>&1"`,
    ).catch(() => {});
  }

  // Write start.sh that sources .env so env vars persist across container restarts
  const runCmd = entry.endsWith('.py') ? `python3 /app/${entry}` : `node /app/${entry}`;
  const startSh = `#!/bin/sh\n[ -f /app/.env ] && export $(grep -v '^#' /app/.env | xargs)\nexec ${runCmd} >> /app/app.log 2>&1\n`;
  const startShPath = path.join(sourceDir, 'start.sh');
  fs.writeFileSync(startShPath, startSh);
  await execAsync(`${DOCKER} cp ${startShPath} ${containerName}:/app/start.sh`);
  await execAsync(`${DOCKER} exec ${containerName} chmod +x /app/start.sh`).catch(() => {});

  await execAsync(
    `${DOCKER} exec ${containerName} sh -c "if [ -f /app/app.pid ]; then kill $(cat /app/app.pid) 2>/dev/null || true; rm -f /app/app.pid; fi; nohup /app/start.sh >/dev/null 2>&1 & echo $! > /app/app.pid"`,
  ).catch(() => {});
}

function resolveAppDir(baseDir: string): string {
  const rootFiles = fs.readdirSync(baseDir);
  const candidates = ['package.json', 'index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'index.ts', 'main.ts', 'index.py', 'main.py', 'app.py'];
  if (rootFiles.some(f => candidates.includes(f))) return baseDir;

  const directories = rootFiles
    .map(name => path.join(baseDir, name))
    .filter(full => fs.existsSync(full) && fs.statSync(full).isDirectory());

  return directories.length === 1 ? directories[0] : baseDir;
}
