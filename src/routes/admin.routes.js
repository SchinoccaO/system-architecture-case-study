/**
 * Rutas de administración
 * Copiado EXACTAMENTE del server.js original
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { adminAuthMiddleware } = require('../middlewares');
const { getMetrics } = require('../middlewares/logging.middleware');
const { reloadAreaData } = require('../utils');
const { auditLogger, logger } = require('../logger');
const { rateLimits } = require('../config');

// Único directorio permitido para cargar archivos de datos.
// path.resolve garantiza una ruta absoluta canónica en tiempo de arranque.
const ALLOWED_DATA_DIR = path.resolve(__dirname, '../../data');

// =====================================================
// ENDPOINT: MÉTRICAS DEL SISTEMA (P1.4)
// =====================================================
router.get('/metrics', adminAuthMiddleware, (req, res) => {
  try {
    const metrics = getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error al obtener métricas', { error: error.message });
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

// ============================================================
// ENDPOINT ADMIN: Recargar GeoJSON de áreas programáticas
// Seguridad: X-ADMIN-KEY === AREA_RELOAD_SECRET OR JWT with role 'admin'
// ============================================================
router.post('/reload_areas', adminAuthMiddleware, rateLimits.adminLimiter, express.json(), (req, res) => {
  const archivoRaw = req.body?.archivo || req.query?.archivo || './data/areasredefinidas.json';

  // ── Defensa contra Path Traversal ───────────────────────────────────────
  // Paso 1: decodificar cualquier disfraz URL-encoded (%2e%2e%2f, etc.)
  //         antes de normalizar, para que path.resolve vea la ruta real.
  let archivoDecoded;
  try {
    archivoDecoded = decodeURIComponent(String(archivoRaw));
  } catch (_) {
    auditLogger.warn('Admin reload: ruta con encoding inválido', { ip: req.ip, archivo: archivoRaw });
    return res.status(400).json({ success: false, error: { code: 'INVALID_PATH', message: 'Ruta invalida' } });
  }

  // Paso 2: resolver a ruta absoluta canónica — path.resolve normaliza
  //         automáticamente `..`, `.`, barras duplicadas y backslashes.
  const resolvedPath = path.resolve(archivoDecoded);

  // Paso 3: whitelist — la ruta resuelta debe estar DENTRO del directorio
  //         de datos autorizado. El separador al final evita que
  //         "/app/data-extra/malicious" pase el check de prefijo.
  if (!resolvedPath.startsWith(ALLOWED_DATA_DIR + path.sep)) {
    auditLogger.warn('Admin reload: ruta fuera del directorio permitido', {
      ip: req.ip,
      archivoRaw,
      resolvedPath,
      allowedDir: ALLOWED_DATA_DIR,
    });
    return res.status(400).json({ success: false, error: { code: 'INVALID_PATH', message: 'Ruta invalida' } });
  }
  // ────────────────────────────────────────────────────────────────────────

  try {
    const reloaded = reloadAreaData(resolvedPath);
    auditLogger.info('Areas reloaded by admin', {
      user: req.user?.username || null,
      ip: req.ip,
      archivo: resolvedPath,
      features: reloaded?.features?.length || 0,
    });
    return res.json({
      success: true,
      archivo: resolvedPath,
      features: reloaded?.features?.length || 0,
    });
  } catch (err) {
    auditLogger.error('Error reloading areas', { ip: req.ip, error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'RELOAD_ERROR', message: 'Error recargando archivo' },
    });
  }
});

module.exports = router;
