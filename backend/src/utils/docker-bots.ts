import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const DOCKER = process.env.DOCKER_BIN || '/usr/bin/docker';

export async function deployBotContainer(
  botId: string,
  platform: string,
  envVars: Record<string, string> = {},
): Promise<string> {
  const containerName = `xhris-bot-${botId}`;
  const workDir = `/tmp/xhris-bots/${botId}`;
  const appDir = `${workDir}/app`;

  await execAsync(`${DOCKER} rm -f ${containerName}`).catch(() => {});
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(appDir, { recursive: true });

  const gitUrl = envVars.GITHUB_URL || envVars.GIT_URL;
  if (gitUrl) {
    await execAsync(`git clone --depth 1 "${gitUrl}" "${appDir}"`);
  } else if (envVars.SETUP_FILE_PATH) {
    const raw = envVars.SETUP_FILE_PATH;
    const setupPath = raw.startsWith('/') ? raw : path.join('/tmp/xhris-uploads', raw.replace(/^\/uploads\//, ''));
    if (fs.existsSync(setupPath)) {
      if (setupPath.endsWith('.zip')) {
        await execAsync(`unzip -o "${setupPath}" -d "${appDir}"`);
      } else {
        await execAsync(`cp -r "${setupPath}" "${appDir}/"`);
      }
    } else {
      writeDefaultIndex(appDir, botId, platform);
    }
  } else {
    writeDefaultIndex(appDir, botId, platform);
  }

  // Inject connector if not present
  const connectorDest = `${appDir}/xhrishost-connector.js`;
  if (!fs.existsSync(connectorDest)) {
    const connectorSrc = path.join(__dirname, '../../public/xhrishost-connector.js');
    if (fs.existsSync(connectorSrc)) fs.copyFileSync(connectorSrc, connectorDest);
  }

  const internalKeys = new Set(['SETUP_FILE_PATH', 'GITHUB_URL', 'GIT_URL']);
  const envFlags = Object.entries(envVars)
    .filter(([k]) => !internalKeys.has(k))
    .map(([k, v]) => `-e "${k}=${v.replace(/"/g, '\\"')}"`)
    .join(' ');

  const files = fs.readdirSync(appDir);
  const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
  const entry = candidates.find(e => files.includes(e)) || files.find(f => f.endsWith('.js')) || 'index.js';
  const hasPackageJson = files.includes('package.json');

  const startCmd = hasPackageJson
    ? `cd /app && npm install --production --silent 2>&1 && node ${entry}`
    : `cd /app && node ${entry}`;

  const cmd = [
    'docker run -d',
    `--name ${containerName}`,
    '--memory=256m --cpus=0.25',
    '--restart unless-stopped',
    `-v ${appDir}:/app`,
    envFlags,
    'node:20-alpine',
    `sh -c "${startCmd.replace(/"/g, '\\"')}"`,
  ].join(' ');

  const { stdout } = await execAsync(cmd);
  return stdout.trim();
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
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
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
