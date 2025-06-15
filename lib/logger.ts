import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'server.log');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export function logError(err: any) {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  console.error(msg);
  try {
    ensureLogDir();
    fs.appendFileSync(logFile, msg + '\n');
  } catch (e) {
    console.error('Failed to write to log file', e);
  }
}
