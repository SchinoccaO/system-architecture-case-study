/**
 * Rutas de autenticación JWT
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { auditLogger } = require('../logger');
const { rateLimits, security, JWT_EXPIRATION } = require('../config');
const { jwtAuthMiddleware } = require('../middlewares');
const { blacklistToken } = require('../services/tokenBlacklist.service');

/**
 * Comparación de strings en tiempo constante (VULN-003).
 *
 * Un `!==` normal termina en el primer byte distinto, permitiendo que un
 * atacante infiera caracteres midiendo diferencias de microsegundos.
 * Esta función:
 *  1. Convierte ambos valores a Buffers del mismo tamaño (padding).
 *  2. Ejecuta timingSafeEqual siempre — sin short-circuit.
 *  3. Verifica también la igualdad de longitud para que el padding no
 *     genere un falso positivo ("abc" vs "abcXXX" paddeados al mismo largo).
 */
function safeCompare(a, b) {
  const sa = String(a);
  const sb = String(b);
  const len = Math.max(Buffer.byteLength(sa), Buffer.byteLength(sb), 1);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  bufA.write(sa);
  bufB.write(sb);
  return crypto.timingSafeEqual(bufA, bufB) && Buffer.byteLength(sa) === Buffer.byteLength(sb);
}

/**
 * POST /api/auth/login
 * Genera un JWT token válido por 2h (configurable vía JWT_EXPIRATION).
 *
 * Body: { "username": "xxx", "password": "xxx" }
 * Response: { "token": "eyJhbG...", "expiresIn": "2h" }
 */
router.post('/login', rateLimits.getLoginMiddleware(), (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar que se enviaron credenciales
    if (!username || !password) {
      auditLogger.warn('Intento de login sin credenciales', { ip: req.ip });
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Username y password son requeridos',
        },
      });
    }

    // Comparación en tiempo constante — ambas líneas ejecutan siempre,
    // sin short-circuit, para no revelar si el username o el password era el error.
    const usernameOk = safeCompare(username, security.validUsername);
    const passwordOk = safeCompare(password, security.validPassword);

    if (!usernameOk || !passwordOk) {
      auditLogger.warn('Login fallido - credenciales invalidas', {
        username,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales invalidas',
        },
      });
    }

    // jti (JWT ID) único permite invalidar este token específico en /logout
    const tokenPayload = {
      userId: 'client_001',
      username: username,
      role: 'api_client',
      jti: crypto.randomUUID(),
    };

    const token = jwt.sign(tokenPayload, security.jwtSecret, {
      expiresIn: JWT_EXPIRATION,
    });

    auditLogger.info('Login exitoso - JWT generado', {
      username,
      ip: req.ip,
      expiresIn: JWT_EXPIRATION,
    });

    res.status(200).json({
      success: true,
      token: token,
      expiresIn: JWT_EXPIRATION,
      message: 'Token generado exitosamente. Use: Authorization: Bearer <token>',
    });
  } catch (error) {
    auditLogger.error('Error generando JWT', {
      ip: req.ip,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_GENERATION_ERROR',
        message: 'Error generando token de autenticacion',
      },
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalida el token actual añadiéndolo a la blacklist en memoria.
 * Requiere JWT válido en Authorization: Bearer <token>.
 */
router.post('/logout', jwtAuthMiddleware, (req, res) => {
  const { jti, exp, username } = req.user;

  blacklistToken(jti, exp);

  auditLogger.info('Logout - token invalidado', {
    username: username || null,
    jti: jti || null,
    ip: req.ip,
  });

  return res.json({ success: true, message: 'Sesion cerrada correctamente' });
});

module.exports = router;
