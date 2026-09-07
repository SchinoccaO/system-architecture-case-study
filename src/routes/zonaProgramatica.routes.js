/**
 * Rutas para filtrado por zona programática
 * La zona programática es un código numérico del centro (ej: "01", "02", ...)
 * diferente a la zona geográfica (norte/sur/este/oeste).
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const zonaProgramaticaService = require('../services/zonaProgramatica.service');

/**
 * GET /api/zonas_programaticas
 * Lista todas las zonas programáticas disponibles con conteo de centros
 */
router.get('/', jwtAuthMiddleware, (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info('GET /api/zonas_programaticas', { ip, timestamp: new Date().toISOString() });

    const zonas = zonaProgramaticaService.listarZonasProgramaticas();

    res.json({
      total: zonas.length,
      zonas_programaticas: zonas,
    });
  } catch (error) {
    logger.error('Error en GET /api/zonas_programaticas', { error: error.message });
    res.status(500).json({ error: 'Error al obtener zonas programáticas' });
  }
});

/**
 * GET /api/zonas_programaticas/:zona
 * Obtiene todos los centros de una zona programática específica
 * Parámetros de query:
 *   - page (opcional): número de página
 *   - limit (opcional): centros por página (máx 20, default 10)
 */
router.get('/:zona', jwtAuthMiddleware, (req, res) => {
  try {
    const { zona } = req.params;
    const { page, limit } = req.query;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    logger.info('GET /api/zonas_programaticas/:zona', {
      ip,
      zona,
      page,
      limit,
      timestamp: new Date().toISOString(),
    });

    const resultado = zonaProgramaticaService.obtenerCentrosPorZonaProgramatica(zona, { page, limit });

    res.json(resultado);
  } catch (error) {
    logger.error('Error en GET /api/zonas_programaticas/:zona', {
      error: error.message,
      zona: req.params.zona,
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

module.exports = router;
