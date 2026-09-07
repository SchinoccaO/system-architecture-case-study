/**
 * Exporta todos los servicios
 */

const authService = require('./auth.service');
const areaService = require('./area.service');
const centroSelectionService = require('./centroSelection.service');

module.exports = {
  authService,
  areaService,
  centroSelectionService,
};
