/**
 * Global error handlers para el proceso Node.js
 * Previene caídas del servidor por errores no capturados
 */

const { auditLogger } = require('../logger');

/**
 * Registra handlers globales de errores no capturados
 * Debe llamarse al inicio de la aplicación
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    auditLogger.error('💥 UNCAUGHT EXCEPTION DETECTED - Server will shut down gracefully', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Log de auditoría para análisis posterior
    if (typeof auditLogger !== 'undefined') {
      auditLogger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Shutdown graceful: dar tiempo a cerrar conexiones
    /* eslint-disable no-process-exit */
    setTimeout(() => {
      process.exit(1);
    }, 1000);
    /* eslint-enable no-process-exit */
  });

  process.on('unhandledRejection', (reason, promise) => {
    auditLogger.warn('⚠️  UNHANDLED PROMISE REJECTION DETECTED', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Log de auditoría
    if (typeof auditLogger !== 'undefined') {
      auditLogger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    // No hacer exit en unhandledRejection, solo logear
    // El servidor puede seguir funcionando
  });
}

module.exports = {
  setupGlobalErrorHandlers,
};
