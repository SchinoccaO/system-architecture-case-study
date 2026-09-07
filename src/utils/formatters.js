/**
 * Formateadores compartidos para centros de salud
 * Evita duplicación de código entre rutas
 */

/**
 * Formato reducido (LITE) para listados rápidos y mapas
 * Incluye información básica del centro con horarios y servicios
 */
function formatoCentroLite(c) {
  return {
    id: c.id,
    nombre: c.nombre,
    zona_programatica: c.zona_programatica,
    direccion: c.direccion,
    latitud: c.latitud,
    longitud: c.longitud,
    horarios: c.horarios || 'No especificado',
    servicios: Array.isArray(c.servicios) ? c.servicios.map((s) => s.nombre || '') : [],
  };
}

/**
 * Formato completo para listado general
 * Incluye todos los detalles del centro
 */
function formatoCentroCompleto(c) {
  const hasValidCoords = typeof c.latitud === 'number' && typeof c.longitud === 'number';
  
  // Generar URL de búsqueda en Maps que identifique el lugar
  let mapaUrl = null;
  if (hasValidCoords) {
    const nombreEncoded = encodeURIComponent(c.nombre + ', ' + c.direccion);
    mapaUrl = `https://maps.google.com/maps/search/${nombreEncoded}/@${c.latitud},${c.longitud},17z`;
  }
  
  return {
    id: c.id,
    nombre: c.nombre,
    direccion: c.direccion,
    zona_programatica: c.zona_programatica,
    zona_geografica: c.zona_geografica, // Preservar zona geográfica si existe
    coordenadas: hasValidCoords
      ? {
          latitud: c.latitud,
          longitud: c.longitud,
          validas: true,
        }
      : {
          latitud: null,
          longitud: null,
          validas: false,
        },
    servicios: c.servicios || [],
    horarios: c.horarios || 'No especificado',
    mapa_url: mapaUrl,
    area_programatica: c.area_programatica || {},
  };
}

/**
 * Formato reducido (LITE) para hospitales
 * Incluye información básica del hospital con horarios y servicios
 */
function formatoHospitalLite(h) {
  return {
    id: h.id,
    nombre: h.nombre,
    direccion: h.direccion,
    latitud: h.latitud,
    longitud: h.longitud,
    horarios: h.horarios || 'No especificado',
    servicios: Array.isArray(h.servicios) ? h.servicios.map((s) => s.nombre || '') : [],
  };
}

/**
 * Formato completo para hospitales
 * Incluye todos los detalles del hospital (sin validación de zona programática)
 */
function formatoHospitalCompleto(h) {
  const hasValidCoords = typeof h.latitud === 'number' && typeof h.longitud === 'number';
  
  // Generar URL de búsqueda en Maps que identifique el lugar
  let mapaUrl = null;
  if (hasValidCoords) {
    const nombreEncoded = encodeURIComponent(h.nombre + ', ' + h.direccion);
    mapaUrl = `https://maps.google.com/maps/search/${nombreEncoded}/@${h.latitud},${h.longitud},17z`;
  }
  
  return {
    id: h.id,
    nombre: h.nombre,
    direccion: h.direccion,
    zona_programatica: h.zona_programatica,
    coordenadas: hasValidCoords
      ? {
          latitud: h.latitud,
          longitud: h.longitud,
          validas: true,
        }
      : {
          latitud: null,
          longitud: null,
          validas: false,
        },
    servicios: h.servicios || [],
    horarios: h.horarios || 'No especificado',
    mapa_url: mapaUrl,
    area_programatica: h.area_programatica || {},
  };
}

/**
 * Formato simplificado para HPA (Hospitales de Pronta Atención)
 * Optimizado para listar HPA con información esencial
 * Nota: Solo hay 4 HPA, por lo que no se requiere formato lite/completo
 */
