/**
 * Rutas de áreas programáticas
 * Copiado EXACTAMENTE del server.js original
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const { parseCoordinates, buscarAreaPorCoordenada, calcularDistancia } = require('../utils');
const { formatoCentroCompleto } = require('../utils/formatters');
const data = require('../../data/servicios_unificados_full_final.json');

// ---------------------------
// Centro correspondiente
// Devuelve UN SOLO centro asignado según ubicación del usuario
// ---------------------------

router.get('/centro_correspondiente', jwtAuthMiddleware, (req, res) => {
  // Nueva lógica: asignar centro según área programática calculada por polígonos
  // La lat/lon se consultan directamente dentro de `buscarAreaPorCoordenada`.
  // Se deprecia la selección por distancia; la antigua implementación se
  // mantiene comentada más abajo por referencia.

  const coords = parseCoordinates(req);
  if (coords.error) return res.status(400).json({ error: coords.error });
  const { lat, lon } = coords;

  // Validación de ejido municipal de Córdoba Capital
  const BBOX = { latMin: -31.7, latMax: -31.1, lonMin: -64.6, lonMax: -63.8 };
  if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) {
    return res.status(422).json({
      error: 'Las coordenadas están fuera del ejido municipal de Córdoba Capital',
    });
  }

  // Validación defensiva
  if (!Array.isArray(data.centros_salud)) {
    return res.status(500).json({
      error: 'Error de configuración del sistema',
    });
  }

  // Obtener área programática a partir de las coordenadas (usa internamente req)
  let areaInfo = null;
  try {
    areaInfo = buscarAreaPorCoordenada(req, './data/areasredefinidas.json');
  } catch (err) {
    // En caso de error en la determinación del área, loguear y continuar con fallback
    logger.error('Error en buscarAreaPorCoordenada', { error: err.message, stack: err.stack, ip: req.ip });
    areaInfo = null;
  }

  // Si encontramos centros que pertenezcan a la misma área, devolver uno de ellos.
  if (areaInfo) {
    const candidatos = data.centros_salud.filter((c) => {
      const codigo = c.area_programatica?.codigo_area || c.area_programatica?.codigo || null;
      const denom = c.area_programatica?.denominacion || c.area_programatica?.denominacion || null;

      if (
        codigo &&
        areaInfo.area &&
        String(codigo).toLowerCase() === String(areaInfo.area).toLowerCase()
      )
        return true;
      if (
        c.zona_programatica &&
        areaInfo.zona &&
        String(c.zona_programatica) === String(areaInfo.zona)
      )
        return true;
      if (
        denom &&
        areaInfo.denominacion &&
        String(denom).toLowerCase() === String(areaInfo.denominacion).toLowerCase()
      )
        return true;
      return false;
    });

    if (candidatos.length > 0) {
      // Entre los candidatos, elegir el más cercano a las coordenadas del usuario
      const candidatosConDist = candidatos
        .map((c) => ({
          centro: c,
          distancia: calcularDistancia(lat, lon, c.latitud, c.longitud),
        }))
        .filter((cd) => !Number.isNaN(cd.distancia));

      if (candidatosConDist.length > 0) {
        candidatosConDist.sort((a, b) => a.distancia - b.distancia);
        const mejor = candidatosConDist[0].centro;
        logger.info('Asignación de centro por área', {
          lat,
          lon,
          area: areaInfo.area || areaInfo.zona,
          centroId: mejor.id,
          distancia: candidatosConDist[0].distancia.toFixed(2),
        });
        const respuesta = formatoCentroCompleto(mejor);
        respuesta.distancia = Number(candidatosConDist[0].distancia.toFixed(2));
        return res.json({ centro_asignado: respuesta });
      }
      // si todos los candidatos no tienen coordenadas válidas, continuar al fallback
    }
  }

  // Si no se encontró centro dentro del área programática, devolver error
  logger.warn('No se encontró centro en área para las coordenadas', { lat, lon, ip: req.ip });
  return res.status(404).json({ 
    error: 'No se encontró centro de salud para esa ubicación',
    mensaje: 'No pudimos determinar un centro de salud en tu zona'
  });
});

// ============================================================
// ENDPOINT: Obtener área programática por coordenadas
// Retorna la zona/área a la que pertenece el punto. Protegido con JWT.
// ============================================================

router.get('/area_programatica', jwtAuthMiddleware, (req, res) => {
  const coords = parseCoordinates(req);
  if (coords.error) return res.status(400).json({ error: coords.error });
  const { lat, lon } = coords;

  const BBOX = { latMin: -31.7, latMax: -31.1, lonMin: -64.6, lonMax: -63.8 };
  if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) {
    return res.status(422).json({
      error: 'Las coordenadas están fuera del ejido municipal de Córdoba Capital',
    });
  }

  try {
    const area = buscarAreaPorCoordenada(lon, lat, './data/areasredefinidas.json');
    if (area) return res.json({ encontrado: true, area });
    return res.status(404).json({
      encontrado: false,
      mensaje: 'No se encontró área programática para esas coordenadas',
    });
  } catch (_err) {
    return res.status(500).json({ error: 'Error interno al procesar la solicitud' });
  }
});

module.exports = router;
