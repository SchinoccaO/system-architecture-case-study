/**
 * Servicio de selección de centros de salud
 * Contiene toda la lógica reutilizable para asignar centros según área/distancia
 */

const { seleccionarCentroPorArea, calcularDistancia } = require('../utils');
const { AREAS_PATH, DISTANCIA_MAXIMA_KM } = require('../config/constants');

/**
 * Selecciona centro por área programática (reutilizable)
 * @param {Object} options - Opciones de selección
 * @returns {Object} - Resultado con centro encontrado o sugerencias
 */
function selectCenterByArea(options) {
  const {
    reqOrPoint,
    centers,
    filterFn,
    archivoJson = AREAS_PATH,
    distanciaMaxKm = DISTANCIA_MAXIMA_KM,
    limit = 3,
  } = options;

  return seleccionarCentroPorArea({
    reqOrPoint,
    centers,
    filterFn,
    archivoJson,
    distanciaMaxKm,
    limit,
  });
}

/**
 * Filtra centros que tienen odontología
 * @param {Array} centros - Lista de centros
 * @returns {Array} - Centros filtrados
 */
function filterCentersWithOdontologia(centros) {
  return centros.filter((c) => {
    if (!Array.isArray(c.servicios)) return false;
    return c.servicios.some((s) => s.nombre && s.nombre.toLowerCase().includes('odonto'));
  });
}

/**
 * Verifica si un centro tiene odontología
 * @param {Object} centro - Centro de salud
 * @returns {boolean}
 */
function centroTieneOdontologia(centro) {
  if (!Array.isArray(centro?.servicios)) return false;
  return centro.servicios.some((s) => {
    if (!s || typeof s.nombre !== 'string') return false;
    const nombre = s.nombre.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return nombre.includes('odonto');
  });
}

/**
 * Ordena centros por distancia a coordenadas
 * @param {Array} centros - Lista de centros
 * @param {number} lat - Latitud usuario
 * @param {number} lon - Longitud usuario
 * @returns {Array} - Centros ordenados con campo distancia
 */
function sortCentersByDistance(centros, lat, lon) {
  return centros
    .map((c) => ({
      ...c,
      distancia: calcularDistancia(lat, lon, c.latitud, c.longitud),
    }))
    .filter((c) => !Number.isNaN(c.distancia))
    .sort((a, b) => a.distancia - b.distancia);
}

module.exports = {
  selectCenterByArea,
  filterCentersWithOdontologia,
  centroTieneOdontologia,
  sortCentersByDistance,
};
