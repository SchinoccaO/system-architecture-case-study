/**
 * Constantes de configuración del servidor
 */

module.exports = {
  PORT: process.env.PORT || 3000,
  TIMEOUT_MS: 10000, // 10 segundos
  
  // Paginación
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 20,
  
  // Distancias
  DISTANCIA_MAXIMA_KM: 10,
  
  // Memoria
  MEMORY_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutos
  MEMORY_ALERT_THRESHOLD: 500 * 1024 * 1024, // 500MB
  
  // JWT — 30 días por diseño: API de consumidor único interno
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '30d',
  
  // Archivos de datos
  DATA_PATH: './data/servicios_unificados_full_final.json',
  AREAS_PATH: './data/areasredefinidas.json',
};
