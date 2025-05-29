
import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logToFile: boolean;
  private logDir: string;

  constructor(
    logLevel: LogLevel = LogLevel.INFO,
    logToFile: boolean = true,
    logDir: string = './logs'
  ) {
    this.logLevel = logLevel;
    this.logToFile = logToFile;
    this.logDir = logDir;

    if (this.logToFile) {
      this.ensureLogDir();
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    return JSON.stringify(entry);
  }

  private writeToFile(level: string, formattedMessage: string): void {
    if (!this.logToFile) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = path.join(this.logDir, `${date}.log`);
    
    fs.appendFile(filename, formattedMessage + '\n', (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any): void {
    if (level > this.logLevel) return;

    const formattedMessage = this.formatMessage(levelName, message, data);
    
    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[90m'  // Gray
    };
    
    const reset = '\x1b[0m';
    const color = colors[levelName as keyof typeof colors] || '';
    
    console.log(`${color}[${levelName}]${reset} ${message}`, data || '');
    
    // Write to file
    this.writeToFile(levelName, formattedMessage);
  }

  error(message: string, error?: Error | any): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  // Performance logging
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`Timer [${label}]: ${duration}ms`);
    };
  }

  // Request logging
  logRequest(req: any, res: any, duration: number): void {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP Request Error', logData);
    } else {
      this.info('HTTP Request', logData);
    }
  }
}

// Create singleton logger instance
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  true
);

// Express middleware for request logging
export function requestLogger(req: any, res: any, next: any): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
}
