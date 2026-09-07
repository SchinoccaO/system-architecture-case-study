/**
 * Servicio de blacklist de tokens JWT.
 *
 * Permite invalidar tokens individuales en el logout sin necesidad de
 * una base de datos. Los tokens revocados se almacenan en memoria indexados
 * por su `jti` (JWT ID) hasta que expiran naturalmente.
 *
 * Limitación conocida: la blacklist no sobrevive reinicios del proceso.
 * Para producción multi-instancia se debería reemplazar el Map por Redis.
 */

// Map<jti: string, expiresAt: number (epoch ms)>
const blacklist = new Map();

/**
 * Purga entradas ya expiradas para evitar que el Map crezca indefinidamente.
 * .unref() evita que el intervalo mantenga el proceso vivo en tests/CI.
 */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [jti, expiresAt] of blacklist) {
    if (expiresAt <= now) blacklist.delete(jti);
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Agrega un token a la blacklist hasta su fecha de expiración.
 * @param {string} jti   - JWT ID único del token
 * @param {number} exp   - Timestamp de expiración del token (segundos, del claim `exp`)
 */
function blacklistToken(jti, exp) {
  if (!jti || !exp) return;
  blacklist.set(jti, exp * 1000); // exp está en segundos; convertir a ms
}

/**
 * Verifica si un token está en la blacklist y sigue vigente.
 * @param {string|undefined} jti
 * @returns {boolean}
 */
function isBlacklisted(jti) {
  if (!jti) return false;
  if (!blacklist.has(jti)) return false;

  // Belt-and-suspenders: si ya expiró, limpiar y reportar como no-revocado
  if (blacklist.get(jti) <= Date.now()) {
    blacklist.delete(jti);
    return false;
  }
  return true;
}

module.exports = { blacklistToken, isBlacklisted };
