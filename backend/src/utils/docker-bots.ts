import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function deployBotContainer(botId: string, platform: string, envVars: Record<string, string> = {}): Promise<string> {
  const containerName = `xhris-bot-${botId}`;

  // Build env vars string
  const envString = Object.entries(envVars)
    .map(([k, v]) => `-e ${k}="${v}"`)
    .join(' ');

  // Image selon la plateforme
  const imageMap: Record<string, string> = {
    WHATSAPP: 'node:20-alpine',
    DISCORD: 'node:20-alpine',
    TELEGRAM: 'node:20-alpine',
  };
  const image = imageMap[platform] || 'node:20-alpine';

  const cmd = `docker run -d --name ${containerName} \
    --memory=256m --cpus=0.25 \
    --restart unless-stopped \
    ${envString} \
    ${image} sh -c "echo 'Bot ${botId} running on ${platform}' && while true; do sleep 30; done"`;

  const { stdout } = await execAsync(cmd);
  return stdout.trim();
}

export async function stopBotContainer(botId: string): Promise<void> {
  const containerName = `xhris-bot-${botId}`;
  await execAsync(`docker stop ${containerName}`).catch(() => {});
}

export async function startBotContainer(botId: string): Promise<void> {
  const containerName = `xhris-bot-${botId}`;
  await execAsync(`docker start ${containerName}`).catch(() => {});
}

export async function deleteBotContainer(botId: string): Promise<void> {
  const containerName = `xhris-bot-${botId}`;
  await execAsync(`docker stop ${containerName}`).catch(() => {});
  await execAsync(`docker rm ${containerName}`).catch(() => {});
}

export async function getBotContainerLogs(botId: string): Promise<string[]> {
  try {
    const containerName = `xhris-bot-${botId}`;
    const { stdout } = await execAsync(`docker logs ${containerName} --tail 50`);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function getBotContainerStats(botId: string): Promise<{ cpu: number; ram: number }> {
  try {
    const containerName = `xhris-bot-${botId}`;
    const { stdout } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}}"`);
    const [cpu, ram] = stdout.trim().split(',').map(v => parseFloat(v.replace('%', '')));
    return { cpu: cpu || 0, ram: ram || 0 };
  } catch {
    return { cpu: 0, ram: 0 };
  }
}
