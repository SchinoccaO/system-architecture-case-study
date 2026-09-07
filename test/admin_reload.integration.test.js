const { expect } = require('chai');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
// path not required in this integration test

describe('POST /admin/reload_areas (integration)', () => {
  const agent = request(app);
  const archivo = './data/areasredefinidas.json';

  // AREA_RELOAD_SECRET debe estar configurada explícitamente en .env.
  // Jamás debe asignarse aquí un fallback predecible: si falta, el test
  // falla ruidosamente para que el problema de configuración sea visible.
  before(function () {
    if (!process.env.AREA_RELOAD_SECRET) {
      throw new Error(
        'AREA_RELOAD_SECRET no está configurada en el entorno de test (.env). ' +
        'Agrega la variable con un valor secreto antes de ejecutar esta suite.'
      );
    }
  });

  it('should reject without admin credentials', async () => {
    const res = await agent.post('/admin/reload_areas').send({ archivo });
    expect(res.status).to.be.oneOf([401, 400]);
  });

  it('should accept X-ADMIN-KEY header when AREA_RELOAD_SECRET matches', async () => {
    const res = await agent
      .post('/admin/reload_areas')
      .set('X-ADMIN-KEY', process.env.AREA_RELOAD_SECRET)
      .send({ archivo });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body).to.have.property('archivo');
    expect(res.body).to.have.property('features');
    expect(res.body.features).to.be.a('number');
  });

  it('should accept JWT with role admin', async () => {
    // craft an admin token
    const token = jwt.sign(
      { userId: 'admin_1', username: 'admin', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await agent
      .post('/admin/reload_areas')
      .set('Authorization', `Bearer ${token}`)
      .send({ archivo });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
  });
});
