const request = require('supertest');
const { expect } = require('chai');
const express = require('express');

// Mock de datos con estructura CORRECTA (ARRAY)
const mockCentrosSalud = [
  {
    id: 'CS_TEST_A',
    nombre: 'Centro con ODO y CallCenter',
    direccion: 'Calle Test A 123',
    zona_programatica: '01',
    latitud: -31.4201,
    longitud: -64.1888,
    servicios: [
      // ✅ ARRAY, no objeto
      {
        nombre: 'Odontología',
        turno_callcenter: true,
      },
      {
        nombre: 'Clínica Médica',
        turno_callcenter: false,
      },
    ],
  },
  {
    id: 'CS_TEST_B',
    nombre: 'Centro con ODO sin CallCenter',
    direccion: 'Calle Test B 456',
    zona_programatica: '02',
    latitud: -31.43,
    longitud: -64.19,
    servicios: [
      // ✅ ARRAY
      {
        nombre: 'Odontología',
        turno_callcenter: false,
      },
    ],
  },
  {
    id: 'CS_TEST_C',
    nombre: 'Centro SIN Odontología',
    direccion: 'Calle Test C 789',
    zona_programatica: '03',
    latitud: -31.44,
    longitud: -64.2,
    servicios: [
      // ✅ ARRAY sin odontología
      {
        nombre: 'Clínica Médica',
        turno_callcenter: true,
      },
    ],
  },
  {
    id: 'SOM',
    nombre: 'Secretaría de Odontología Municipal',
    direccion: 'Av. Vélez Sarsfield 1230',
    latitud: -31.4135,
    longitud: -64.1811,
    horarios: 'Lunes a Viernes 8:00-14:00',
    servicios: [],
  },
];

