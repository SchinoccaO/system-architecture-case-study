/**
 * Gestor de token para la API externa Wise (portal salud Córdoba)
 *
 * Patrón: Singleton con reintento automático ante 401.
 * - El token vive en memoria del proceso.
 * - No se persiste en disco ni en .env (las credenciales sí están en .env).
 * - Ante un 401, refresca automáticamente y reintenta una vez.
 */

const https = require('https');
const { security } = require('../config');
const { logger } = require('../logger');

const WISE_BASE_URL = 'bus-io.portalsalud.cordoba.gob.ar';
const WISE_LOGIN_PATH = '/ct/login';
const WISE_CUIL_PATH = '/api/getPersonDataByCuil';

// Token almacenado en memoria — se renueva automáticamente ante 401
let _token = null;

/**
 * Realiza una solicitud HTTPS a la API Wise.
 * @param {Object} options - Opciones para https.request
 * @param {string|null} body - Body JSON serializado (para POST)
 * @returns {Promise<{statusCode: number, data: any}>}
 */
function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ statusCode: res.statusCode, data: raw });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Timeout al conectar con API Wise'));
    });

    if (body) req.write(body);
    req.end();
  });
}

/**
 * Autentica contra la API Wise y actualiza el token en memoria.
 * @returns {Promise<string>} Token actualizado
 * @throws {Error} Si las credenciales son rechazadas
 */
async function login() {
  logger.info('WiseToken: iniciando autenticación con API Wise');

  const body = JSON.stringify({
    username: security.wiseUsername,
    password: security.wisePassword,
  });

  const options = {
    hostname: WISE_BASE_URL,
    path: WISE_LOGIN_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'Mozilla/5.0',
    },
  };

  const { statusCode, data } = await httpsRequest(options, body);

  if (statusCode !== 200) {
    logger.error('WiseToken: fallo de autenticación', { statusCode, data });
    throw new Error(`Autenticación Wise fallida (HTTP ${statusCode})`);
  }

  // La API Wise devuelve { access_token: "eyJ...", token_type: "bearer" }
  const token = data?.access_token;
  if (!token) {
    logger.error('WiseToken: respuesta sin token', { data });
    throw new Error('API Wise no devolvió token en la respuesta de login');
  }

  _token = token;
  logger.info('WiseToken: token actualizado correctamente');
  return _token;
}

/**
 * Devuelve el token actual. Si no hay token en memoria, hace login primero.
 * @returns {Promise<string>}
 */
async function getToken() {
  if (!_token) {
    await login();
  }
  return _token;
}

/**
 * Llama a la API Wise con reintento automático ante 401.
 * En el primer 401: refresca el token y reintenta una vez más.
 *
 * @param {Function} fn - async (token) => { statusCode, data }
 * @returns {Promise<any>} data de la respuesta exitosa
 * @throws {Error} Si falla después del reintento
 */
async function callWithRetry(fn) {
  let token = await getToken();
  let result = await fn(token);

  if (result.statusCode === 401) {
    logger.warn('WiseToken: 401 recibido, refrescando token y reintentando');
    token = await login();
    result = await fn(token);
  }

  if (result.statusCode !== 200) {
    throw new Error(`API Wise respondió HTTP ${result.statusCode}: ${JSON.stringify(result.data)}`);
  }

  return result.data;
}

/**
 * Consulta los datos de una persona por CUIL.
 * @param {string} cuil - CUIL del paciente
 * @returns {Promise<Object>} Datos completos devueltos por la API Wise
 */
async function getPersonDataByCuil(cuil) {
  return callWithRetry((token) => {
    const options = {
      hostname: WISE_BASE_URL,
      path: `${WISE_CUIL_PATH}?cuil=${encodeURIComponent(cuil)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    };
    return httpsRequest(options);
  });
}

module.exports = {
  getPersonDataByCuil,
};
