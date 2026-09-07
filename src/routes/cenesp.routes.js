const express = require('express');
const router = express.Router();
const { logger } = require('../logger');
const { jwtAuthMiddleware } = require('../middlewares/auth.middleware');
const cenespService = require('../services/cenesp.service');

/**
 * @route GET /cenesp
 * @desc Obtener lista de centros especializados (formato lite sin servicios)
 * @query {string} id - IDs separados por comas para filtrar (ej: ?id=MP,CSMCT)
 * @access JWT Token requerido
 */
router.get('/', jwtAuthMiddleware, (req, res) => {
  try {
    // Parsear filtro de IDs si existe
    let ids = null;
    if (req.query.id) {
      ids = req.query.id.split(',').map(id => id.trim()).filter(id => id);
    }
    
    const centros = cenespService.obtenerTodosCenesp(ids);
    
    const filtroTexto = ids ? ` (filtro: ${ids.join(', ')})` : '';
    logger.info(`GET /cenesp - Lista de centros especializados solicitada${filtroTexto}`);
    
    res.json({
      total: centros.length,
      filtro: ids || null,
      resultados: centros
    });
  } catch (error) {
    logger.error('Error en GET /cenesp:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

/**
 * @route GET /cenesp/:id
 * @desc Obtener información de un centro especializado específico por ID
 * @param {string} id - ID del centro (MP, PLM, CSMCT, CAL, CACJ, CACLA)
 * @query {string} detail - Nivel de detalle: 'lite' (sin servicios) o 'completo' (con servicios)
 * @access JWT Token requerido
 */
router.get('/:id', jwtAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { detail } = req.query;

    // Determinar si incluir servicios
    const includeServicios = detail !== 'lite';

    const centro = cenespService.obtenerCenespPorId(id, includeServicios);

    if (!centro) {
      logger.warn(`Centro especializado no encontrado: ${id}`);
      return res.status(404).json({
        error: 'Centro especializado no encontrado',
        id_solicitado: id
      });
    }

    logger.info(`GET /cenesp/${id} - Centro encontrado (detail: ${detail || 'completo'})`);
    res.json(centro);
  } catch (error) {
    logger.error(`Error en GET /cenesp/${req.params.id}:`, error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

/**
 * @route GET /cenesp/:id/servicios
 * @desc Obtener servicios de un centro especializado específico
 * @param {string} id - ID del centro
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

    const resultado = cenespService.obtenerServiciosCenesp(id, callcenterFilter);

    if (!resultado) {
      logger.warn(`Centro especializado no encontrado para servicios: ${id}`);
      return res.status(404).json({
        error: 'Centro especializado no encontrado',
        id_solicitado: id
      });
    }

    logger.info(`GET /cenesp/${id}/servicios - ${resultado.total} servicios encontrados (callcenter: ${callcenter || 'todos'})`);
    res.json(resultado);
  } catch (error) {
    logger.error(`Error en GET /cenesp/${req.params.id}/servicios:`, error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

module.exports = router;
