const request = require('supertest');
const { expect } = require('chai');

// ✅ IMPORTAR LA APP REAL DE server.js
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

describe('🔗 INTEGRACIÓN COMPLETA - server.js REAL con datos REALES', () => {

    // Obtener token JWT antes de todos los tests
    before(async () => {
        jwtToken = await getJwtToken();
    });

    describe('GET /health - Health Check', () => {
        
        it('Debería responder que el servidor está OK (sin autenticación)', async () => {
            const res = await request(app)
                .get('/health');

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('status', 'ok');
            expect(res.body).to.have.property('version');
            expect(res.body.services).to.have.property('centros_salud', true);
            expect(res.body.metadata).to.have.property('total_centros');
            expect(res.body.metadata.total_centros).to.be.greaterThan(0);
        });
    });

    describe('GET /test_odo - Endpoint REAL de Odontología', () => {
        
        it('CASO A: Debería funcionar con coordenadas de Córdoba (cerca de Cupani)', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: -31.4201, lon: -64.1888 })
                .set('Authorization', `Bearer ${jwtToken}`);

            console.log('🔍 Respuesta del servidor REAL:', JSON.stringify(res.body, null, 2));

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('caso');
            expect(res.body.caso).to.be.oneOf(['A', 'B', 'C']);
            expect(res.body).to.have.property('centro');
            expect(res.body.centro).to.have.property('id');
            expect(res.body.centro).to.have.property('nombre');
            expect(res.body.centro).to.have.property('direccion');
            expect(res.body.centro).to.have.property('distancia');
            expect(res.body).to.have.property('instrucciones');
            expect(res.body.instrucciones).to.be.a('string');
        });

        it('CASO A específico: CS024 (Cupani) con callcenter', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: -31.4201, lon: -64.1888 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            
            // Cupani es el más cercano y tiene callcenter
            if (res.body.centro.id === 'CS024') {
                expect(res.body.caso).to.equal('A');
                expect(res.body.instrucciones).to.include('0800-888-5555');
            }
        });

        it('Debería encontrar algún centro cerca de Pueyrredon', async () => {
            // Coordenadas cerca del CS007 (Pueyrredon)
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: -31.3789, lon: -64.2445 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.caso).to.be.oneOf(['A', 'B', 'C']);
            expect(res.body.centro).to.have.property('id');
        });

        it('Validación RF7: Debería rechazar coordenadas inválidas (string)', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: 'invalid', lon: -64.1888 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('error');
        });

        it('Validación RF7: Debería rechazar sin coordenadas', async () => {
            const res = await request(app)
                .get('/test_odo')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('error');
        });

        it('Validación RF7: Debería rechazar latitud fuera de rango', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: 95, lon: -64.1888 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(400);
            expect(res.body.error).to.include('lat');
        });

        it('Validación RF7: Debería rechazar longitud fuera de rango', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: -31.4201, lon: 200 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(400);
            expect(res.body.error).to.include('lon');
        });

        it('Debería aceptar aliases de coordenadas (latitude/longitude)', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ latitude: -31.4201, longitude: -64.1888 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('caso');
        });

        it('Debería aceptar comas decimales (formato europeo)', async () => {
            const res = await request(app)
                .get('/test_odo')
                .query({ lat: '-31,4201', lon: '-64,1888' })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('caso');
        });
    });

    describe('GET /centro_correspondiente - Centro Asignado Único', () => {
        
        it('Debería devolver UN centro asignado (no múltiples)', async () => {
            const res = await request(app)
                .get('/centro_correspondiente')
                .query({ lat: -31.4201, lon: -64.1888 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('centro_asignado');
            expect(res.body.centro_asignado).to.be.an('object');
            expect(res.body.centro_asignado).to.have.property('id');
            expect(res.body.centro_asignado).to.have.property('nombre');
            expect(res.body.centro_asignado).to.have.property('direccion');
            expect(res.body.centro_asignado).to.have.property('distancia');
            expect(res.body.centro_asignado).to.have.property('coordenadas');
            expect(res.body.centro_asignado).to.have.property('servicios');
            
            // NO debe tener campo "alternativas" (eliminado en refactor)
            expect(res.body).to.not.have.property('alternativas');
            expect(res.body).to.not.have.property('sugerencias');
        });

        it('Validación: Debería rechazar sin coordenadas', async () => {
            const res = await request(app)
                .get('/centro_correspondiente')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('error');
        });
    });

    describe('GET /centros_salud - Listado de Centros', () => {
        
        it('Sin paginación: Debería devolver TODOS los centros', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('total');
            expect(res.body).to.have.property('resultados');
            expect(res.body.resultados).to.be.an('array');
            expect(res.body.resultados.length).to.equal(res.body.total);
            expect(res.body.total).to.be.greaterThanOrEqual(100); // ✅ 101 centros en total
            expect(res.body.resultados.length).to.be.greaterThanOrEqual(100); // ✅ CORREGIDO
        });

        it('Con paginación: Debería devolver 10 centros', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .query({ page: 1, limit: 10 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.resultados).to.be.an('array');
            expect(res.body.resultados.length).to.equal(10);
            expect(res.body).to.have.property('pagina', 1);
            expect(res.body).to.have.property('totalPaginas');
        });

        it('Con paginación: Página 2 debería devolver diferentes centros', async () => {
            const res1 = await request(app)
                .get('/centros_salud')
                .query({ page: 1, limit: 5 })
                .set('Authorization', `Bearer ${jwtToken}`);
            
            const res2 = await request(app)
                .get('/centros_salud')
                .query({ page: 2, limit: 5 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res1.body.resultados[0].id).to.not.equal(res2.body.resultados[0].id);
        });

        it('Página inexistente: Debería devolver array vacío', async () => {
            const res = await request(app)
                .get('/centros_salud')
                .query({ page: 9999, limit: 10 })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.resultados).to.be.an('array');
            expect(res.body.resultados.length).to.equal(0);
        });
    });

    describe('GET /centros_salud/:id - Centro Específico', () => {
        
        it('Debería devolver el CS024 (Cupani) en formato LITE por defecto', async () => {
            const res = await request(app)
                .get('/centros_salud/CS024')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('id', 'CS024');
            expect(res.body).to.have.property('nombre');
            expect(res.body.nombre).to.include('Cupani');
            expect(res.body).to.have.property('zona_programatica');
            expect(res.body).to.have.property('direccion');
            expect(res.body).to.have.property('latitud');
            expect(res.body).to.have.property('longitud');
        });

        it('Debería devolver formato COMPLETO con ?detail=completo', async () => {
            const res = await request(app)
                .get('/centros_salud/CS024')
                .query({ detail: 'completo' })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('id', 'CS024');
            expect(res.body).to.have.property('coordenadas');
            expect(res.body.coordenadas).to.have.property('validas', true);
            expect(res.body).to.have.property('servicios');
            expect(res.body).to.have.property('horarios');
            expect(res.body).to.have.property('mapa_url');
        });

        it('Debería devolver 404 para centro inexistente', async () => {
            const res = await request(app)
                .get('/centros_salud/CS999')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(404);
            expect(res.body).to.have.property('error');
            expect(res.body.error).to.include('no encontrado');
        });

        it('ID en minúscula debería funcionar (se convierte a mayúscula)', async () => {
            const res = await request(app)
                .get('/centros_salud/cs024')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('id', 'CS024');
        });
    });

    describe('GET /centros_salud/:id/servicios - Servicios de un Centro', () => {
        
        it('Debería devolver todos los servicios del CS024', async () => {
            const res = await request(app)
                .get('/centros_salud/CS024/servicios')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.greaterThan(0);
            
            // Verificar estructura de servicios
            const servicioEjemplo = res.body[0];
            expect(servicioEjemplo).to.have.property('nombre');
            expect(servicioEjemplo).to.have.property('turno_callcenter');
        });

        it('Filtro callcenter=true: Solo servicios con callcenter', async () => {
            const res = await request(app)
                .get('/centros_salud/CS024/servicios')
                .query({ callcenter: 'true' })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            
            // Todos deben tener turno_callcenter: true
            res.body.forEach(servicio => {
                expect(servicio.turno_callcenter).to.be.true;
            });
        });

        it('Filtro callcenter=false: Solo servicios SIN callcenter', async () => {
            const res = await request(app)
                .get('/centros_salud/CS024/servicios')
                .query({ callcenter: 'false' })
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            
            // Ninguno debe tener turno_callcenter: true
            res.body.forEach(servicio => {
                expect(servicio.turno_callcenter).to.not.be.true;
            });
        });

        it('Debería devolver 404 para centro inexistente', async () => {
            const res = await request(app)
                .get('/centros_salud/CS999/servicios')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(404);
        });
    });

    describe('GET /centros_salud_mapa - Datos para Mapa', () => {
        
        it('Debería devolver formato liviano para Leaflet', async () => {
            const res = await request(app)
                .get('/centros_salud_mapa')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.greaterThanOrEqual(100);
            
            const centroEjemplo = res.body[0];
            expect(centroEjemplo).to.have.property('id');
            expect(centroEjemplo).to.have.property('nombre');
            expect(centroEjemplo).to.have.property('latitud');
            expect(centroEjemplo).to.have.property('longitud');
            expect(centroEjemplo).to.have.property('servicios');
            expect(centroEjemplo.servicios).to.be.an('array');
        });
    });

    describe('Endpoint DEPRECADO: /centros_cercanos', () => {
        
        it('NO debería existir (está comentado en el código)', async () => {
            const res = await request(app)
                .get('/centros_cercanos')
                .query({ lat: -31.4201, lon: -64.1888 });

            // Debería devolver 404 porque el endpoint está comentado
            expect(res.status).to.equal(404);
        });
    });

    describe('Endpoint raíz /', () => {
        
        it('Debería devolver mensaje de bienvenida', async () => {
            const res = await request(app)
                .get('/')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.text).to.include('API de servicios de salud');
        });
    });

    describe('Endpoint /debug', () => {
        
        it('Debería confirmar que es el archivo correcto', async () => {
            const res = await request(app)
                .get('/debug')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(res.status).to.equal(200);
            expect(res.text).to.include('OK');
        });
    });
});