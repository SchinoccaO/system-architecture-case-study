/**
 * Configuración de la aplicación Express
 * Copiado EXACTAMENTE del server.js original
 */

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const { logger, auditLogger } = require('./logger');
const { setupGlobalErrorHandlers, timeoutMiddleware, haltOnTimedout, timeoutErrorHandler, requestLogger } = require('./middlewares');
const { rateLimits } = require('./config');
const { buscarAreaPorCoordenada } = require('./utils');
const setupRoutes = require('./routes');

// Configurar handlers globales de errores
setupGlobalErrorHandlers();

const app = express();

// =====================================================
// TIMEOUT MIDDLEWARE
// =====================================================
// Timeout global de 10 segundos para prevenir requests colgados
app.use(timeoutMiddleware);

// Handler de timeout - debe ir después de app.use(timeout())
app.use(haltOnTimedout);

// Middleware para parsear JSON con encoding UTF-8
app.use(express.json({ charset: 'utf-8' }));

// HELMET - Headers de seguridad HTTP
app.use(helmet());

// CORS - Control de acceso por origen
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(',').map((o) => o.trim()) : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Sin origin = request directo (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Si hay origins configurados en .env, validar contra la lista
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origen no autorizado por CORS'));
        }
      } else {
        // Modo desarrollo: si no hay origins configurados, permitir localhost
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(new Error('CORS no configurado - contacte al administrador'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Comprimir respuestas con gzip para optimizar móviles
app.use(compression());

// MIDDLEWARE DE LOGGING ESTRUCTURADO
app.use(requestLogger);

// =====================================================
// RATE LIMITERS
// =====================================================
app.use(rateLimits.generalLimiter); // Protege TODOS los endpoints

// =====================================================
// MONTAR TODAS LAS RUTAS
// =====================================================
setupRoutes(app);

// =====================================================
// TIMEOUT ERROR HANDLER
// =====================================================
// Debe estar antes del handler global de errores
app.use(timeoutErrorHandler);

module.exports = app;
// Retrocompatibilidad: exportar `app` como propiedad y mantener exports de funciones
module.exports.app = app;
module.exports.buscarAreaPorCoordenado = buscarAreaPorCoordenada;
module.exports.buscarAreaPorCoordenada = buscarAreaPorCoordenada;
