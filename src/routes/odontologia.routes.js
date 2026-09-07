/**
 * Rutas de odontología
 * Copiado EXACTAMENTE del server.js original
 */

const express = require('express');
const router = express.Router();
const { jwtAuthMiddleware } = require('../middlewares');
const { logger } = require('../logger');
const { parseCoordinates, calcularDistancia, seleccionarCentroPorArea, buscarAreaPorCoordenada } = require('../utils');
const data = require('../../data/servicios_unificados_full_final.json');

// Detección flexible de servicio odontológico (normaliza acentos y busca 'odonto')
function centroTieneOdontologia(centro) {
  if (!Array.isArray(centro?.servicios)) return false;
  return centro.servicios.some((s) => {
    if (!s || typeof s.nombre !== 'string') return false;
    const nombre = s.nombre.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return nombre.includes('odonto');
  });
}

// ---------------------------
// ENDPOINT: /api/odontologia/cercano
// Comportamiento: primero determina el `centro_asignado`. Si el centro asignado
// NO cuenta con odontología -> devolver Caso C (instrucción hacia SOM) incluyendo
// el centro asignado en la respuesta. Si el asignado tiene odontología -> buscar
// el centro con odontología más cercano (comportamiento previo).
// ---------------------------
router.get('/cercano', jwtAuthMiddleware, (req, res) => {
  logger.info('Búsqueda de centro cercano con odontología', { ip: req.ip, endpoint: '/api/odontologia/cercano' });
  const coords = parseCoordinates(req);
  if (coords.error) return res.status(400).json({ error: coords.error });
  const { lat, lon } = coords;

  // Validación defensiva
  if (!Array.isArray(data.centros_salud)) {
    return res.status(500).json({ error: 'Error de configuración del sistema' });
  }

  // 1) Determinar centro asignado según distancia (como /centro_correspondiente)
  const centrosOrdenados = data.centros_salud
    .map((c) => ({ ...c, distancia: calcularDistancia(lat, lon, c.latitud, c.longitud) }))
    .filter((c) => !Number.isNaN(c.distancia))
    .sort((a, b) => a.distancia - b.distancia);

  if (centrosOrdenados.length === 0) {
    return res
      .status(404)
      .json({ error: 'No hay centros con coordenadas válidas para calcular distancia' });
  }

  const asignado = centrosOrdenados[0];

  // Si se solicita modo debug, devolver información del asignado sin alterar flujo
  if (req.query && String(req.query.debug) === '1') {
    return res.json({
      debug: true,
      asignado: {
        id: asignado.id,
        nombre: asignado.nombre,
        distancia: Number(asignado.distancia.toFixed(3)),
      },
      asignado_tiene_odonto: centroTieneOdontologia(asignado),
    });
  }

  // Preferir selección por área programática usando polígonos.
  // Si hay centros con odontología en la misma área, elegir el más cercano entre ellos.
  // Si no hay, sugerir centros lejanos (fuera del área) o fallback a SOM.

  const DISTANCIA_MAXIMA_KM = 10;
  // Use shared selector
  const resultado = seleccionarCentroPorArea({
    reqOrPoint: req,
    centers: data.centros_salud,
    filterFn: (c) =>
      Array.isArray(c.servicios) &&
      c.servicios.some((s) => s.nombre && s.nombre.toLowerCase().includes('odonto')),
    archivoJson: './data/areasredefinidas.json',
    distanciaMaxKm: DISTANCIA_MAXIMA_KM,
    limit: 3,
  });

  if (resultado.encontrado && resultado.asignado) {
    const asignado = resultado.asignado;
    const servicioOdo = asignado.servicios.find(
      (s) => s.nombre && s.nombre.toLowerCase().includes('odonto'),
    );
    const turnoCallcenter = servicioOdo?.turno_callcenter === true;
    return res.json({
      encontrado: true,
      centro: {
        id: asignado.id,
        nombre: asignado.nombre,
        direccion: asignado.direccion,
        zona_programatica: asignado.zona_programatica,
        distancia: resultado.distancia ? Number(resultado.distancia.toFixed(2)) : undefined,
        coordenadas: { latitud: asignado.latitud, longitud: asignado.longitud },
      },
      turno: {
        callcenter: turnoCallcenter,
        presencial: true,
        instrucciones: turnoCallcenter
          ? 'Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs.'
          : 'Acercate personalmente al centro para sacar turno en el horario de atención.',
      },
    });
  }

  return res.json({
    encontrado: false,
    mensaje: 'No encontramos un centro con odontología en tu zona',
    sugerencia: 'centros_lejanos',
  });
});

