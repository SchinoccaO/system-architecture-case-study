const request = require('supertest');
const { expect } = require('chai');


const app = require('../src/server');


// Definir credenciales reales de entorno para todos los tests (scope global, solo una vez)
const username = process.env.API_USERNAME;
const password = process.env.API_PASSWORD;

describe('🔐 Autenticación JWT', () => {

    describe('POST /api/auth/login', () => {
    // ...existing code...
        it('Debería generar token JWT con credenciales correctas', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username, password })
                .expect(200);

            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('token');
            expect(res.body.token).to.be.a('string');
            expect(res.body.token.length).to.be.greaterThan(50);
            expect(res.body).to.have.property('expiresIn', process.env.JWT_EXPIRATION || '30d');
            expect(res.body).to.have.property('message');
        });

        it('Debería rechazar credenciales incorrectas', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'wrong', password: 'wrong' })
                .expect(401);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'INVALID_CREDENTIALS');
            expect(res.body.error).to.have.property('message');
        });

        it('Debería rechazar request sin username', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password })
                .expect(400);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'MISSING_CREDENTIALS');
        });

        it('Debería rechazar request sin password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username })
                .expect(400);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'MISSING_CREDENTIALS');
        });

        it('Debería rechazar request sin body', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'MISSING_CREDENTIALS');
        });
    });

    describe('Endpoints protegidos con JWT', () => {

        let validToken = null;

        before(async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username, password });
            validToken = res.body.token;
        });

        it('Debería permitir acceso con token válido', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body).to.have.property('total');
            expect(res.body).to.have.property('resultados');
        });

        it('Debería rechazar request sin token', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .expect(401);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'AUTH_REQUIRED');
            expect(res.body.error.message).to.include('Token JWT requerido');
        });

        it('Debería rechazar token inválido', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .set('Authorization', 'Bearer token_invalido_123')
                .expect(401);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'TOKEN_INVALID');
        });

        it('Debería rechazar token malformado (sin Bearer)', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .set('Authorization', validToken)
                .expect(401);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'AUTH_REQUIRED');
        });

        it('Debería rechazar header Authorization vacío', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .set('Authorization', '')
                .expect(401);

            expect(res.body).to.have.property('success', false);
            expect(res.body.error).to.have.property('code', 'AUTH_REQUIRED');
        });
    });

    describe('POST /api/auth/logout', () => {

        it('Debería invalidar el token y rechazar su uso posterior', async () => {
            // Obtener token fresco para este test
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ username, password });
            const tokenParaRevocar = loginRes.body.token;

            // Logout exitoso
            const logoutRes = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${tokenParaRevocar}`)
                .expect(200);

            expect(logoutRes.body).to.have.property('success', true);

            // El token revocado ya no debe servir para acceder a recursos
            const afterLogout = await request(app)
                .get('/centros_salud')
                .set('Authorization', `Bearer ${tokenParaRevocar}`)
                .expect(401);

            expect(afterLogout.body.error).to.have.property('code', 'TOKEN_REVOKED');
        });

        it('Debería rechazar logout sin token', async () => {
            await request(app)
                .post('/api/auth/logout')
                .expect(401);
        });
    });

    describe('Endpoints públicos (sin autenticación)', () => {

        it('/health no debería requerir autenticación', async () => {
            const res = await request(app)
                .get('/health')
                .expect(200);

            expect(res.body).to.have.property('status', 'ok');
        });

        it('/api/auth/login no debería requerir autenticación', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username, password })
                .expect(200);

            expect(res.body).to.have.property('token');
        });
    });

    describe('Validación de token JWT en múltiples endpoints', () => {

        let token = null;

        before(async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username, password });
            token = res.body.token;
        });

        it('Token válido en /test_odo', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: -31.4201, lon: -64.1888 })
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).to.have.property('caso');
        });

        it('Token válido en /centro_correspondiente', async () => {
            const res = await request(app)
                .get('/centro_correspondiente')
                .query({ lat: -31.4201, lon: -64.1888 })
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).to.have.property('centro_asignado');
        });

        it('Token válido en /centros_salud/:id', async () => {
            const res = await request(app)
                .get('/centros_salud/CS024')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).to.have.property('id', 'CS024');
        });

        it('Token válido en /centros_salud_mapa', async () => {
            const res = await request(app)
                .get('/centros_salud_mapa')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).to.be.an('array');
        });

        it('Token válido en /api/servicios_odontologicos/servicios', async () => {
            const res = await request(app)
                .get('/api/servicios_odontologicos/servicios')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).to.have.property('centro');
        });

        it('Token válido en /api/odontologia/cercano', async () => {
            const res = await request(app)
                .get('/api/odontologia/cercano')
                .query({ lat: -31.4201, lng: -64.1888 })
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).to.have.property('encontrado');
        });
    });
});
