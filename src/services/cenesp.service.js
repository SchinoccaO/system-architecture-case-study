const path = require('path');
const fs = require('fs');
const { logger } = require('../logger');
const { formatoCenespLite, formatoCenespCompleto } = require('../utils/formatters');

// Cargar datos desde el JSON unificado
const dataPath = path.join(__dirname, '../../data/servicios_unificados_full_final.json');
let centrosEspecializados = [];

try {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  centrosEspecializados = data.centros_especializados || [];
  logger.info(`Cenesp Service: Cargados ${centrosEspecializados.length} centros especializados`);
} catch (error) {
  logger.error('Error cargando centros especializados:', error);
}

/**
 * Obtener un centro especializado por ID
 * @param {string} id - ID del centro (MP, PLM, CSMCT, CAL, CACJ, CACLA)
 * @param {boolean} includeServicios - Si incluir servicios en la respuesta
 * @returns {object|null} Centro encontrado o null
 */
function obtenerCenespPorId(id, includeServicios = true) {
  if (!id) {
    return null;
  }

  const idNormalizado = id.toUpperCase().trim();
  const centro = centrosEspecializados.find(c => c.id === idNormalizado);

  if (!centro) {
    return null;
  }

  // Formato completo con servicios y mapa_url
  if (includeServicios) {
    return formatoCenespCompleto(centro);
  }

  // Formato lite sin servicios
  return formatoCenespLite(centro);
}

/**
 * Obtener todos los centros especializados (formato lite)
 * @param {array|null} ids - Array de IDs para filtrar (opcional)
 * @returns {array} Lista de centros sin servicios
 */
function obtenerTodosCenesp(ids = null) {
  let centros = centrosEspecializados;
  
  // Filtrar por IDs si se proporciona
  if (ids && Array.isArray(ids) && ids.length > 0) {
    const idsNormalizados = ids.map(id => id.toUpperCase().trim());
    centros = centrosEspecializados.filter(c => idsNormalizados.includes(c.id));
  }
  
  return centros.map(c => formatoCenespLite(c));
}

/**
 * Obtener servicios de un centro especializado específico
 * @param {string} id - ID del centro
 * @param {boolean|null} callcenterFilter - Filtrar por turno_callcenter (true, false, o null para todos)
 * @returns {object|null} Objeto con servicios y metadata o null si no existe
 */
function obtenerServiciosCenesp(id, callcenterFilter = null) {
  if (!id) {
    return null;
  }

  const idNormalizado = id.toUpperCase().trim();
  const centro = centrosEspecializados.find(c => c.id === idNormalizado);

  if (!centro) {
    return null;
  }

  let servicios = centro.servicios || [];

  // Filtrar por callcenter si se especifica
  if (callcenterFilter !== null) {
    servicios = servicios.filter(s => s.turno_callcenter === callcenterFilter);
  }

  return {
    centro: {
      id: centro.id,
      nombre: centro.nombre,
      direccion: centro.direccion,
      latitud: centro.latitud,
      longitud: centro.longitud
    },
    servicios: servicios,
    total: servicios.length,
    filtro_callcenter: callcenterFilter
  };
}

module.exports = {
  obtenerCenespPorId,
  obtenerTodosCenesp,
  obtenerServiciosCenesp
};
