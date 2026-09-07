/**
 * Servicio para operaciones con zonas geográficas
 * Maneja la lógica de filtrado y agrupación de centros por zona
 * 
 * Zonas calculadas a partir del centro geográfico de Córdoba:
 * - Centro: lat -31.413542, lon -64.178741
 * - Norte: centros al norte del centro geográfico
 * - Sur: centros al sur del centro geográfico
 * - Este: centros al este del centro geográfico
 * - Oeste: centros al oeste del centro geográfico
 */

const path = require('path');
const { DATA_PATH } = require('../config/constants');
const { formatoCentroCompleto } = require('../utils/formatters');
const { logger } = require('../logger');

/**
 * Error personalizado para centro no encontrado
 */
class CentroNoEncontradoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CentroNoEncontradoError';
  }
}

/**
 * Lista de zonas geográficas válidas
 */
const ZONAS_VALIDAS = ['norte', 'sur', 'este', 'oeste'];

/**
 * Carga los datos de servicios desde el archivo JSON
 * @returns {Object} Datos del archivo de servicios
 */
function cargarServicios() {
  try {
    const fullPath = path.resolve(DATA_PATH);
    delete require.cache[require.resolve(fullPath)];
    return require(fullPath);
  } catch (error) {
    logger.error('Error cargando servicios', { error: error.message, path: DATA_PATH });
    throw new Error('No se pudo cargar el archivo de servicios');
  }
}

/**
 * Obtiene todos los centros de salud con su zona geográfica
 * La zona geográfica ya está calculada en el JSON basándose en coordenadas GPS
 * respecto al centro geográfico de Córdoba
 * @returns {Array} Array de centros formateados con zona_geografica
 */
function obtenerCentrosConZona() {
  const data = cargarServicios();
  
  return data.centros_salud
    .filter(c => c.latitud && c.longitud && c.zona_geografica) // Solo centros con zona asignada
    .map(centro => {
      const centroFormateado = formatoCentroCompleto(centro);
      return {
        ...centroFormateado,
        zona_geografica: centro.zona_geografica.toLowerCase() // Asegurar minúsculas
      };
    });
}

/**
 * Lista todas las zonas geográficas disponibles con conteo de centros
 * @returns {Array} Array de zonas con información
 */
function listarZonas() {
  const centros = obtenerCentrosConZona();
  
  // Contar centros por zona
  const conteo = {};
  ZONAS_VALIDAS.forEach(zona => {
    conteo[zona] = centros.filter(c => c.zona_geografica === zona).length;
  });
  
  // Crear array de respuesta
  return ZONAS_VALIDAS
    .filter(zona => conteo[zona] > 0) // Solo zonas con centros
    .map(zona => ({
      zona,
      total_centros: conteo[zona]
    }));
}

/**
 * Obtiene centros de una zona geográfica específica
 * @param {string} zona - Zona geográfica (norte, sur, este, oeste, centro)
 * @param {Object} options - Opciones de paginación
 * @param {number} options.page - Número de página (opcional)
 * @param {number} options.limit - Centros por página (opcional, default 5, máx 20)
 * @returns {Object|Array} Objeto con datos paginados o array de centros si no hay paginación
 */
function obtenerCentrosPorZona(zona, options = {}) {
  const zonaLower = zona.toLowerCase();
  
  if (!ZONAS_VALIDAS.includes(zonaLower)) {
    throw new Error(`Zona inválida. Valores permitidos: ${ZONAS_VALIDAS.join(', ')}`);
  }
  
  const todosCentros = obtenerCentrosConZona();
  const centros = todosCentros.filter(c => c.zona_geografica === zonaLower);
  
  // Si no hay parámetros de paginación, devolver todo
  if (!options.page && !options.limit) {
    return {
      zona: zonaLower,
      total: centros.length,
      centros
    };
  }
  
  // Aplicar paginación
  const page = parseInt(options.page, 10) || 1;
  const limit = Math.min(parseInt(options.limit, 10) || 5, 20); // Máximo 20
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const centrosPaginados = centros.slice(startIndex, endIndex);
  const totalPaginas = Math.ceil(centros.length / limit);
  const hasMore = page < totalPaginas;
  
  return {
    zona: zonaLower,
    total: centros.length,
    pagina: page,
    limite: limit,
    totalPaginas,
    hasMore,
    siguientePagina: hasMore ? page + 1 : null,
    centros: centrosPaginados
  };
}

/**
 * Obtiene un centro específico de una zona geográfica
 * @param {string} zona - Zona geográfica
 * @param {string} nombreONumero - Nombre del centro o número (001, 01, 1)
 * @returns {Array} Array con el/los centros encontrados
 */
function obtenerCentroPorZonaYNombre(zona, nombreONumero) {
  const centros = obtenerCentrosPorZona(zona);
  
  // Normalizar la búsqueda (quitar espacios, guiones, minúsculas)
  const busquedaNorm = nombreONumero.toLowerCase().trim().replace(/[\s\-_]/g, '');
  
  // Filtrar centros que coincidan con el nombre o número
  const centrosEncontrados = centros.filter(c => {
    const nombreNorm = (c.nombre || '').toLowerCase().replace(/[\s\-_]/g, '');
    
    // Extraer número del ID (CS001 -> 001, CS01 -> 01)
    const numeroId = (c.id || '').replace(/^CS/i, '');
    
    // Normalizar números para comparación (001 y 01 y 1 son equivalentes)
    const numeroIdInt = parseInt(numeroId, 10);
    const busquedaInt = parseInt(busquedaNorm, 10);
    
    // Buscar coincidencia en nombre o número
    const coincideNombre = nombreNorm.includes(busquedaNorm);
    const coincideNumero = !isNaN(busquedaInt) && numeroIdInt === busquedaInt;
    
    return coincideNombre || coincideNumero;
  });
  
  // Si no se encuentra ningún centro, lanzar error
  if (centrosEncontrados.length === 0) {
    // Obtener lista de centros disponibles en la zona (primeros 5) con sus números
    const centrosDisponibles = centros
      .slice(0, 5)
      .map(c => {
        const numero = (c.id || '').replace(/^CS/i, '');
        return `${numero} - ${c.nombre}`;
      });
    
    throw new CentroNoEncontradoError(
      `No se encontró el centro "${nombreONumero}" en la zona ${zona}. ` +
      `Centros disponibles: ${centrosDisponibles.join(', ')}${centros.length > 5 ? '...' : ''}`
    );
  }
  
  return centrosEncontrados;
}

module.exports = {
  ZONAS_VALIDAS,
  listarZonas,
  obtenerCentrosPorZona,
  obtenerCentroPorZonaYNombre,
  CentroNoEncontradoError,
};
