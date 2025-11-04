import * as fs from 'fs';
import * as path from 'path';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
    this.cleanOldLogs();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private cleanOldLogs(): void {
    // const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const maxAge = 0;
    const now = Date.now();

    try {
      const files = fs.readdirSync(this.logDir);
      files.forEach((file) => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
          }
        }
      });
    } catch (_error) {
      // Silently ignore cleanup errors
    }
  }

  setLevel(level: keyof typeof LogLevel): void {
    this.level = LogLevel[level];
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level <= this.level) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      const logData = data ? ` ${JSON.stringify(data)}` : '';
      const logEntry = `[${timestamp}] ${levelName}: ${message}${logData}\n`;

      // console.log(logEntry.trim());

      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `${date}.log`);
      fs.appendFileSync(logFile, logEntry);
    }
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }
}

export default new Logger();
