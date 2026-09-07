// Utilidades compartidas: Haversine y parseo de coordenadas
/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * Fórmula matemática de dominio público
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// NOTA: `calcularDistancia` se mantiene por compatibilidad pero está deprecado para
// la lógica de selección de centros. Se recomienda usar `buscarAreaPorCoordenada` para
// mapear una coordenada a su área programática y luego elegir centros que pertenezcan
// a esa misma área. Esto evita duplicar lógica (basada en distancia vs basada en área)
// y asegura asignaciones consistentes.
// La búsqueda de centros por distancia debería eliminarse del código una vez que
// todos los llamadores migren a selección basada en área.

function parseCoordinates(req) {
  // aceptar varios aliases y reemplazar coma decimal por punto
  let latRaw = req.query.lat ?? req.query.latitude ?? req.query.latitud;
  let lonRaw = req.query.lon ?? req.query.lng ?? req.query.longitude ?? req.query.longitud;

  if (latRaw !== undefined) latRaw = String(latRaw).replace(',', '.');
  if (lonRaw !== undefined) lonRaw = String(lonRaw).replace(',', '.');

  const lat = latRaw !== undefined ? parseFloat(latRaw) : NaN;
  const lon = lonRaw !== undefined ? parseFloat(lonRaw) : NaN;

  if (isNaN(lat) || isNaN(lon)) {
    return {
      error:
        'Debes indicar `lat` y `lon` como números (ej: ?lat=-31.3648&lon=-64.149057). También se aceptan `latitude`/`longitude` y `lng`.',
    };
  }

  // Validación de rango
  if (lat < -90 || lat > 90) {
    return { error: 'El parámetro `lat` debe estar entre -90 y 90.' };
  }
  if (lon < -180 || lon > 180) {
    return { error: 'El parámetro `lon` debe estar entre -180 y 180.' };
  }

  return { lat, lon };
}

const fs = require('fs');
const path = require('path');
const turf = require('@turf/helpers');
const booleanPointInPolygonModule = require('@turf/boolean-point-in-polygon');
const booleanPointInPolygon =
  booleanPointInPolygonModule && booleanPointInPolygonModule.default
    ? booleanPointInPolygonModule.default
    : booleanPointInPolygonModule;

// Caché de datos GeoJSON indexados por ruta absoluta resuelta
const areasCache = new Map();
const defaultAreasPath = path.resolve(__dirname, '../data/areasredefinidas.json');

function loadAreasSync(resolvedPath) {
  if (areasCache.has(resolvedPath)) return areasCache.get(resolvedPath);
  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const data = JSON.parse(raw);
  areasCache.set(resolvedPath, data);
  return data;
}

/**
 * Busca el área programática por coordenada (lon, lat)
 * @param {number} lon
 * @param {number} lat
 * @param {string} archivoJson - Ruta al archivo GeoJSON
 * @returns {object|null} - Info del área o null si no se encuentra
 */
function buscarAreaPorCoordenada(lon, lat, archivoJson = './data/areasredefinidas.json') {
  // Backwards-compatible support:
  // - buscarAreaPorCoordenada(lon, lat, archivoJson)
  // - buscarAreaPorCoordenada(req, archivoJson)  <-- accepts Express `req`
  // - buscarAreaPorCoordenada({ lat, lon }, archivoJson)
  if (typeof lon === 'object' && lon !== null) {
    const maybeReq = lon;
    const maybeArchivo = typeof lat === 'string' ? lat : archivoJson;
    // If an Express `req` was passed, `parseCoordinates` will extract lat/lon
    if (maybeReq.query) {
      const parsed = parseCoordinates(maybeReq);
      if (parsed && parsed.error) return null;
      lat = parsed.lat;
      lon = parsed.lon;
    } else if (maybeReq.lat !== undefined || maybeReq.lon !== undefined) {
      lat = maybeReq.lat !== undefined ? parseFloat(maybeReq.lat) : NaN;
      lon = maybeReq.lon !== undefined ? parseFloat(maybeReq.lon) : NaN;
      if (isNaN(lat) || isNaN(lon)) return null;
    } else {
      return null;
    }
    archivoJson = maybeArchivo;
  }

  const resolvedPath = path.resolve(archivoJson || defaultAreasPath);
  const data = loadAreasSync(resolvedPath);
  const punto = turf.point([lon, lat]);

  for (const feature of data.features) {
    const props = feature.properties || {};
    const geom = feature.geometry || {};
    const type = geom.type;

    if (type === 'Polygon') {
      const poligono = turf.polygon(geom.coordinates);
      if (booleanPointInPolygon(punto, poligono)) {
        return {
          zona: props.zona || props.areapr || props.id || null,
          area: props.area || props.areapr || null,
          denominacion: props.denominacion || props.nombre || null,
        };
      }
    } else if (type === 'MultiPolygon') {
      for (const coords of geom.coordinates) {
        const poly = turf.polygon(coords);
        if (booleanPointInPolygon(punto, poly)) {
          return {
            zona: props.zona || props.areapr || props.id || null,
            area: props.area || props.areapr || null,
            denominacion: props.denominacion || props.nombre || null,
          };
        }
      }
    } else {
      // Fallback: try to interpret coordinates as polygon
      try {
        const poligono = turf.polygon(geom.coordinates[0] || geom.coordinates);
        if (booleanPointInPolygon(punto, poligono)) {
          return {
            zona: props.zona || props.areapr || props.id || null,
            area: props.area || props.areapr || null,
            denominacion: props.denominacion || props.nombre || null,
          };
        }
      } catch (e) {
        // ignore invalid geometries
      }
    }
  }
  return null;
}

