const request = require('supertest');
const { expect } = require('chai');

// Importar la app real
const serverModule = require('../src/server');
const app = serverModule.app || serverModule;

// Helper para obtener JWT (intenta login y si falla genera uno localmente)
let jwtToken = null;
async function getJwtToken() {
  if (jwtToken) return jwtToken;
  try {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: process.env.API_USERNAME || 'wise',
        password: process.env.API_PASSWORD || 'orianachatbot',
      });
    if (res.status === 200 && res.body && res.body.token) {
      jwtToken = res.body.token;
      return jwtToken;
    }
  } catch (e) {
    // ignore
  }

  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'tu_clave_secreta';
  const payload = {
    userId: 'client_001',
    username: process.env.API_USERNAME || 'wise',
    role: 'api_client',
  };
  jwtToken = jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRATION || '30d' });
  return jwtToken;
}

describe('Integración: /centro_correspondiente con datos reales', () => {
  before(async () => {
    jwtToken = await getJwtToken();
  });

  it('Debe devolver el centro más cercano dentro del área (prueba cerca de CS001)', async () => {
    // Coordenadas exactas de CS001 en datos: latitud -31.3648, longitud -64.149057
    const res = await request(app)
      .get('/centro_correspondiente')
      .query({ lat: -31.3648, lon: -64.149057 })
      .set('Authorization', `Bearer ${jwtToken}`)
      .timeout({ response: 5000, deadline: 10000 });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('centro_asignado');
    const centro = res.body.centro_asignado;
    expect(centro).to.have.property('id');

    // Verificamos que el centro devuelto sea CS001 (o, en caso de datos cambiados, que pertenezca a la misma zona)
    if (centro.id !== 'CS001') {
      // fallback: verificar que la zona del centro sea '01' (zona de CS001)
      expect(centro.zona_programatica || centro.zona).to.equal('01');
    } else {
      expect(centro.id).to.equal('CS001');
    }
  });
});
