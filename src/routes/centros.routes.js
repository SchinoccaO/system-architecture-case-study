/**
 * Rutas de centros de salud
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { formatoCentroLite, formatoCentroCompleto } = require('../utils/formatters');
const data = require('../../data/servicios_unificados_full_final.json');

// ---------------------------
// Listado de centros de salud
// ---------------------------

// Un solo endpoint:
// - sin page/limit → devuelve todo con formato completo (RF1)
// - con page/limit → paginado (para el bot, paneles, etc.)

router.get('/', jwtAuthMiddleware, (req, res) => {
  // RF7: Validación defensiva
  if (!Array.isArray(data.centros_salud)) {
    return res.status(500).json({
      error: 'Error de configuración del sistema',
    });
  }

  const total = data.centros_salud.length;

  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;

  // Si NO pasan paginación -> devolver todo con formato completo (cumple RF1)
  if (!pageRaw && !limitRaw) {
    return res.json({
      total,
      resultados: data.centros_salud.map(formatoCentroCompleto),
    });
  }

  // Con paginación
  const page = Math.max(1, parseInt(pageRaw) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(limitRaw) || 10)); // máx 20

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
  const resultados = data.centros_salud.slice(start, end).map(formatoCentroCompleto);

  res.json({
    resultados,
    pagina: page,
    siguientePagina: page < totalPaginas ? page + 1 : null,
    total,
    totalPaginas,
  });
});

// Un centro por ID (con soporte para ?detail=lite|completo)
router.get('/:id', jwtAuthMiddleware, (req, res) => {
  const detail = req.query.detail || 'lite'; // por defecto lite para móviles

  const centro = data.centros_salud.find((c) => c.id === req.params.id.toUpperCase());
  if (!centro) {
    return res.status(404).json({ error: 'Centro no encontrado' });
  }

  const formatter = detail === 'completo' ? formatoCentroCompleto : formatoCentroLite;
  res.json(formatter(centro));
});

// Servicios de un centro (con filtro por callcenter)
router.get('/:id/servicios', jwtAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const callcenter = req.query.callcenter; // 'true' | 'false' | undefined

  const centro = data.centros_salud.find((c) => c.id === id.toUpperCase());
  if (!centro) {
    return res.status(404).json({ error: 'Centro no encontrado' });
  }

  let servicios = Array.isArray(centro.servicios) ? centro.servicios : [];
  if (callcenter === 'true') {
    servicios = servicios.filter((s) => s.turno_callcenter);
  } else if (callcenter === 'false') {
    servicios = servicios.filter((s) => !s.turno_callcenter);
  }

  res.json(servicios);
});

module.exports = router;
