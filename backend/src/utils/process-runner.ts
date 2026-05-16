import { spawn, ChildProcess, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { appendBotLog, resetBotLogFile } from './bot-log-files';

const BOTS_DIR = process.env.BOTS_DIR || '/tmp/xhris-bots';
const running = new Map<string, ChildProcess>();

export function isRunning(botId: string): boolean {
  const proc = running.get(botId);
  return !!proc && !proc.killed && proc.exitCode === null;
}

export async function deployBotNative(
  botId: string,
  platform: string,
  envVars: Record<string, string>,
  onReady?: () => void,
  onExit?: (code: number | null) => void,
): Promise<string> {
  const workDir = path.join(BOTS_DIR, botId);
  const appDir = path.join(workDir, 'app');

  resetBotLogFile(botId);
  appendBotLog(botId, `Preparing native deployment for ${platform}`);

  await stopBotNative(botId);

  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(appDir, { recursive: true });

  const gitUrl = envVars.GITHUB_URL || envVars.GIT_URL;
  if (gitUrl) {
    appendBotLog(botId, `Cloning ${gitUrl}`);
    try {
      execSync(`git clone --depth 1 "${gitUrl}" "${appDir}"`, { stdio: 'pipe' });
    } catch (e: any) {
      appendBotLog(botId, `Git clone failed: ${e.message}`);
      throw new Error(`Impossible de cloner le depot: ${e.message}`);
    }
  } else if (envVars.SETUP_FILE_PATH) {
    const raw = envVars.SETUP_FILE_PATH;
    const setupPath = raw.startsWith('/') ? raw : path.join('/tmp/xhris-uploads', raw.replace(/^\/uploads\//, ''));
    if (!fs.existsSync(setupPath)) throw new Error('Fichier setup introuvable');
    if (setupPath.endsWith('.zip')) {
      appendBotLog(botId, 'Extracting archive');
      execSync(`unzip -o "${setupPath}" -d "${appDir}"`, { stdio: 'pipe' });
    } else {
      execSync(`cp -r "${setupPath}" "${appDir}/"`, { stdio: 'pipe' });
    }
  } else {
    throw new Error('Aucun code source fourni (ni GITHUB_URL ni fichier de setup)');
  }

  const sourceDir = resolveSourceDir(appDir);
  injectConnector(botId, sourceDir);

  if (fs.existsSync(path.join(sourceDir, 'package.json'))) {
    appendBotLog(botId, 'Installing dependencies (npm install)...');
    await new Promise<void>((resolve, reject) => {
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const installer = spawn(npmCmd, ['install', '--omit=dev', '--no-audit', '--no-fund'], {
        cwd: sourceDir,
        env: { ...process.env, NODE_ENV: 'production' },
      });
      installer.stdout.on('data', (b) => appendBotLog(botId, `[npm] ${b.toString().trim()}`));
      installer.stderr.on('data', (b) => appendBotLog(botId, `[npm:err] ${b.toString().trim()}`));
      installer.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed (code ${code})`)));
      installer.on('error', reject);
    });
    appendBotLog(botId, 'Dependencies installed');
  }

  const { cmd, args } = resolveStartCommand(sourceDir);
  const cleanEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(envVars)) {
    if (v !== undefined && v !== null) cleanEnv[k] = String(v);
  }

  appendBotLog(botId, `Starting bot: ${cmd} ${args.join(' ')}`);

  const child = spawn(cmd, args, {
    cwd: sourceDir,
    env: { ...process.env, ...cleanEnv, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  running.set(botId, child);

  const readyPattern = /(\[WA-CONNECT\]\s*open|whatsapp\s+(connected|connect|open)|bot\s+(connected|connecte|connecté|en ligne|ready)|client\s+(connected|connecte|connecté|ready)|connection\s+open|login successful|connexion\s+whatsapp\s+r[eé]ussie|✅.*connect)/i;
  let readyFired = false;

  const lineHandler = (chunk: Buffer, isErr: boolean) => {
    const text = chunk.toString('utf8');
    text.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      appendBotLog(botId, isErr ? `[stderr] ${line}` : line);
      if (!readyFired && readyPattern.test(line)) {
        readyFired = true;
        onReady?.();
      }
    });
  };

  child.stdout?.on('data', (b) => lineHandler(b, false));
  child.stderr?.on('data', (b) => lineHandler(b, true));

  child.on('error', (err) => {
    appendBotLog(botId, `Process error: ${err.message}`);
  });

  child.on('exit', (code) => {
    running.delete(botId);
    appendBotLog(botId, `Process exited with code ${code}`);
    onExit?.(code);
  });

  await new Promise(r => setTimeout(r, 200));
  if (child.exitCode !== null && child.exitCode !== 0) {
    throw new Error(`Bot a plante immediatement (code ${child.exitCode})`);
  }

  return String(child.pid || '');
}

export async function stopBotNative(botId: string): Promise<void> {
  const proc = running.get(botId);
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1500));
    if (!proc.killed) proc.kill('SIGKILL');
  }
  running.delete(botId);
  appendBotLog(botId, 'Bot stopped');
}

export async function startBotNative(
  botId: string,
  platform: string,
  envVars: Record<string, string>,
  onReady?: () => void,
  onExit?: (code: number | null) => void,
): Promise<string> {
  return deployBotNative(botId, platform, envVars, onReady, onExit);
}

export async function deleteBotNative(botId: string): Promise<void> {
  await stopBotNative(botId);
  const workDir = path.join(BOTS_DIR, botId);
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
}

export async function getBotNativeStats(botId: string): Promise<{ cpu: number; ram: number }> {
  const proc = running.get(botId);
  if (!proc || !proc.pid) return { cpu: 0, ram: 0 };
  try {
    const ramMB = process.memoryUsage().rss / (1024 * 1024);
    return { cpu: 0, ram: Math.round(ramMB * 10) / 10 };
  } catch {
    return { cpu: 0, ram: 0 };
  }
}

function resolveSourceDir(appDir: string): string {
  const rootEntries = fs.readdirSync(appDir);
  const knownFiles = ['package.json', 'index.js', 'main.js', 'app.js', 'server.js'];
  if (rootEntries.some(f => knownFiles.includes(f))) return appDir;

  const dirs = rootEntries
    .map(name => path.join(appDir, name))
    .filter(p => fs.existsSync(p) && fs.statSync(p).isDirectory());
  return dirs.length === 1 ? dirs[0] : appDir;
}

function injectConnector(botId: string, sourceDir: string) {
  const connectorDest = path.join(sourceDir, 'xhrishost-connector.js');
  if (fs.existsSync(connectorDest)) return;

  const candidates = [
    path.join(__dirname, '../../public/xhrishost-connector.js'),
    path.join(process.cwd(), 'public/xhrishost-connector.js'),
  ];
  for (const src of candidates) {
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, connectorDest);
    appendBotLog(botId, 'Connector injected');
    break;
  }
}

function resolveStartCommand(sourceDir: string): { cmd: string; args: string[] } {
  let pkg: any = null;
  const pkgPath = path.join(sourceDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch {}
  }
  if (pkg?.scripts?.start) {
    return { cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['start'] };
  }

  const filesAfter = fs.readdirSync(sourceDir);
  const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'start.js'];
  const entry = candidates.find(e => filesAfter.includes(e));
  if (entry) return { cmd: 'node', args: [entry] };
  throw new Error('Aucun script de demarrage trouve (ni "npm start" ni index.js/main.js/...)');
}

