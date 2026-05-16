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
    appendBotLog(botId, `Cloning bot source repository: ${gitUrl}`);
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
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `-e "${k}=${String(v).replace(/"/g, '\\"')}"`)
    .join(' ');

  const envKeys = Object.keys(envVars)
    .filter(k => !['XHRIS_API_KEY', 'SESSION_ID', 'SESSION', 'SESSIONID', 'SESSION_STRING'].includes(k))
    .sort();
  appendBotLog(botId, `Runtime env keys injected: ${envKeys.join(', ') || 'none'}`);

  // Determine start command — package.json takes priority
  let startCommand: string;
  const pkgPath = path.join(sourceDir, 'package.json');
  const hasPackageJson = fs.existsSync(pkgPath);
  let packageJson: any = null;
  if (hasPackageJson) {
    packageJson = readPackageJson(pkgPath);
  }

  if (packageJson?.scripts?.start) {
    // Use npm start — RESPECTS the bot's own entry point (src/index.js, etc.)
    startCommand = 'npm start';
    appendBotLog(botId, `Using package.json start script: ${packageJson.scripts.start}`);
  } else {
    // Fallback: search candidates at root, EXCLUDING our own connector
    const files = fs.readdirSync(sourceDir);
    const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
    let entry = candidates.find(e => files.includes(e));
    if (!entry) {
      // Look in src/ too
      const srcDir = path.join(sourceDir, 'src');
      if (fs.existsSync(srcDir)) {
        const srcFiles = fs.readdirSync(srcDir);
        const srcEntry = candidates.find(e => srcFiles.includes(e));
        if (srcEntry) entry = `src/${srcEntry}`;
      }
    }
    if (!entry) {
      // Last resort — first .js file, EXCLUDING xhrishost-connector.js
      entry = files.find(f => f.endsWith('.js') && f !== 'xhrishost-connector.js') || 'index.js';
    }
    startCommand = `node ${entry}`;
    appendBotLog(botId, `Using detected entry point: ${entry}`);
  }

  if (packageJson) {
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const needsNodeAddonApi = !!(deps.sharp || deps['@whiskeysockets/baileys']);
    if (needsNodeAddonApi && !deps['node-addon-api']) {
      packageJson.dependencies = packageJson.dependencies || {};
      packageJson.dependencies['node-addon-api'] = '^7.1.0';
      fs.writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2));
      appendBotLog(botId, 'Injected node-addon-api dependency for sharp');
    }
  }

  const startSh = [
    '#!/bin/sh',
    'set -e',
    'echo "[XHRIS] Preparing environment..."',
    '',
    '# Install system build tools (one-time per container)',
    'if [ ! -f /tmp/.xhris-tools-installed ]; then',
    '  echo "[XHRIS] Installing system build tools (first run)..."',
    '  apk add --no-cache python3 make g++ vips-dev git curl >/dev/null 2>&1 || echo "[XHRIS] apk add skipped"',
    '  touch /tmp/.xhris-tools-installed',
    'fi',
    '',
    '# Force sharp to use prebuilt binaries (no compilation)',
    'export SHARP_IGNORE_GLOBAL_LIBVIPS=1',
    'export npm_config_build_from_source=false',
    '',
    'if [ -f package.json ] && [ ! -d node_modules ]; then',
    '  echo "[XHRIS] Installing dependencies (this may take 2-3 min)..."',
    '  npm install --omit=dev --no-audit --no-fund --prefer-offline 2>&1 || {',
    '    echo "[XHRIS] First install failed, retrying without optional deps..."',
    '    npm install --omit=dev --omit=optional --no-audit --no-fund 2>&1',
    '  }',
    '  echo "[XHRIS] Dependencies installed successfully."',
    'elif [ -d node_modules ]; then',
    '  echo "[XHRIS] node_modules already present, skipping install."',
    'fi',
    '',
    'echo "[XHRIS] Starting bot..."',
    `exec ${startCommand}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(sourceDir, 'start.sh'), startSh);

  appendBotLog(botId, `Creating Docker container with command ${startCommand}`);
  const createCmd = [
    `${DOCKER} create`,
    `--name ${containerName}`,
    '--memory=768m --memory-swap=1g --cpus=1.0',
    '--restart on-failure:3',
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

function readPackageJson(packagePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch {
    return null;
  }
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
  let killed = false;
  let currentChild: any = null;

  const startStream = () => {
    if (killed) return;
    const child = spawn(DOCKER, ['logs', '-f', '--tail', 'all', `xhris-bot-${botId}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    currentChild = child;

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
      appendBotLog(botId, `Docker log stream error: ${err.message}`);
    });

    child.on('close', async (code) => {
      if (killed) { onExit?.(code); return; }
      try {
        const { execSync } = require('child_process');
        const state = execSync(
          `${DOCKER} inspect --format='{{.State.Status}}' xhris-bot-${botId}`,
          { encoding: 'utf8' },
        ).trim().replace(/'/g, '');
        if (state === 'running' || state === 'restarting') {
          appendBotLog(botId, `Log stream reconnecting (container ${state})...`);
          setTimeout(startStream, 1500);
          return;
        }
        appendBotLog(botId, `Container ${state} (exit ${code ?? 'unknown'})`);
        onExit?.(code);
      } catch {
        onExit?.(code);
      }
    });
  };

  startStream();

  return () => {
    killed = true;
    if (currentChild && !currentChild.killed) currentChild.kill();
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
