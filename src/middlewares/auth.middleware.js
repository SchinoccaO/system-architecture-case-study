/**
 * Middlewares de autenticación JWT y Admin
 */

const jwt = require('jsonwebtoken');
const { auditLogger } = require('../logger');
const { security } = require('../config');
const { isBlacklisted } = require('../services/tokenBlacklist.service');

/**
 * Middleware JWT - Valida token en header Authorization: Bearer <token>
 * Token válido por 30 días (configurable)
 */
function jwtAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    auditLogger.warn('Intento de acceso sin JWT token', {
      ip: req.ip,
      url: req.originalUrl,
    });
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Token JWT requerido. Use: Authorization: Bearer <token>',
      },
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, security.jwtSecret);

    // Verificar que el token no haya sido revocado explícitamente via /logout
    if (isBlacklisted(decoded.jti)) {
      auditLogger.warn('Token JWT revocado (blacklist)', {
        ip: req.ip,
        jti: decoded.jti,
        url: req.originalUrl,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token revocado. Solicite uno nuevo en /api/auth/login',
        },
      });
    }

    // Agregar datos del usuario al request para uso posterior
    req.user = decoded;

    auditLogger.info('Autenticacion JWT exitosa', {
      userId: decoded.userId,
      username: decoded.username,
      ip: req.ip,
      url: req.originalUrl,
    });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      auditLogger.warn('Token JWT expirado', {
        ip: req.ip,
        expiredAt: error.expiredAt,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expirado. Solicite uno nuevo en /api/auth/login',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      auditLogger.warn('Token JWT invalido', {
        ip: req.ip,
        error: error.message,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Token invalido',
        },
      });
    }

    auditLogger.error('Error validando JWT', {
      ip: req.ip,
      error: error.message,
    });
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Error de autenticacion',
      },
    });
  }
}

/**
 * Middleware de autenticación para operaciones administrativas
 * Soporta: X-ADMIN-KEY header o JWT con role 'admin'
 */
function adminAuthMiddleware(req, res, next) {
  // 1) Header secret (AREA_RELOAD_SECRET) - convenient for ops scripts
  const adminKey = req.headers['x-admin-key'];
  if (process.env.AREA_RELOAD_SECRET && adminKey && adminKey === process.env.AREA_RELOAD_SECRET) {
    auditLogger.info('Admin auth via X-ADMIN-KEY', { ip: req.ip, url: req.originalUrl });
    return next();
  }

  // 2) JWT-based admin role
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, security.jwtSecret);
      if (decoded && (decoded.role === 'admin' || decoded.role === 'api_admin')) {
        auditLogger.info('Admin auth via JWT role', {
          userId: decoded.userId,
          username: decoded.username,
          ip: req.ip,
          url: req.originalUrl,
        });
        req.user = decoded;
        return next();
      }
    } catch (e) {
      auditLogger.warn('Admin auth failed via JWT', { ip: req.ip, error: e.message });
      // fallthrough to rejection below
    }
  }

  auditLogger.warn('Admin auth required', { ip: req.ip, url: req.originalUrl });
  return res.status(401).json({
    success: false,
    error: { code: 'ADMIN_AUTH_REQUIRED', message: 'Admin credentials required' },
  });
}

module.exports = {
  jwtAuthMiddleware,
  adminAuthMiddleware,
};
