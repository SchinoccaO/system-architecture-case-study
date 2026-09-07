/**
 * Rutas para consulta de centro de salud por CUIL
 * Integra con la API externa Wise (portal salud Córdoba)
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const cuilService = require('../services/cuil.service');
const { formatoCentroCompleto } = require('../utils/formatters');
const data = require('../../data/servicios_unificados_full_final.json');

/**
 * GET /api/cuil/:cuil/centro
 *
 * Devuelve el centro de salud asignado al paciente identificado por CUIL.
 * La respuesta incluye dos mensajes para renderizar como burbujas separadas.
 *
 * Parámetros:
 *   - cuil (path): CUIL del paciente (solo dígitos, 11 caracteres)
 *
 * Respuesta exitosa (200):
 *   {
 *     mensajes: [
 *       { tipo: "centro_identificado", texto: "...", datos: {...} },
 *       { tipo: "servicios_disponibles", texto: "...", datos: {...}, accion: {...} }
 *     ]
 *   }
 */
router.get('/:cuil/centro', jwtAuthMiddleware, async (req, res) => {
  const { cuil } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Validar formato de CUIL: solo dígitos, entre 10 y 11 caracteres
  if (!/^\d{10,11}$/.test(cuil)) {
    return res.status(400).json({
      error: 'CUIL inválido',
      detalle: 'El CUIL debe contener solo dígitos (10 u 11 caracteres)',
    });
  }

  logger.info('GET /api/cuil/:cuil/centro', { ip, cuil, timestamp: new Date().toISOString() });

  try {
    const resultado = await cuilService.getCentroByCuil(cuil);

    // Si piden detail=completo, devolver el centro formateado completo (sin mensajes de chatbot)
    if (req.query.detail === 'completo') {
      const centroId = resultado._meta.centro_id;
      const centro = data.centros_salud.find((c) => c.id === centroId);
      if (!centro) {
        return res.status(404).json({ error: 'Centro no encontrado en el sistema' });
      }
      return res.json(formatoCentroCompleto(centro));
    }

    res.json(resultado);
  } catch (error) {
    logger.error('Error en GET /api/cuil/:cuil/centro', {
      error: error.message,
      cuil,
      ip,
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message,
      ...(error.sinArea && { codigo: 'SIN_AREA_PROGRAMATICA' }),
      ...(error.sinCentro && { codigo: 'CENTRO_NO_ENCONTRADO' }),
    });
  }
});

module.exports = router;
