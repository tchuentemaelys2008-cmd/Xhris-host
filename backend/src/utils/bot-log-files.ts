import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.BOT_LOG_DIR || path.join(process.cwd(), 'logs');

export function getBotLogPath(botId: string): string {
  return path.join(LOG_DIR, `bot-${botId}.log`);
}

export function ensureBotLogFile(botId: string): string {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = getBotLogPath(botId);
  if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '');
  return logPath;
}

export function resetBotLogFile(botId: string): string {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = getBotLogPath(botId);
  fs.writeFileSync(logPath, '');
  return logPath;
}

export function appendBotLog(botId: string, line: string): void {
  const logPath = ensureBotLogFile(botId);
  const ts = new Date().toISOString();
  fs.appendFileSync(logPath, `[${ts}] ${line}\n`);
}

export function readBotLogLines(botId: string, maxLines = 200): string[] {
  const logPath = ensureBotLogFile(botId);
  const raw = fs.readFileSync(logPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines);
}

