/**
 * Rutas para filtrado por zonas geográficas
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const zonaService = require('../services/zona.service');
const { CentroNoEncontradoError } = zonaService;
const { logger } = require('../logger');

/**
 * GET /api/centros/zonas
 * Lista todas las zonas geográficas disponibles
 */
router.get('/zonas', jwtAuthMiddleware, (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info('GET /api/centros/zonas', { ip, timestamp: new Date().toISOString() });

    const zonas = zonaService.listarZonas();

    res.json({
      total: zonas.length,
      zonas
    });
  } catch (error) {
    logger.error('Error en GET /api/centros/zonas', {
      error: error.message,
      stack: error.stack,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    res.status(500).json({
      mensaje: 'Error al obtener zonas geográficas',
      detalle: error.message
    });
  }
});

/**
 * GET /api/centros/:zona
 * Obtiene todos los centros de una zona geográfica
 * Parámetros: 
 *   - zona (norte, sur, este, oeste)
 *   - page (opcional): número de página
 *   - limit (opcional): centros por página (máx 20, default 5)
 */
router.get('/:zona', jwtAuthMiddleware, (req, res) => {
  try {
    const { zona } = req.params;
    const { page, limit } = req.query;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    logger.info('GET /api/centros/:zona', { 
      ip, 
      zona,
      page,
      limit,
      timestamp: new Date().toISOString() 
    });

    const resultado = zonaService.obtenerCentrosPorZona(zona, { page, limit });

    res.json(resultado);
  } catch (error) {
    logger.error('Error en GET /api/centros/:zona', {
      error: error.message,
      stack: error.stack,
      zona: req.params.zona,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    const statusCode = error.message.includes('inválida') ? 400 : 500;
    res.status(statusCode).json({
      mensaje: 'Error al obtener centros por zona',
      detalle: error.message
    });
  }
});

/**
 * GET /api/centros/:zona/:centro
 * Obtiene un centro específico de una zona geográfica
 * Parámetros: 
 *   - zona (norte, sur, este, oeste)
 *   - centro (nombre o ID del centro, búsqueda parcial)
 */
router.get('/:zona/:centro', jwtAuthMiddleware, (req, res) => {
  try {
    const { zona, centro } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    logger.info('GET /api/centros/:zona/:centro', { 
      ip, 
      zona, 
      centro,
      timestamp: new Date().toISOString() 
    });

    const centros = zonaService.obtenerCentroPorZonaYNombre(zona, centro);

    res.json({
      zona: zona.toLowerCase(),
      busqueda: centro,
      total: centros.length,
      centros
    });
  } catch (error) {
    logger.error('Error en GET /api/centros/:zona/:centro', {
      error: error.message,
      stack: error.stack,
      zona: req.params.zona,
      centro: req.params.centro,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    // Determinar código de status apropiado
    let statusCode = 500;
    if (error.message.includes('inválida')) {
      statusCode = 400; // Bad Request - zona inválida
    } else if (error instanceof CentroNoEncontradoError) {
      statusCode = 404; // Not Found - centro no existe en esa zona
    }

    res.status(statusCode).json({
      mensaje: statusCode === 404 ? 'Centro no encontrado en esta zona' : 'Error al buscar centro',
      detalle: error.message
    });
  }
});

module.exports = router;
