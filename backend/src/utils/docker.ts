import { exec } from 'child_process';
import { promisify } from 'util';

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
