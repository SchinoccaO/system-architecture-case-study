const path = require('path');
const fs = require('fs');
const { logger } = require('../logger');
const { formatoDEMLite, formatoDEMCompleto } = require('../utils/formatters');

// Cargar datos desde el JSON unificado
const dataPath = path.join(__dirname, '../../data/servicios_unificados_full_final.json');
let direccionesEspeciales = [];

try {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  direccionesEspeciales = data.direcciones_especiales || [];
  logger.info(`DEM Service: Cargadas ${direccionesEspeciales.length} direcciones de especialidades médicas`);
} catch (error) {
  logger.error('Error cargando direcciones de especialidades médicas:', error);
}

/**
 * Obtener una dirección de especialidades médicas por ID
 * @param {string} id - ID de la dirección (DC, DN, DO)
 * @param {boolean} includeServicios - Si incluir servicios en la respuesta
 * @returns {object|null} Dirección encontrada o null
 */
function obtenerDEMPorId(id, includeServicios = true) {
  if (!id) {
    return null;
  }

  const idNormalizado = id.toUpperCase().trim();
  const dem = direccionesEspeciales.find(d => d.id === idNormalizado);

  if (!dem) {
    return null;
  }

  // Formato completo con servicios y mapa_url
  if (includeServicios) {
    return formatoDEMCompleto(dem);
  }

  // Formato lite sin servicios
  return formatoDEMLite(dem);
}

/**
 * Obtener todos los DEMs (formato lite)
 * @param {array|null} ids - Array de IDs para filtrar (opcional)
 * @returns {array} Lista de DEMs sin servicios
 */
function obtenerTodosDEMs(ids = null) {
  let dems = direccionesEspeciales;
  
  // Filtrar por IDs si se proporciona
  if (ids && Array.isArray(ids) && ids.length > 0) {
    const idsNormalizados = ids.map(id => id.toUpperCase().trim());
    dems = direccionesEspeciales.filter(dem => idsNormalizados.includes(dem.id));
  }
  
  return dems.map(dem => formatoDEMLite(dem));
}

/**
 * Obtener servicios de un DEM específico
 * @param {string} id - ID del DEM
 * @param {boolean|null} callcenterFilter - Filtrar por turno_callcenter (true, false, o null para todos)
 * @returns {object|null} Objeto con servicios y metadata o null si no existe
 */
function obtenerServiciosDEM(id, callcenterFilter = null) {
  if (!id) {
    return null;
  }

  const idNormalizado = id.toUpperCase().trim();
  const dem = direccionesEspeciales.find(d => d.id === idNormalizado);

  if (!dem) {
    return null;
  }

  let servicios = dem.servicios || [];

  // Filtrar por callcenter si se especifica
  if (callcenterFilter !== null) {
    servicios = servicios.filter(s => s.turno_callcenter === callcenterFilter);
  }

  return {
    dem: {
      id: dem.id,
      nombre: dem.nombre,
      direccion: dem.direccion,
      latitud: dem.latitud,
      longitud: dem.longitud
    },
    servicios: servicios,
    total: servicios.length,
    filtro_callcenter: callcenterFilter
  };
}

module.exports = {
  obtenerDEMPorId,
  obtenerTodosDEMs,
  obtenerServiciosDEM
};