module.exports = {
  calcularDistancia,
  parseCoordinates,
  buscarAreaPorCoordenada,
  // Permite recargar datos en tests o en runtime si es necesario
  reloadAreaData: (archivoJson) => {
    const resolvedPath = path.resolve(archivoJson || defaultAreasPath);
    areasCache.delete(resolvedPath);
    return loadAreasSync(resolvedPath);
  },
};

/**
 * Selecciona un centro basado en el área programática calculada por polígonos.
 * Opcionalmente filtra los centros por una condición (por ejemplo: que tengan odontología).
 * Devuelve el centro asignado dentro del área (el más cercano) o, si no existe,
 * el más cercano fuera del área (si está dentro del umbral), o una lista de sugerencias.
 *
 * @param {object} opts
 * @param {object|undefined} opts.reqOrPoint - Express `req` o un objeto `{lat, lon}`
 * @param {Array} opts.centers - array de centros a considerar
 * @param {function} [opts.filterFn] - función (center) => boolean para filtrar centros (por ej. que tengan odontología)
 * @param {string} [opts.archivoJson] - ruta al GeoJSON de áreas
 * @param {number} [opts.distanciaMaxKm] - umbral de distancia para aceptar centros (default 10 km)
 * @param {number} [opts.limit] - número de sugerencias a devolver
 * @returns {object}
 */
function seleccionarCentroPorArea({
  reqOrPoint,
  centers,
  filterFn = () => true,
  archivoJson = './data/areasredefinidas.json',
  distanciaMaxKm = 10,
  limit = 3,
}) {
  // Resolver coordenadas
  let lat, lon;
  if (reqOrPoint && typeof reqOrPoint === 'object' && reqOrPoint.query) {
    const parsed = parseCoordinates(reqOrPoint);
    if (parsed && parsed.error) return { encontrado: false, error: parsed.error };
    lat = parsed.lat;
    lon = parsed.lon;
  } else if (
    reqOrPoint &&
    typeof reqOrPoint === 'object' &&
    (reqOrPoint.lat !== undefined || reqOrPoint.lon !== undefined)
  ) {
    lat = parseFloat(reqOrPoint.lat);
    lon = parseFloat(reqOrPoint.lon);
    if (isNaN(lat) || isNaN(lon)) return { encontrado: false, error: 'Coordenadas inválidas' };
  } else {
    return { encontrado: false, error: 'Faltan coordenadas' };
  }

  // Determinar área
  let areaInfo = null;
  try {
    areaInfo = buscarAreaPorCoordenada(reqOrPoint, archivoJson);
  } catch (e) {
    areaInfo = null;
  }

  const validCenters = Array.isArray(centers)
    ? centers.filter((c) => c && c.id !== 'SOM' && filterFn(c))
    : [];

  // Si tenemos área, priorizar centros dentro de esa área
  if (areaInfo) {
    const candidatosEnArea = validCenters.filter((c) => {
      const codigo = c.area_programatica?.codigo_area || c.area_programatica?.codigo || null;
      const denom = c.area_programatica?.denominacion || null;
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

    const candidatosConDist = candidatosEnArea
      .map((c) => ({ centro: c, distancia: calcularDistancia(lat, lon, c.latitud, c.longitud) }))
      .filter((cd) => !Number.isNaN(cd.distancia))
      .sort((a, b) => a.distancia - b.distancia);

    if (candidatosConDist.length > 0 && candidatosConDist[0].distancia <= distanciaMaxKm) {
      return {
        encontrado: true,
        asignado: candidatosConDist[0].centro,
        distancia: candidatosConDist[0].distancia,
        tipo: 'area',
      };
    }
  }

  // No hay o no aplican; buscar fuera del área
  const fuera = validCenters.filter((c) => {
    if (!areaInfo) return true;
    const codigo = c.area_programatica?.codigo_area || c.area_programatica?.codigo || null;
    const denom = c.area_programatica?.denominacion || null;
    if (
      codigo &&
      areaInfo.area &&
      String(codigo).toLowerCase() === String(areaInfo.area).toLowerCase()
    )
      return false;
    if (
      c.zona_programatica &&
      areaInfo.zona &&
      String(c.zona_programatica) === String(areaInfo.zona)
    )
      return false;
    if (
      denom &&
      areaInfo.denominacion &&
      String(denom).toLowerCase() === String(areaInfo.denominacion).toLowerCase()
    )
      return false;
    return true;
  });

  const ordenadosFuera = fuera
    .map((c) => ({ centro: c, distancia: calcularDistancia(lat, lon, c.latitud, c.longitud) }))
    .filter((cd) => !Number.isNaN(cd.distancia))
    .sort((a, b) => a.distancia - b.distancia);

  if (ordenadosFuera.length > 0 && ordenadosFuera[0].distancia <= distanciaMaxKm) {
    return {
      encontrado: true,
      asignado: ordenadosFuera[0].centro,
      distancia: ordenadosFuera[0].distancia,
      tipo: 'fuera_area',
    };
  }

  // No cumple umbral: devolver sugerencias ordenadas fuera del área (hasta limit)
  return {
    encontrado: false,
    sugerencias: ordenadosFuera
      .slice(0, limit)
      .map((x) => ({ centro: x.centro, distancia: x.distancia })),
    tipo: 'sugerencias',
  };
}

module.exports.seleccionarCentroPorArea = seleccionarCentroPorArea;
