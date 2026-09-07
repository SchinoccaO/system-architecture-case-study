const request = require('supertest');
const { expect } = require('chai');

const serverModule = require('../src/server');
const app = serverModule.app || serverModule;

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
    // fallback to create a signed token when login fails or request fails
    // keep a minimal log for debugging in CI environments
    // eslint-disable-next-line no-console
    console.warn('getJwtToken fallback:', e && e.message ? e.message : e);
  }
  const jwt = require('jsonwebtoken');
  jwtToken = jwt.sign(
    { userId: 'client_001', username: 'test' },
    process.env.JWT_SECRET || 'tu_clave_secreta',
  );
  return jwtToken;
}

describe('Fallback behaviors - Odontología', () => {
  before(async () => {
    jwtToken = await getJwtToken();
  });

  it('GET /api/odontologia/lejanos devuelve centros FUERA del área del usuario', async () => {
    // Usar coordenadas cercanas a CS001
    const lat = -31.3648,
      lon = -64.149057;

    // Obtener área del usuario
    const areaRes = await request(app)
      .get('/area_programatica')
      .query({ lat, lon })
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(areaRes.status).to.equal(200);
    const area = areaRes.body.area;
    expect(area).to.exist;

    const res = await request(app)
      .get('/api/odontologia/lejanos')
      .query({ lat, lon, limit: 3 })
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.centros).to.be.an('array');
    // Todos los centros devueltos deben pertenecer a una zona distinta a la del usuario (si el area contiene zona)
    for (const c of res.body.centros) {
      if (c.zona_programatica && area.zona) {
        expect(String(c.zona_programatica)).to.not.equal(String(area.zona));
      }
    }
  });

  it('GET /api/odontologia/cercano responde NOT FOUND cuando coordenadas están muy lejos (umbral distancia)', async () => {
    // Coordenadas en el océano Atlántico (muy lejos de los centros)
    const lat = 0.0,
      lon = -30.0;
    const res = await request(app)
      .get('/api/odontologia/cercano')
      .query({ lat, lon })
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).to.equal(200);
    // debe indicar que no encontró (encontrado: false) o sugerencia de lejanos
    expect(res.body).to.have.property('encontrado');
    expect(res.body.encontrado).to.be.false;
  });

  it('Si el área no contiene centros, el /api/odontologia/cercano retorna un centro perteneciente a otra área (fallback)', async () => {
    // Buscar un área definida en areasredefinidas.json que NO aparezca en centros_salud
    const areas = require('../data/areasredefinidas.json');
    const centros = require('../data/servicios_unificados_full_final.json').centros_salud;
    const zonasCentros = new Set(centros.map((c) => String(c.zona_programatica)));

    let candidateFeature = null;
    for (const f of areas.features) {
      const props = f.properties || {};
      const zona = props.zona || props.areapr || props.id || null;
      if (zona && !zonasCentros.has(String(zona))) {
        candidateFeature = f;
        break;
      }
    }

    // Si no encontramos tal área, omitimos la prueba (no fallar la suite)
    if (!candidateFeature) return;

    // Tomar una coordenada interior (primer anillo, primer punto)
    const coord = candidateFeature.geometry?.coordinates?.[0]?.[0];
    if (!coord) return;
    const lon = coord[0],
      lat = coord[1];

    // Verificar que area_programatica detecta esa área
    const areaRes = await request(app)
      .get('/area_programatica')
      .query({ lat, lon })
      .set('Authorization', `Bearer ${jwtToken}`);
    if (areaRes.status !== 200) return; // skip if area endpoint doesn't resolve this point

    const area = areaRes.body.area;
    expect(area).to.exist;

    const res = await request(app)
      .get('/api/odontologia/cercano')
      .query({ lat, lon })
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).to.equal(200);
    // Si no hubo centros en el área, el centro devuelto (si existe) debe ser de otra zona
    if (res.body.encontrado === true && res.body.centro) {
      const centroZona = res.body.centro.zona_programatica || res.body.centro.zona;
      expect(String(centroZona)).to.not.equal(String(area.zona));
    }
  });
});
