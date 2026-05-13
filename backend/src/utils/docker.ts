import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

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

  const cmd = `docker run -d --name ${containerName} \
    --memory=${memory} --cpus=${cpu} \
    -p ${port}:3000 \
    --restart unless-stopped \
    node:20-alpine sh -c "mkdir -p /app && echo 'const http=require(\"http\");http.createServer((req,res)=>{res.end(\"Server running!\")}).listen(3000)' > /app/index.js && node /app/index.js"`;

  const { stdout } = await execAsync(cmd);
  return { containerId: stdout.trim(), port };
}

export async function stopServerContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  await execAsync(`docker stop ${containerName}`).catch(() => {});
}

export async function startServerContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  await execAsync(`docker start ${containerName}`).catch(() => {});
}

export async function deleteServerContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  await execAsync(`docker stop ${containerName}`).catch(() => {});
  await execAsync(`docker rm ${containerName}`).catch(() => {});
}

export async function getContainerStats(serverId: string): Promise<{ cpu: number; ram: number }> {
  try {
    const containerName = `xhris-server-${serverId}`;
    const { stdout } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
    const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
    return { cpu: cpu || 0, ram: ram || 0 };
  } catch {
    return { cpu: 0, ram: 0 };
  }
}

export async function getContainerLogs(serverId: string): Promise<string[]> {
  try {
    const containerName = `xhris-server-${serverId}`;
    const { stdout } = await execAsync(`docker logs ${containerName} --tail 50`);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function deployFilesToContainer(serverId: string): Promise<void> {
  const containerName = `xhris-server-${serverId}`;
  const dir = path.join('/tmp', 'xhris-uploads', serverId);

  if (!fs.existsSync(dir)) throw new Error('Aucun fichier à déployer — uploadez des fichiers d\'abord');

  await execAsync(`docker cp ${dir}/. ${containerName}:/app/`);

  const files = fs.readdirSync(dir);
  const candidates = ['index.js', 'main.js', 'app.js', 'server.js', 'bot.js', 'index.ts', 'main.ts', 'index.py', 'main.py', 'app.py'];
  const entry = candidates.find(c => files.includes(c)) || files.find(f => /\.(js|ts|py)$/.test(f));

  if (!entry) return;

  const runCmd = entry.endsWith('.py') ? `python3 /app/${entry}` : `node /app/${entry}`;
  await execAsync(
    `docker exec ${containerName} sh -c "pkill -f 'node /app' 2>/dev/null; pkill -f 'python3 /app' 2>/dev/null; sleep 1; nohup ${runCmd} > /app/app.log 2>&1 &"`,
  ).catch(() => {});
}
