// Logger utility
import { getLogsDir } from '../../shared/utils/files';
import { isDev } from './env';
import fs from 'fs/promises';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private logsDir: string;
  private currentLogFile: string;
  private logQueue: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxLogSize = 10 * 1024 * 1024; // 10 MB

  constructor() {
    this.logsDir = getLogsDir();
    this.currentLogFile = path.join(this.logsDir, `zerotweaks-${new Date().toISOString().split('T')[0]}.log`);
    this.init();
  }

  private async init(): Promise<void> {
    await fs.mkdir(this.logsDir, { recursive: true });
    this.startFlushInterval();
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const entries = this.logQueue.splice(0, this.logQueue.length);
    const logLines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

    try {
      await fs.appendFile(this.currentLogFile, logLines, 'utf8');
      await this.rotateIfNeeded();
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.currentLogFile);
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newFile = path.join(this.logsDir, `zerotweaks-${timestamp}.log`);
        await fs.rename(this.currentLogFile, newFile);
        this.currentLogFile = path.join(this.logsDir, `zerotweaks-${new Date().toISOString().split('T')[0]}.log`);
        // Clean old logs (keep last 30 days)
        await this.cleanOldLogs();
      }
    } catch {
      // Ignore rotation errors
    }
  }

  private async cleanOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logsDir);
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (const file of files) {
        if (file.startsWith('zerotweaks-') && file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = await fs.stat(filePath);
          if (stats.mtimeMs < cutoff) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    this.logQueue.push(entry);

    // Also log to console while running from source (the packaged app has no
    // console attached, so this only matters during development).
    if (isDev) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      switch (level) {
        case 'debug':
          console.debug(prefix, message, data || '');
          break;
        case 'info':
          console.info(prefix, message, data || '');
          break;
        case 'warn':
          console.warn(prefix, message, data || '');
          break;
        case 'error':
          console.error(prefix, message, data || '');
          break;
      }
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

export const logger = new Logger();