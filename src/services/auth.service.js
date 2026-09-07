/**
 * Servicio de autenticación JWT
 * Maneja generación y validación de tokens
 */

const jwt = require('jsonwebtoken');
const { auditLogger } = require('../logger');
const { security, JWT_EXPIRATION } = require('../config');

/**
 * Autentica usuario y genera token JWT
 * @param {string} username 
 * @param {string} password 
 * @returns {Object} { success, token?, error? }
 */
function authenticate(username, password) {
  // Validar que se enviaron credenciales
  if (!username || !password) {
    return {
      success: false,
      error: {
        code: 'MISSING_CREDENTIALS',
        message: 'Username y password son requeridos',
      },
    };
  }

  // Validar credenciales
  if (username !== security.validUsername || password !== security.validPassword) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales invalidas',
      },
    };
  }

  // Generar JWT token
  const tokenPayload = {
    userId: 'client_001',
    username: username,
    role: 'api_client',
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(tokenPayload, security.jwtSecret, {
    expiresIn: JWT_EXPIRATION,
  });

  return {
    success: true,
    token: token,
    expiresIn: JWT_EXPIRATION,
  };
}

module.exports = {
  authenticate,
};
