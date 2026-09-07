const winston = require('winston');
require('winston-daily-rotate-file');

// Transporte para logs generales (rotación diaria, 365 días)
const combinedTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '365d',
  maxSize: '20m',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Transporte para errores críticos (separado para fácil inspección)
const errorTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '365d',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Transporte para auditoría (autenticación, accesos críticos)
const auditTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/audit-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '730d', // 2 años para auditoría
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Transporte para consola (solo en desarrollo)
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  silent: process.env.NODE_ENV === 'production',
});

// Crear logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [combinedTransport, errorTransport, consoleTransport],
});

// Logger específico para auditoría
const auditLogger = winston.createLogger({
  level: 'info',
  transports: [auditTransport, consoleTransport],
});

module.exports = { logger, auditLogger };
