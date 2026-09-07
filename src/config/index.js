/**
 * Centraliza toda la configuración del servidor
 */

const constants = require('./constants');
const security = require('./security');
const rateLimits = require('./rateLimits');

module.exports = {
  ...constants,
  security,
  rateLimits,
};
