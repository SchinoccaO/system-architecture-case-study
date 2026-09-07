/**
 * Servicio para operaciones con áreas programáticas
 * Wrappea las funciones de utils.js con lógica de negocio adicional
 */

const { buscarAreaPorCoordenada, reloadAreaData } = require('../utils');
const { AREAS_PATH } = require('../config/constants');

/**
 * Busca área programática por coordenadas
 * @param {number} lon - Longitud
 * @param {number} lat - Latitud
 * @param {string} archivoJson - Path al archivo GeoJSON (opcional)
 * @returns {Object|null} - Información del área o null
 */
function findAreaByCoordinates(lon, lat, archivoJson = AREAS_PATH) {
  const { logger } = require('../logger');
  try {
    return buscarAreaPorCoordenada(lon, lat, archivoJson);
  } catch (error) {
    logger.error('Error en findAreaByCoordinates', { error: error.message, stack: error.stack });
    return null;
  }
}

/**
 * Recarga el archivo GeoJSON de áreas
 * @param {string} archivoJson - Path al archivo
 * @returns {Object} - GeoJSON recargado
 */
function reloadAreas(archivoJson = AREAS_PATH) {
  return reloadAreaData(archivoJson);
}

module.exports = {
  findAreaByCoordinates,
  reloadAreas,
};
