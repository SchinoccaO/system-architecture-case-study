/**
 * Servicio para filtrado de centros por zona programática
 * La zona programática es un atributo numérico del centro (ej: "01", "02", ...)
 */

const data = require('../../data/servicios_unificados_full_final.json');
const { formatoCentroCompleto } = require('../utils/formatters');

/**
 * Lista todas las zonas programáticas disponibles con conteo de centros
 * @returns {Array} Array de zonas con su total de centros
 */
function listarZonasProgramaticas() {
  const conteo = {};

  data.centros_salud.forEach((c) => {
    if (c.zona_programatica) {
      const zona = String(c.zona_programatica);
      conteo[zona] = (conteo[zona] || 0) + 1;
    }
  });

  return Object.keys(conteo)
    .sort()
    .map((zona) => ({
      zona_programatica: zona,
      total_centros: conteo[zona],
    }));
}

/**
 * Obtiene todos los centros de una zona programática específica
 * @param {string} zona - Código de zona programática (ej: "01", "1")
 * @param {Object} options - Opciones de paginación
 * @param {number} options.page - Número de página (opcional)
 * @param {number} options.limit - Centros por página (opcional, default 10, máx 20)
 * @returns {Object} Resultado con centros y metadatos
 */
function obtenerCentrosPorZonaProgramatica(zona, options = {}) {
  // Normalizar: "1" -> "01", "2" -> "02", etc.
  const zonaNorm = String(zona).padStart(2, '0');

  const centros = data.centros_salud
    .filter((c) => String(c.zona_programatica) === zonaNorm)
    .map(formatoCentroCompleto);

  if (centros.length === 0) {
    const zonasDisponibles = listarZonasProgramaticas().map((z) => z.zona_programatica);
    const error = new Error(
      `Zona programática "${zonaNorm}" no encontrada. Zonas disponibles: ${zonasDisponibles.join(', ')}`
    );
    error.statusCode = 404;
    throw error;
  }

  // Sin paginación → devolver todo
  if (!options.page && !options.limit) {
    return {
      zona_programatica: zonaNorm,
      total: centros.length,
      centros,
    };
  }

  // Con paginación
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(options.limit, 10) || 10));
  const totalPaginas = Math.ceil(centros.length / limit);
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    zona_programatica: zonaNorm,
    total: centros.length,
    pagina: page,
    limite: limit,
    totalPaginas,
    siguientePagina: page < totalPaginas ? page + 1 : null,
    centros: centros.slice(start, end),
  };
}

module.exports = {
  listarZonasProgramaticas,
  obtenerCentrosPorZonaProgramatica,
};
