/**
 * Rutas de hospitales municipales
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { formatoHospitalLite, formatoHospitalCompleto } = require('../utils/formatters');
const data = require('../../data/servicios_unificados_full_final.json');

// ---------------------------
// Listado de hospitales municipales
// ---------------------------

// Un solo endpoint:
// - sin page/limit → devuelve todo con formato completo
// - con page/limit → paginado (para el bot, paneles, etc.)

router.get('/', jwtAuthMiddleware, (req, res) => {
  // Validación defensiva
  if (!Array.isArray(data.hospitales_municipales)) {
    return res.status(500).json({
      error: 'Error de configuración del sistema',
    });
  }

  const total = data.hospitales_municipales.length;

  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;

  // Si NO pasan paginación -> devolver todo con formato completo
  if (!pageRaw && !limitRaw) {
    return res.json({
      total,
      resultados: data.hospitales_municipales.map(formatoHospitalCompleto),
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
  const resultados = data.hospitales_municipales.slice(start, end).map(formatoHospitalCompleto);

  res.json({
    resultados,
    pagina: page,
    siguientePagina: page < totalPaginas ? page + 1 : null,
    total,
    totalPaginas,
  });
});

// Un hospital por ID (con soporte para ?detail=lite|completo)
router.get('/:id', jwtAuthMiddleware, (req, res) => {
  const detail = req.query.detail || 'lite'; // por defecto lite para móviles

  const hospital = data.hospitales_municipales.find((h) => h.id === req.params.id.toUpperCase());
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital no encontrado' });
  }

  const formatter = detail === 'completo' ? formatoHospitalCompleto : formatoHospitalLite;
  res.json(formatter(hospital));
});

// Servicios de un hospital (con filtro por callcenter)
router.get('/:id/servicios', jwtAuthMiddleware, (req, res) => {
  const { id } = req.params;
  const callcenter = req.query.callcenter; // 'true' | 'false' | undefined

  const hospital = data.hospitales_municipales.find((h) => h.id === id.toUpperCase());
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital no encontrado' });
  }

  let servicios = Array.isArray(hospital.servicios) ? hospital.servicios : [];
  
  // Filtrar por callcenter si se especifica
  if (callcenter === 'true') {
    servicios = servicios.filter((s) => s.turno_callcenter);
  } else if (callcenter === 'false') {
    servicios = servicios.filter((s) => !s.turno_callcenter);
  }

  // Agregar instrucciones para sacar turno según disponibilidad de callcenter
  const serviciosConCallCenter = servicios.some((s) => s.turno_callcenter);
  const instrucciones = serviciosConCallCenter
    ? 'Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs.'
    : 'Acercate personalmente al establecimiento para sacar turno en el horario de atención.';

  res.json({
    hospital: {
      id: hospital.id,
      nombre: hospital.nombre,
      direccion: hospital.direccion,
      latitud: hospital.latitud,
      longitud: hospital.longitud,
    },
    servicios,
    total: servicios.length,
    instrucciones,
  });
});

module.exports = router;
