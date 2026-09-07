/**
 * Punto de entrada del servidor
 * Carga validaciones de seguridad e inicia la aplicación Express
 */
require('dotenv').config();
require('./config/security'); // Validaciones al inicio
const app = require('./app');
const { logger } = require('./logger');
const { PORT, MEMORY_CHECK_INTERVAL, MEMORY_ALERT_THRESHOLD } = require('./config/constants');
const { buscarAreaPorCoordenada } = require('./utils');

// Iniciar servidor HTTP
if (require.main === module) {
  app.listen(PORT, () => {
    app.set('autoreload', true);
    logger.info('Servidor iniciado', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      autoreload: true,
      timestamp: new Date().toISOString(),
    });
    logger.info(`✅ Servidor escuchando en http://localhost:${PORT}`);

    // =====================================================
    // PRE-CARGA DE GEOJSON (P1.2)
    // =====================================================
    logger.info('Pre-cargando cache de áreas programáticas...');
    try {
      buscarAreaPorCoordenada(-31.4201, -64.1888);
      logger.info('✅ Cache de áreas inicializado correctamente');
    } catch (e) {
      logger.error('❌ Error pre-cargando áreas', { error: e.message });
    }

    // =====================================================
    // MONITORING: Memory Usage
    // =====================================================
    // Monitorea el uso de memoria cada 5 minutos
    // Alerta en logs si heapUsed > 500MB (posible memory leak)
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
      const rssMB = (memUsage.rss / 1024 / 1024).toFixed(2);

      // Log normal cada 5 minutos
      logger.info('Memory usage check', {
        heapUsed: `${heapUsedMB} MB`,
        heapTotal: `${heapTotalMB} MB`,
        rss: `${rssMB} MB`,
        timestamp: new Date().toISOString(),
      });

      // Alerta si heapUsed supera el umbral
      if (memUsage.heapUsed > MEMORY_ALERT_THRESHOLD) {
        logger.warn('🚨 HIGH MEMORY USAGE DETECTED', {
          heapUsed: `${heapUsedMB} MB`,
          threshold: '500 MB',
          message: 'Posible memory leak - revisar aplicación',
          timestamp: new Date().toISOString(),
        });
      }
    }, MEMORY_CHECK_INTERVAL);
  });
}

module.exports = app;
// Retrocompatibilidad: exportar `app` como propiedad y mantener exports de funciones
module.exports.app = app;
module.exports.buscarAreaPorCoordenado = buscarAreaPorCoordenada;
module.exports.buscarAreaPorCoordenada = buscarAreaPorCoordenada;
