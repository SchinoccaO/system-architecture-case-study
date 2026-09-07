/**
 * Middlewares de validación de datos
 */

const { parseCoordinates } = require('../utils');

/**
 * Middleware para validar coordenadas en query params
 * Valida que lat/lon sean números válidos y estén en rangos correctos
 */
function validateCoordinates(req, res, next) {
  const coords = parseCoordinates(req);
  
  if (coords.error) {
    return res.status(400).json({ 
      success: false,
      error: {
        code: 'INVALID_COORDINATES',
        message: coords.error 
      }
    });
  }
  
  // Agregar coordenadas validadas al request
  req.coords = coords;
  next();
}

module.exports = {
  validateCoordinates,
};
