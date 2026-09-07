/**
 * Rutas de servicios odontológicos especializados (SOM) */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const data = require('../../data/servicios_unificados_full_final.json');

// ============================================================
// ENDPOINT: Servicios Especializados del SOM
// ============================================================
router.get('/servicios', jwtAuthMiddleware, (req, res) => {
  logger.info('GET /api/servicios_odontologicos/servicios', { ip: req.ip, timestamp: new Date().toISOString() });

  try {
    // Buscar SOM en el array servicios_odontologicos
    const som = data.servicios_odontologicos?.find((s) => s.id === 'SOM');

    if (!som) {
      return res.status(404).json({
        error: 'SOM no encontrado',
        mensaje: 'No se encontró el Servicio Odontológico Municipal',
      });
    }

    // Validar que tenga servicios
    const servicios = Array.isArray(som.servicios) ? som.servicios : [];

    // Construir respuesta con formato específico
    const respuesta = {
      centro: {
        id: som.id,
        nombre: som.nombre,
        direccion: som.direccion,
        telefono: '0800-888-5555',
        horarios: som.horarios || 'Lunes a Viernes 7:00-14:00',
        ubicacion: 'San Martín 850, Córdoba',
        coordenadas: {
          latitud: som.latitud,
          longitud: som.longitud,
        },
      },
      servicios_especializados: servicios.map((servicio) => ({
        nombre: servicio.nombre,
        detalle: servicio.detalle,
        turno_callcenter: false,
        presencial: true,
      })),
      instrucciones: {
        paso_1: 'Solicitar turno en el servicio de DERIVACIÓN',
        paso_2: 'Llamar al CallCenter: 0800-888-5555 (Lunes a Viernes 7:00-19:00hs)',
        paso_3: 'O acercarse presencialmente a San Martín 850, Córdoba (Lunes a Viernes 7:00am)',
        paso_4:
          'Luego de la derivación, se otorgan turnos para las especialidades de manera presencial',
      },
      total_servicios: servicios.length,
    };

    res.json(respuesta);
  } catch (error) {
    logger.error('Error en /api/servicios_odontologicos/servicios', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      error: 'Error al obtener servicios odontológicos',
      detalle: error.message,
    });
  }
});

module.exports = router;
