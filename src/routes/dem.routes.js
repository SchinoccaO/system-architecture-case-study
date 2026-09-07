const express = require('express');
const router = express.Router();
const { logger } = require('../logger');
const { jwtAuthMiddleware } = require('../middlewares/auth.middleware');
const demService = require('../services/dem.service');

/**
 * @route GET /dem
 * @desc Obtener lista de todas las direcciones de especialidades médicas (formato lite)
 * @query {string} id - IDs separados por comas para filtrar (ej: ?id=DC,DO)
 * @access JWT Token requerido
 */
router.get('/', jwtAuthMiddleware, (req, res) => {
  try {
    // Parsear filtro de IDs si existe
    let ids = null;
    if (req.query.id) {
      ids = req.query.id.split(',').map(id => id.trim()).filter(id => id);
    }
    
    const dems = demService.obtenerTodosDEMs(ids);
    
    const filtroTexto = ids ? ` (filtro: ${ids.join(', ')})` : '';
    logger.info(`GET /dem - Lista de DEMs solicitada${filtroTexto}`);
    
    res.json({
      total: dems.length,
      filtro: ids || null,
      resultados: dems
    });
  } catch (error) {
    logger.error('Error en GET /dem:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

/**
 * @route GET /dem/:id
 * @desc Obtener información de un DEM específico por ID
 * @param {string} id - ID del DEM (DC, DN, DO)
 * @query {string} detail - Nivel de detalle: 'lite' (sin servicios) o 'completo' (con servicios)
 * @access JWT Token requerido
 */
router.get('/:id', jwtAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { detail } = req.query;

    // Determinar si incluir servicios
    const includeServicios = detail !== 'lite';

    const dem = demService.obtenerDEMPorId(id, includeServicios);

    if (!dem) {
      logger.warn(`DEM no encontrado: ${id}`);
      return res.status(404).json({
        error: 'DEM no encontrado',
        id_solicitado: id
      });
    }

    logger.info(`GET /dem/${id} - DEM encontrado (detail: ${detail || 'completo'})`);
    res.json(dem);
  } catch (error) {
    logger.error(`Error en GET /dem/${req.params.id}:`, error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

/**
 * @route GET /dem/:id/servicios
 * @desc Obtener servicios de un DEM específico
 * @param {string} id - ID del DEM
 * @query {string} callcenter - Filtrar por disponibilidad de turno callcenter ('true' o 'false')
 * @access JWT Token requerido
 */
router.get('/:id/servicios', jwtAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { callcenter } = req.query;

    // Parsear el filtro de callcenter
    let callcenterFilter = null;
    if (callcenter === 'true') {
      callcenterFilter = true;
    } else if (callcenter === 'false') {
      callcenterFilter = false;
    }

    const resultado = demService.obtenerServiciosDEM(id, callcenterFilter);

    if (!resultado) {
      logger.warn(`DEM no encontrado para servicios: ${id}`);
      return res.status(404).json({
        error: 'DEM no encontrado',
        id_solicitado: id
      });
    }

    logger.info(`GET /dem/${id}/servicios - ${resultado.total} servicios encontrados (callcenter: ${callcenter || 'todos'})`);
    res.json(resultado);
  } catch (error) {
    logger.error(`Error en GET /dem/${req.params.id}/servicios:`, error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

module.exports = router;
