/**
 * Rutas de HPA (Hospitales de Pronta Atención)
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const { formatoHPA } = require('../utils/formatters');
const data = require('../../data/servicios_unificados_full_final.json');

// ---------------------------
// Listado de HPA
// ---------------------------

// GET /api/hpa - Lista todos los HPA (con paginación opcional)
router.get('/', jwtAuthMiddleware, (req, res) => {
  logger.info('GET /api/hpa - Listado de HPA', { ip: req.ip, timestamp: new Date().toISOString() });

  try {
    // Validación defensiva
    if (!Array.isArray(data.hospitales_pronta_atencion)) {
      return res.status(500).json({
        error: 'Error de configuración del sistema',
      });
    }

    const total = data.hospitales_pronta_atencion.length;

    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;

    // Si NO pasan paginación -> devolver todo
    if (!pageRaw && !limitRaw) {
      return res.json({
        total,
        resultados: data.hospitales_pronta_atencion.map(formatoHPA),
      });
    }

    // Con paginación
    const page = Math.max(1, parseInt(pageRaw) || 1);
    const limit = Math.min(10, Math.max(1, parseInt(limitRaw) || 4)); // máx 10 (aunque son 4)

    const totalPaginas = Math.ceil(total / limit);
    if (page > totalPaginas) {
      return res.json({
        resultados: [],
        pagina: page,
        siguientePagina: null,
        total,
        totalPaginas,
      });
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const resultados = data.hospitales_pronta_atencion.slice(start, end).map(formatoHPA);

    res.json({
      resultados,
      pagina: page,
      siguientePagina: page < totalPaginas ? page + 1 : null,
      total,
      totalPaginas,
    });
  } catch (error) {
    logger.error('Error en GET /api/hpa', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      error: 'Error al obtener HPA',
      detalle: error.message,
    });
  }
});

// ---------------------------
// HPA por ID
// ---------------------------

// GET /api/hpa/:id - Obtiene un HPA específico por ID
router.get('/:id', jwtAuthMiddleware, (req, res) => {
  logger.info('GET /api/hpa/:id - Detalle de HPA', { id: req.params.id, ip: req.ip, timestamp: new Date().toISOString() });

  try {
    const hpa = data.hospitales_pronta_atencion.find((h) => h.id === req.params.id.toUpperCase());
    
    if (!hpa) {
      return res.status(404).json({ 
        error: 'Hospital de Pronta Atención no encontrado',
        mensaje: `No se encontró el HPA con ID: ${req.params.id.toUpperCase()}`,
        id_buscado: req.params.id.toUpperCase()
      });
    }

    res.json(formatoHPA(hpa));
  } catch (error) {
    logger.error('Error en GET /api/hpa/:id', { id: req.params.id, error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      error: 'Error al obtener HPA',
      detalle: error.message,
    });
  }
});

module.exports = router;
