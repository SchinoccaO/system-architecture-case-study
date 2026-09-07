/**
 * Índice de todas las rutas
 * Monta todos los routers en sus paths correspondientes
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const centrosRoutes = require('./centros.routes');
const hospitalesRoutes = require('./hospitales.routes');
const hpaRoutes = require('./hpa.routes');
const areaRoutes = require('./area.routes');
const odontologiaRoutes = require('./odontologia.routes');
const somRoutes = require('./som.routes');
const adminRoutes = require('./admin.routes');
const zonaRoutes = require('./zona.routes');
const demRoutes = require('./dem.routes');
const cenespRoutes = require('./cenesp.routes');
const zonaProgramaticaRoutes = require('./zonaProgramatica.routes');
const cuilRoutes = require('./cuil.routes');

function setupRoutes(app) {
  // Health y debug (raíz)
  app.use('/', healthRoutes);

  // Autenticación
  app.use('/api/auth', authRoutes);

  // Centros de salud
  app.use('/centros_salud', centrosRoutes);

  // Filtrado por zonas geográficas
  app.use('/api/centros', zonaRoutes);

  // Hospitales municipales
  app.use('/hospitales', hospitalesRoutes);

  // Hospitales de Pronta Atención
  app.use('/api/hpa', hpaRoutes);

  // Direcciones de Especialidades Médicas (DEM)
  app.use('/dem', demRoutes);

  // Centros Especializados
  app.use('/cenesp', cenespRoutes);

  // Áreas programáticas
  app.use('/', areaRoutes);

  // Odontología
  app.use('/api/odontologia', odontologiaRoutes);

  // Servicios especializados SOM
  app.use('/api/servicios_odontologicos', somRoutes);

  // Zonas programáticas
  app.use('/api/zonas_programaticas', zonaProgramaticaRoutes);

  // CUIL → Centro de salud asignado (integración API Wise)
  app.use('/api/cuil', cuilRoutes);

  // Admin
  app.use('/admin', adminRoutes);
}

module.exports = setupRoutes;
