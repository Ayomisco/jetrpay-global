import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    enabled: true
  },
  isDevelopment ? pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: false,
      ignore: 'pid,hostname'
    }
  }) : undefined
);

// Child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};
