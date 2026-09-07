/**
 * Configuración de rate limiters para proteger la API
 */

const rateLimit = require('express-rate-limit');
const { logger, auditLogger } = require('../logger');

// Rate Limiter General - Protege todos los endpoints
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: 'Demasiadas solicitudes, intente más tarde',
  handler: (req, res) => {
    logger.warn('Rate limit general excedido', { ip: req.ip, url: req.originalUrl });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes, intente mas tarde',
      },
    });
  },
});

// Rate Limiter Específico para Login - Previene ataques de fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos
  skipSuccessfulRequests: true, // Login exitoso no cuenta como intento
  handler: (req, res) => {
    auditLogger.warn('Demasiados intentos de login fallidos', {
      ip: req.ip,
      username: req.body?.username,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Demasiados intentos de login. Intente nuevamente en 15 minutos',
        retryAfter: 900, // segundos
      },
    });
  },
  standardHeaders: true, // Retorna RateLimit-* headers
  legacyHeaders: false,
});

// Rate limiter for admin operations
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    auditLogger.warn('Admin rate limit exceeded', { ip: req.ip, url: req.originalUrl });
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many admin requests' },
    });
  },
});

// Durante tests, deshabilitamos el rate limiter específico de login
const getLoginMiddleware = () => {
  return process.env.NODE_ENV === 'test' ? (req, res, next) => next() : loginLimiter;
};

module.exports = {
  generalLimiter,
  loginLimiter,
  adminLimiter,
  getLoginMiddleware,
};