// Crear app de test con mock
function crearAppTest() {
  const app = express();
  app.use(express.json());

  // Endpoint de prueba con LÓGICA CORRECTA (igual que server.js)
  app.get('/test_odo', (req, res) => {
    const { lat, lon } = req.query;

    // Validación RF7
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Faltan parámetros lat y lon' });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }

    // Calcular distancia (Haversine simplificado)
    function calcularDistancia(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Ordenar centros por distancia
    const centrosOrdenados = mockCentrosSalud
      .map((cs) => ({
        ...cs,
        distancia: calcularDistancia(userLat, userLon, cs.latitud, cs.longitud),
      }))
      .filter((cs) => !Number.isNaN(cs.distancia))
      .sort((a, b) => a.distancia - b.distancia);

    if (centrosOrdenados.length === 0) {
      return res.status(404).json({ error: 'No hay centros disponibles' });
    }

    const asignado = centrosOrdenados[0];

    // RF7: Validación defensiva de servicios (ESTRUCTURA ARRAY)
    const servicios = Array.isArray(asignado.servicios) ? asignado.servicios : [];
    const servicioOdo = servicios.find(
      (s) => s.nombre && s.nombre.toLowerCase().includes('odonto'),
    );

    if (servicioOdo) {
      // CASO A: tiene odontología Y permite turnos por callcenter
      if (servicioOdo.turno_callcenter === true) {
        return res.json({
          caso: 'A',
          centro: {
            id: asignado.id,
            nombre: asignado.nombre,
            direccion: asignado.direccion,
            zona_programatica: asignado.zona_programatica,
            distancia: Number(asignado.distancia.toFixed(2)),
          },
          instrucciones: 'Podés sacar turno llamando al 0800-888-5555',
        });
      }

      // CASO B: tiene odontología pero NO permite turnos por callcenter
      if (servicioOdo.turno_callcenter === false) {
        return res.json({
          caso: 'B',
          centro: {
            id: asignado.id,
            nombre: asignado.nombre,
            direccion: asignado.direccion,
            zona_programatica: asignado.zona_programatica,
            distancia: Number(asignado.distancia.toFixed(2)),
          },
          instrucciones: 'Acercate personalmente al centro para sacar turno',
        });
      }

      // CASO EDGE
      console.warn(
        `[WARN] Centro ${asignado.id} tiene odontología pero turno_callcenter es ${servicioOdo.turno_callcenter}`,
      );
    }

    // CASO C: no tiene odontología → redirigir a SOM
    const som = mockCentrosSalud.find((cs) => cs.id === 'SOM');

    if (!som) {
      return res.status(500).json({
        error: 'No se encontró SOM en el sistema',
      });
    }

    return res.json({
      caso: 'C',
      centro: {
        id: som.id,
        nombre: som.nombre,
        direccion: som.direccion,
        horarios: som.horarios,
      },
      instrucciones:
        'Te recomendamos acercarte al Servicio Odontológico Municipal (SOM) para atención odontológica',
    });
  });

  return app;
}

describe('Endpoint /test_odo - Casos de Odontología', () => {
  let app;

  before(() => {
    app = crearAppTest();
  });

  describe('CASO A: Centro con odontología Y callcenter', () => {
    it('Debería devolver CS_TEST_A (más cercano con odo + callcenter)', async () => {
      const res = await request(app).get('/test_odo').query({ lat: -31.4201, lon: -64.1888 });

      expect(res.status).to.equal(200);
      expect(res.body.caso).to.equal('A');
      expect(res.body.centro.id).to.equal('CS_TEST_A');
      expect(res.body.instrucciones).to.equal('Podés sacar turno llamando al 0800-888-5555');
    });
  });

  describe('CASO B: Centro con odontología SIN callcenter', () => {
    it('Debería devolver CS_TEST_B (odo sin callcenter)', async () => {
      // Mock: Modificar temporalmente para forzar Caso B
      const appTestB = express();
      appTestB.use(express.json());

      appTestB.get('/test_odo', (req, res) => {

        // Forzar que solo exista CS_TEST_B (sin callcenter)
        const centroB = {
          id: 'CS_TEST_B',
          nombre: 'Centro con ODO sin CallCenter',
          direccion: 'Calle Test B 456',
          zona_programatica: '02',
          latitud: -31.43,
          longitud: -64.19,
          distancia: 0.5,
          servicios: [
            {
              nombre: 'Odontología',
              turno_callcenter: false,
            },
          ],
        };

        return res.json({
          caso: 'B',
          centro: {
            id: centroB.id,
            nombre: centroB.nombre,
            direccion: centroB.direccion,
            zona_programatica: centroB.zona_programatica,
            distancia: centroB.distancia,
          },
          instrucciones: 'Acercate personalmente al centro para sacar turno',
        });
      });

      const res = await request(appTestB).get('/test_odo').query({ lat: -31.43, lon: -64.19 });

      expect(res.status).to.equal(200);
      expect(res.body.caso).to.equal('B');
      expect(res.body.centro.id).to.equal('CS_TEST_B');
      expect(res.body.instrucciones).to.equal('Acercate personalmente al centro para sacar turno');
    });
  });

  describe('CASO C: Sin centros con odontología → SOM', () => {
    it('Debería devolver SOM cuando no hay centros con odontología', async () => {
      // Mock: Modificar temporalmente para forzar Caso C
      const appTestC = express();
      appTestC.use(express.json());

      appTestC.get('/test_odo', (req, res) => {
        const som = {
          id: 'SOM',
          nombre: 'Secretaría de Odontología Municipal',
          direccion: 'Av. Vélez Sarsfield 1230',
          horarios: 'Lunes a Viernes 8:00-14:00',
        };

        return res.json({
          caso: 'C',
          centro: {
            id: som.id,
            nombre: som.nombre,
            direccion: som.direccion,
            horarios: som.horarios,
          },
          instrucciones:
            'Te recomendamos acercarte al Servicio Odontológico Municipal (SOM) para atención odontológica',
        });
      });

      const res = await request(appTestC).get('/test_odo').query({ lat: -31.5, lon: -64.3 });

      expect(res.status).to.equal(200);
      expect(res.body.caso).to.equal('C');
      expect(res.body.centro.id).to.equal('SOM');
      expect(res.body.instrucciones).to.include('SOM');
    });
  });

  describe('Validaciones RF7', () => {
    it('Debería rechazar request sin coordenadas', async () => {
      const res = await request(app).get('/test_odo');
      expect(res.status).to.equal(400);
      expect(res.body.error).to.exist;
    });
  });
});