function formatoHPA(hpa) {
  const hasValidCoords = typeof hpa.latitud === 'number' && typeof hpa.longitud === 'number';
  
  // Limpiar nombre (quitar "Centro de Salud" del inicio si existe)
  const nombreLimpio = hpa.nombre.replace(/^Centro de Salud\s+/i, '');
  
  // Generar URL de búsqueda en Maps que identifique el lugar
  let mapaUrl = null;
  if (hasValidCoords) {
    const nombreEncoded = encodeURIComponent(nombreLimpio + ', ' + hpa.direccion);
    mapaUrl = `https://maps.google.com/maps/search/${nombreEncoded}/@${hpa.latitud},${hpa.longitud},17z`;
  }
  
  return {
    id: hpa.id,
    nombre: nombreLimpio,
    direccion: hpa.direccion,
    coordenadas: hasValidCoords
      ? {
          latitud: hpa.latitud,
          longitud: hpa.longitud,
          validas: true,
        }
      : {
          latitud: null,
          longitud: null,
          validas: false,
        },
    area_programatica: hpa.area_programatica || {},
    servicios: Array.isArray(hpa.servicios) ? hpa.servicios.map((s) => s.nombre || '') : [],
    horarios: hpa.horarios || 'Disponible las 24 horas los 365 días del año.',
    mapa_url: mapaUrl,
  };
}

/**
 * Formato reducido (LITE) para Centros Especializados
 * Sin servicios, solo información de ubicación
 */
function formatoCenespLite(centro) {
  return {
    id: centro.id,
    nombre: centro.nombre,
    direccion: centro.direccion,
    latitud: centro.latitud,
    longitud: centro.longitud,
    telefono: centro.telefono || 'No especificado',
    horarios: centro.horarios || 'No especificado',
    mapa_url: centro.mapa_url || null
  };
}

/**
 * Formato completo para Centros Especializados
 * Incluye todos los servicios y mapa_url
 */
function formatoCenespCompleto(centro) {
  return {
    id: centro.id,
    nombre: centro.nombre,
    direccion: centro.direccion,
    latitud: centro.latitud,
    longitud: centro.longitud,
    telefono: centro.telefono || 'No especificado',
    horarios: centro.horarios || 'No especificado',
    servicios: centro.servicios || [],
    mapa_url: centro.mapa_url || null
  };
}

/**
 * Formato reducido (LITE) para Direcciones de Especialidades Médicas (DEM)
 * Sin servicios, solo información de ubicación
 */
function formatoDEMLite(dem) {
  const hasValidCoords = typeof dem.latitud === 'number' && typeof dem.longitud === 'number';
  
  // Generar URL de búsqueda en Maps que identifique el lugar
  let mapaUrl = null;
  if (hasValidCoords) {
    const nombreEncoded = encodeURIComponent(dem.nombre + ', ' + dem.direccion);
    mapaUrl = `https://maps.google.com/maps/search/${nombreEncoded}/@${dem.latitud},${dem.longitud},17z`;
  }
  
  return {
    id: dem.id,
    nombre: dem.nombre,
    direccion: dem.direccion,
    latitud: dem.latitud,
    longitud: dem.longitud,
    horarios: dem.horarios || 'No especificado',
    mapa_url: mapaUrl
  };
}

/**
 * Formato completo para Direcciones de Especialidades Médicas (DEM)
 * Incluye todos los servicios y mapa_url
 */
function formatoDEMCompleto(dem) {
  const hasValidCoords = typeof dem.latitud === 'number' && typeof dem.longitud === 'number';
  
  // Generar URL de búsqueda en Maps que identifique el lugar
  let mapaUrl = null;
  if (hasValidCoords) {
    const nombreEncoded = encodeURIComponent(dem.nombre + ', ' + dem.direccion);
    mapaUrl = `https://maps.google.com/maps/search/${nombreEncoded}/@${dem.latitud},${dem.longitud},17z`;
  }
  
  return {
    id: dem.id,
    nombre: dem.nombre,
    direccion: dem.direccion,
    latitud: dem.latitud,
    longitud: dem.longitud,
    horarios: dem.horarios || 'No especificado',
    zona_programatica: dem.zona_programatica,
    area_programatica: dem.area_programatica || {},
    servicios: dem.servicios || [],
    mapa_url: mapaUrl
  };
}

module.exports = {
  formatoCentroLite,
  formatoCentroCompleto,
  formatoHospitalLite,
  formatoHospitalCompleto,
  formatoHPA,
  formatoDEMLite,
  formatoDEMCompleto,
  formatoCenespLite,
  formatoCenespCompleto,
};
