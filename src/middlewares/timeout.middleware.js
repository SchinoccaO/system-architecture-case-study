/**
 * Middlewares de timeout para prevenir requests colgados
 */

const timeout = require('connect-timeout');
const { logger } = require('../logger');
const { TIMEOUT_MS } = require('../config/constants');

/**
 * Middleware de timeout global
 */
const timeoutMiddleware = timeout(`${TIMEOUT_MS}ms`);

/**
 * Handler que previene continuar si el request ya expiró
 */
function haltOnTimedout(req, res, next) {
  if (!req.timedout) {
    next();
  }
}

/**
 * Error handler para requests que expiraron
 */
function timeoutErrorHandler(err, req, res, next) {
  if (req.timedout) {
    logger.warn('Request timeout', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      timeout: `${TIMEOUT_MS}ms`,
    });

    return res.status(408).json({
      error: 'REQUEST_TIMEOUT',
      message: 'El servidor no pudo procesar tu solicitud a tiempo. Por favor intentá nuevamente.',
    });
  }

  next(err);
}

module.exports = {
  timeoutMiddleware,
  haltOnTimedout,
  timeoutErrorHandler,
};
