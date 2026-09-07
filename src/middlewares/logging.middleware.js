/**
 * Middleware de logging estructurado y métricas (P1.4)
 */

const { logger } = require('../logger');

// Sistema de métricas
const metrics = {
  requests: { total: 0, success: 0, clientError: 0, serverError: 0 },
  latencies: [],
  startTime: Date.now(),
};

/**
 * Middleware de logging que captura métricas de cada request
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  metrics.requests.total++;

  res.on('finish', () => {
    const responseTime = Date.now() - start;

    // Capturar métricas (P1.4)
    metrics.latencies.push(responseTime);
    if (metrics.latencies.length > 1000) {
      metrics.latencies.shift(); // Keep only last 1000
    }

    // Categorizar por status
    if (res.statusCode >= 500) {
      metrics.requests.serverError++;
    } else if (res.statusCode >= 400) {
      metrics.requests.clientError++;
    } else {
      metrics.requests.success++;
    }

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Log según el código de respuesta
    if (res.statusCode >= 500) {
      logger.error('Request error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request client error', logData);
    } else {
      logger.info('Request', logData);
    }
  });

  next();
}

/**
 * Obtener métricas actuales del sistema
 */
function getMetrics() {
  const sorted = metrics.latencies.slice().sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
  const memUsage = process.memoryUsage();

  return {
    uptime_seconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      client_errors: metrics.requests.clientError,
      server_errors: metrics.requests.serverError,
      error_rate:
        metrics.requests.total > 0
          ? ((metrics.requests.serverError / metrics.requests.total) * 100).toFixed(2) + '%'
          : '0%',
    },
    latency_ms: {
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      avg: avg,
    },
    memory_mb: {
      rss: (memUsage.rss / 1024 / 1024).toFixed(2),
      heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  requestLogger,
  getMetrics,
};
