/**
 * Rutas de health check y debug
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const { parseCoordinates, seleccionarCentroPorArea } = require('../utils');
const { formatoCentroLite } = require('../utils/formatters');
const data = require('../../data/servicios_unificados_full_final.json');

// Endpoint raíz - mensaje de bienvenida (SIN autenticación)
router.get('/', (req, res) => {
  res.send('API de servicios de salud municipales');
});

router.get('/debug', jwtAuthMiddleware, (req, res) => {
  res.send('OK: estás en el archivo correcto');
});

// Health check endpoint (SIN autenticación)
router.get('/health', (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      services: {
        centros_salud: data?.centros_salud ? true : false,
        utils_coordenadas: true,
      },
      metadata: {
        total_centros: data?.centros_salud?.length || 0,
      },
    });
  } catch (_error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
    });
  }
});

// ---------------------------
// ENDPOINT LEGACY: /test_odo (mantener por compatibilidad)
// ---------------------------
router.get('/test_odo', jwtAuthMiddleware, (req, res) => {
  logger.debug('Endpoint legacy /test_odo', { ip: req.ip });
  const coords = parseCoordinates(req);
  if (coords.error) return res.status(400).json({ error: coords.error });
  // lat/lon parsed but not used directly (selector reads from req)

  // Validación defensiva
  if (!Array.isArray(data.centros_salud)) {
    return res.status(500).json({
      error: 'Error de configuración del sistema',
    });
  }

  // Use shared selector to find best center for odontología (preserving legacy CASE structure)
  let resultado;
  try {
    resultado = seleccionarCentroPorArea({
      reqOrPoint: req,
      centers: data.centros_salud,
      filterFn: (c) =>
        Array.isArray(c.servicios) &&
        c.servicios.some((s) => s.nombre && s.nombre.toLowerCase().includes('odonto')),
      archivoJson: './data/areasredefinidas.json',
      distanciaMaxKm: 10,
      limit: 3,
    });
  } catch (err) {
    logger.error('Error en seleccionarCentroPorArea en /test_odo', { error: err.message, stack: err.stack });
    // Si hay error, ir directo al fallback SOM (Caso C)
    resultado = { encontrado: false };
  }

  if (resultado.encontrado && resultado.asignado) {
    const asignado = resultado.asignado;
    const distancia = resultado.distancia ? Number(resultado.distancia.toFixed(2)) : undefined;
    const servicioOdo = asignado.servicios.find(
      (s) => s.nombre && s.nombre.toLowerCase().includes('odonto'),
    );
    if (servicioOdo) {
      if (servicioOdo.turno_callcenter === true) {
        return res.json({
          caso: 'A',
          centro: {
            id: asignado.id,
            nombre: asignado.nombre,
            direccion: asignado.direccion,
            distancia,
          },
          instrucciones:
            'Tu centro de salud cuenta con el servicio de odontología activo y podés sacar turno llamando a nuestro 0800-888-5555',
        });
      }
      if (servicioOdo.turno_callcenter === false) {
        return res.json({
          caso: 'B',
          centro: {
            id: asignado.id,
            nombre: asignado.nombre,
            direccion: asignado.direccion,
            zona_programatica: asignado.zona_programatica,
            distancia,
          },
          instrucciones:
            'Tu centro de salud cuenta con el servicio de odontología activo. Para sacar turno deberás acercarte personalmente al centro',
        });
      }
    }
  }

  // Caso C: fallback a SOM
  const som = data.centros_salud.find((c) => c.id === 'SOM');
  if (!som) {
    return res.status(500).json({ error: 'No se encontró SOM en el sistema' });
  }
  return res.json({
    caso: 'C',
    centro: { id: som.id, nombre: som.nombre, direccion: som.direccion, horarios: som.horarios },
    instrucciones:
      'Te recomendamos acercarte al Servicio Odontológico Municipal (SOM) para atención odontológica',
  });
});

// ---------------------------
// Centros para el mapa (Leaflet)
// Versión liviana para mapas interactivos
// ---------------------------
router.get('/centros_salud_mapa', jwtAuthMiddleware, (req, res) => {
  const centroId = req.query.centro; // Filtro opcional por ID de centro
  logger.debug('/centros_salud_mapa - filtro por centro', { centroId: centroId || 'sin filtro', ip: req.ip });
  
  let centros = data.centros_salud;
  
  // Si se especifica un centro específico, filtrar
  if (centroId) {
    centros = centros.filter((c) => c.id === centroId.toUpperCase());
    logger.debug('Centros después del filtro', { count: centros.length });
  }
  
  const resultado = centros.map((c) => formatoCentroLite(c));
  
  res.json(resultado);
});

module.exports = router;
