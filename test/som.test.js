const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/server');

// ====================================================
// JWT AUTHENTICATION HELPER
// ====================================================
let jwtToken = null;

// Función para obtener token JWT antes de cada suite de tests
async function getJwtToken() {
    if (jwtToken) return jwtToken;
    
    const username = process.env.API_USERNAME;
    const password = process.env.API_PASSWORD;
    const res = await request(app)
        .post('/api/auth/login')
        .send({ username, password });
    
    if (res.status !== 200 || !res.body.token) {
        throw new Error('No se pudo obtener token JWT para tests');
    }
    
    jwtToken = res.body.token;
    return jwtToken;
}

describe('🦷 API SOM - Servicios Odontológicos Especializados', () => {

    // Obtener token JWT antes de todos los tests
    before(async () => {
        jwtToken = await getJwtToken();
    });

    describe('GET /api/servicios_odontologicos/servicios', () => {

        it('Debería devolver estructura completa', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body).to.have.property('centro');
            expect(res.body).to.have.property('servicios_especializados');
            expect(res.body).to.have.property('instrucciones');
            expect(res.body).to.have.property('total_servicios');
        });

        it('Debe devolver exactamente 10 servicios', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body.servicios_especializados).to.be.an('array');
            expect(res.body.servicios_especializados.length).to.equal(10);
            expect(res.body.total_servicios).to.equal(10);
        });

        it('Centro debe tener datos correctos', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body.centro.id).to.equal('SOM');
            expect(res.body.centro.nombre).to.equal('Servicio Odontológico Municipal');
            expect(res.body.centro.direccion).to.equal('San Martin 850');
        });

        it('Cada servicio debe ser presencial', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            res.body.servicios_especializados.forEach(servicio => {
                expect(servicio.turno_callcenter).to.be.false;
                expect(servicio.presencial).to.be.true;
            });
        });

        it('Instrucciones deben tener 4 pasos', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body.instrucciones).to.have.property('paso_1');
            expect(res.body.instrucciones).to.have.property('paso_2');
            expect(res.body.instrucciones).to.have.property('paso_3');
            expect(res.body.instrucciones).to.have.property('paso_4');
        });

        it('Coordenadas deben ser válidas', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${jwtToken}`)
                .expect(200);

            expect(res.body.centro.coordenadas.latitud).to.be.closeTo(-31.40658168, 0.001);
            expect(res.body.centro.coordenadas.longitud).to.be.closeTo(-64.17990714, 0.001);
        });
    });
});