/**
 * Exporta todos los middlewares
 */

const auth = require('./auth.middleware');
const logging = require('./logging.middleware');
const validation = require('./validation.middleware');
const timeout = require('./timeout.middleware');
const errorHandlers = require('./errorHandlers.middleware');

module.exports = {
  ...auth,
  ...logging,
  ...validation,
  ...timeout,
  ...errorHandlers,
};