// ---------------------------
// ENDPOINT: /api/odontologia/cuil/:cuil
// Segunda opción al flujo de geolocalización.
// Verifica si el centro asignado por CUIL tiene odontología.
// ---------------------------
router.get('/cuil/:cuil', jwtAuthMiddleware, async (req, res) => {
  const { cuil } = req.params;
  logger.info('Búsqueda odontología por CUIL', { ip: req.ip, cuil, endpoint: '/api/odontologia/cuil/:cuil' });

  if (!/^\d{10,11}$/.test(cuil)) {
    return res.status(400).json({
      error: 'CUIL inválido',
      detalle: 'El CUIL debe contener solo dígitos (10 u 11 caracteres)',
    });
  }

  let centroData;
  try {
    const cuilService = require('../services/cuil.service');
    const resultado = await cuilService.getCentroByCuil(cuil);
    centroData = resultado.mensajes[0].datos; // datos del centro identificado
  } catch (error) {
    logger.error('Error al obtener centro por CUIL en odontología', { cuil, error: error.message });
    return res.status(error.statusCode || 500).json({ error: error.message });
  }

  // Buscar el centro completo en el JSON local para verificar servicios
  const centro = data.centros_salud.find((c) => c.id === centroData.id);
  if (!centro) {
    return res.status(404).json({ error: 'Centro asignado no encontrado en el sistema' });
  }

  // Verificar si tiene odontología
  if (centroTieneOdontologia(centro)) {
    const servicioOdo = centro.servicios.find(
      (s) => s.nombre && s.nombre.toLowerCase().includes('odonto')
    );
    const turnoCallcenter = servicioOdo?.turno_callcenter === true;

    return res.json({
      encontrado: true,
      origen: 'cuil',
      centro: {
        id: centro.id,
        nombre: centro.nombre,
        direccion: centro.direccion,
        zona_programatica: centro.zona_programatica,
        coordenadas: { latitud: centro.latitud, longitud: centro.longitud },
      },
      turno: {
        callcenter: turnoCallcenter,
        presencial: true,
        instrucciones: turnoCallcenter
          ? 'Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs.'
          : 'Acercate personalmente al centro para sacar turno en el horario de atención.',
      },
    });
  }

  // Centro asignado NO tiene odontología
  // Paso 1 (default): informar al usuario, sin alternativas todavía
  // Paso 2 (?alternativas=true): incluir centros cercanos con odonto
  const respBase = {
    encontrado: false,
    origen: 'cuil',
    centro_asignado: {
      id: centro.id,
      nombre: centro.nombre,
      direccion: centro.direccion,
    },
    mensaje: 'Tu centro de salud asignado no cuenta con odontología.',
  };

  if (req.query.alternativas !== 'true') {
    return res.json(respBase);
  }

  // Paso 2: buscar alternativas usando coordenadas del centro asignado
  const lat = centro.latitud;
  const lon = centro.longitud;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.json({
      ...respBase,
      mensaje: 'Tu centro asignado no cuenta con odontología y no tiene coordenadas para buscar alternativas.',
    });
  }

  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 3));
  const lejanos = buscarCentrosLejanos(lat, lon, limit);

  return res.json({
    ...respBase,
    alternativas: {
      ...lejanos,
      mensaje: 'Centros con odontología más cercanos a tu centro asignado:',
    },
  });
});

// ---------------------------
// Lógica reutilizable: busca centros con odontología cercanos a lat/lon
// Usada por /lejanos y por /cuil/:cuil cuando el centro asignado no tiene odonto
// ---------------------------
function buscarCentrosLejanos(lat, lon, limit = 3) {
  const zonaUsuario = buscarAreaPorCoordenada(lat, lon)?.properties?.AREA;

  const centrosConOdonto = data.centros_salud.filter((c) =>
    Array.isArray(c.servicios) &&
    c.servicios.some((s) => s.nombre && s.nombre.toLowerCase().includes('odonto'))
  );

  const ordenados = centrosConOdonto
    .filter((c) => (zonaUsuario ? c.zona_programatica !== zonaUsuario : true))
    .map((c) => ({ ...c, distancia: calcularDistancia(lat, lon, c.latitud, c.longitud) }))
    .filter((c) => !isNaN(c.distancia))
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, limit)
    .map((c) => {
      const turnoCallcenter = c.servicios
        .find((s) => s.nombre && s.nombre.toLowerCase().includes('odonto'))
        ?.turno_callcenter ?? false;
      return {
        id: c.id,
        nombre: c.nombre,
        direccion: c.direccion,
        zona_programatica: c.zona_programatica,
        distancia: Number(c.distancia.toFixed(2)),
        turno_callcenter: turnoCallcenter,
        instrucciones: turnoCallcenter
          ? 'Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs.'
          : 'Acercate personalmente al centro para sacar turno en el horario de atención.',
      };
    });

  if (ordenados.length === 0) {
    const som = data.centros_salud.find((c) => c.id === 'SOM');
    return {
      centros: [],
      total: 0,
      fallback_som: true,
      som: som ? {
        id: som.id,
        nombre: som.nombre,
        direccion: som.direccion,
        telefono: som.telefono || '0800-888-5555',
        horarios: som.horarios || 'Lunes a Viernes 7:00-14:00',
        coordenadas: { latitud: som.latitud, longitud: som.longitud },
      } : null,
      mensaje: 'No encontramos centros con odontología disponibles. Te recomendamos acercarte al Servicio Odontológico Municipal (SOM)',
      instrucciones: 'El SOM ofrece servicios odontológicos especializados. Podés solicitar turno llamando al 0800-888-5555 o acercándote a San Martín 850, Córdoba',
    };
  }

  return {
    centros: ordenados,
    total: ordenados.length,
    mensaje: 'Estos centros están fuera de tu zona programática pero cuentan con odontología',
  };
}

// ---------------------------
// ENDPOINT: /api/odontologia/lejanos
// Devuelve centros con odontología fuera de zona programática A MODO DE SUGERENCIA.
// ---------------------------
router.get('/lejanos', jwtAuthMiddleware, (req, res) => {
  logger.info('Búsqueda de centros lejanos con odontología', { ip: req.ip, endpoint: '/api/odontologia/lejanos' });
  const coords = parseCoordinates(req);
  if (coords.error) return res.status(400).json({ error: coords.error });

  if (!Array.isArray(data.centros_salud)) {
    return res.status(500).json({ error: 'Error de configuración del sistema' });
  }

  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 3));
  return res.json(buscarCentrosLejanos(coords.lat, coords.lon, limit));
});

module.exports = router;
