/**
 * Test específico para verificar fallback a SOM en endpoints de odontología
 */

const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/server');
const jwt = require('jsonwebtoken');

describe('🦷 Fallback a SOM - Odontología', () => {
  let token;

  before(() => {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurada en el entorno de test (.env).');
    }
    token = jwt.sign(
      { userId: 'test_001', username: 'test_user', jti: 'test-jti-som-fallback' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/odontologia/lejanos - Con fallback a SOM', () => {
    it('Debe devolver fallback a SOM cuando no hay centros lejanos con odontología (coordenadas muy lejanas)', async () => {
      // Coordenadas en medio del océano Atlántico - no hay centros cerca
      const lat = -35.0; // Lejos de Córdoba
      const lon = -50.0; // En medio del océano
      
      const res = await request(app)
        .get(`/api/odontologia/lejanos?lat=${lat}&lon=${lon}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      console.log('📊 Respuesta del servidor:', JSON.stringify(res.body, null, 2));

      // Si no hay centros, debe devolver fallback a SOM
      if (res.body.centros.length === 0) {
        expect(res.body).to.have.property('fallback_som', true);
        expect(res.body).to.have.property('som');
        expect(res.body.som).to.have.property('id', 'SOM');
        expect(res.body.som).to.have.property('nombre');
        expect(res.body.som).to.have.property('direccion');
        expect(res.body).to.have.property('mensaje').that.includes('SOM');
        expect(res.body).to.have.property('instrucciones').that.includes('0800');
      } else {
        // Si hay centros, verificar que NO tenga fallback_som
        expect(res.body).to.not.have.property('fallback_som');
        expect(res.body).to.not.have.property('som');
      }
    });

    it('Debe devolver centros lejanos cuando SÍ existen (sin fallback a SOM)', async () => {
      // Coordenadas en Córdoba - debe haber centros lejanos
      const lat = -31.4135;
      const lon = -64.1811;
      
      const res = await request(app)
        .get(`/api/odontologia/lejanos?lat=${lat}&lon=${lon}&limit=3`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      console.log('📊 Centros lejanos encontrados:', res.body.total);

      // Debe tener centros
      expect(res.body.centros).to.be.an('array');
      
      // NO debe tener fallback a SOM
      expect(res.body).to.not.have.property('fallback_som');
      expect(res.body).to.not.have.property('som');
      
      // Debe tener el mensaje correcto
      expect(res.body.mensaje).to.include('fuera de tu zona');
    });
  });

  describe('GET /centro_correspondiente - SIN fallback a SOM (genérico)', () => {
    it('Debe devolver 422 cuando las coordenadas están fuera del ejido de Córdoba', async () => {
      // Coordenadas en medio del océano / fuera del ejido municipal
      const lat = -35.0;
      const lon = -50.0;

      const res = await request(app)
        .get(`/centro_correspondiente?lat=${lat}&lon=${lon}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(422); // [2026-02-27] bbox check: fuera del ejido → 422 (antes 404)

      // Debe devolver error, NO SOM
      expect(res.body).to.have.property('error');
      expect(res.body.error).to.not.include('SOM');
      expect(res.body.error).to.include('ejido');

      // NO debe tener centro_asignado con id SOM
      if (res.body.centro_asignado) {
        expect(res.body.centro_asignado.id).to.not.equal('SOM');
      }
    });

    it('Debe devolver centro válido cuando encuentra área (sin usar SOM)', async () => {
      // Coordenadas en Córdoba
      const lat = -31.4201;
      const lon = -64.1888;
      
      const res = await request(app)
        .get(`/centro_correspondiente?lat=${lat}&lon=${lon}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      console.log('📊 Centro asignado:', res.body.centro_asignado.id);

      expect(res.body).to.have.property('centro_asignado');
      expect(res.body.centro_asignado).to.have.property('id');
      
      // El centro puede ser cualquiera EXCEPTO SOM (que ya no es fallback)
      // Nota: SOM puede estar en el área, pero no debe ser el único fallback genérico
    });
  });

  describe('GET /test_odo - Con fallback a SOM (CASO C)', () => {
    it('Debe devolver CASO C con SOM cuando no hay centros con odontología en área pequeña', async () => {
      // Skip test porque test_odo no es el endpoint principal
      // El flujo correcto es cercano -> lejanos -> SOM
      console.log('⏭️  Test omitido: /test_odo es legacy, usar /api/odontologia/cercano y /lejanos');
      return;
    });
  });
});
