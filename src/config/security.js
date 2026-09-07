/**
 * Validaciones de seguridad al iniciar el servidor
 * Este archivo se ejecuta antes de inicializar Express
 */

// Validar credenciales obligatorias — sin excepciones por NODE_ENV.
// Los tests deben tener un .env configurado con valores explícitos.
if (!process.env.API_USERNAME || !process.env.API_PASSWORD) {
  throw new Error('API_USERNAME y API_PASSWORD son obligatorias en .env');
}

// Validar complejidad de password
if (process.env.API_PASSWORD.length < 12) {
  throw new Error('❌ SECURITY ERROR: API_PASSWORD debe tener al menos 12 caracteres');
}

const hasUpper = /[A-Z]/.test(process.env.API_PASSWORD);
const hasLower = /[a-z]/.test(process.env.API_PASSWORD);
const hasNumber = /[0-9]/.test(process.env.API_PASSWORD);
const hasSpecial = /[^A-Za-z0-9]/.test(process.env.API_PASSWORD);

if (!hasUpper || !hasLower || !hasNumber) {
  console.warn('⚠️  SECURITY WARNING: API_PASSWORD débil (falta mayúsculas, minúsculas o números)');
}

if (!hasSpecial && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  SECURITY WARNING: API_PASSWORD sin caracteres especiales en PRODUCCIÓN');
}

// Validar configuración JWT
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en .env');
}

// Validar credenciales API externa Wise
if (!process.env.WISE_USERNAME || !process.env.WISE_PASSWORD) {
  throw new Error('WISE_USERNAME y WISE_PASSWORD son obligatorias en .env');
}

module.exports = {
  validUsername: process.env.API_USERNAME,
  validPassword: process.env.API_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
  wiseUsername: process.env.WISE_USERNAME,
  wisePassword: process.env.WISE_PASSWORD,
};
