/**
 * Servicio CUIL → Centro de salud asignado
 *
 * Flujo:
 * 1. Llama a la API Wise con el CUIL del paciente (con retry automático en 401)
 * 2. Extrae area_programatica.area y denominacion
 * 3. Construye el ID interno: "CS" + area.padStart(3, '0')
 * 4. Busca el centro en el JSON local
 * 5. Devuelve respuesta con dos mensajes para renderizar como burbujas separadas
 */

const wiseToken = require('./wiseToken.service');
const data = require('../../data/servicios_unificados_full_final.json');
const { logger } = require('../logger');

/**
 * Convierte el número de área de la API Wise al ID interno del centro.
 * Ejemplo: "64" → "CS064", "4" → "CS004", "100" → "CS100"
 * @param {string|number} area
 * @returns {string}
 */
function areaToCentroId(area) {
  return 'CS' + String(area).padStart(3, '0');
}

/**
 * Busca un centro de salud por ID en el JSON local.
 * @param {string} id - Ej: "CS064"
 * @returns {Object|null}
 */
function findCentroById(id) {
  return data.centros_salud.find((c) => c.id === id) || null;
}

/**
 * Consulta el centro de salud asignado a un CUIL.
 *
 * @param {string} cuil - CUIL del paciente
 * @returns {Promise<Object>} Respuesta con dos mensajes para el frontend
 */
async function getCentroByCuil(cuil) {
  // 1. Consultar API Wise (con retry automático en 401)
  let wiseData;
  try {
    wiseData = await wiseToken.getPersonDataByCuil(cuil);
  } catch (error) {
    logger.error('cuil.service: error al consultar API Wise', { cuil, error: error.message });
    throw error;
  }

  // 2. Validar respuesta de la API externa
  if (!wiseData?.exito) {
    const err = new Error(wiseData?.descripcionError || 'CUIL no encontrado en el padrón');
    err.statusCode = 404;
    throw err;
  }

  // Caso: CUIL existe en el padrón pero no tiene domicilio/área asignada
  // La API devuelve latitud: null, longitud: null, area_programatica: null
  const sinUbicacion =
    wiseData.latitud == null &&
    wiseData.longitud == null &&
    wiseData.area_programatica == null;

  if (sinUbicacion) {
    const nombrePaciente = wiseData.datos?.nombres
      ? `${wiseData.datos.nombres} ${wiseData.datos.apellido || ''}`.trim()
      : 'El paciente';

    const err = new Error(
      `${nombrePaciente} no tiene domicilio o área programática registrada. ` +
      'No es posible determinar el centro de salud asignado.'
    );
    err.statusCode = 404;
    err.sinArea = true;
    throw err;
  }

  const areaProg = wiseData?.area_programatica;
  if (!areaProg?.area) {
    const err = new Error('La API Wise no devolvió área programática para este CUIL');
    err.statusCode = 422;
    throw err;
  }

  // 3. Construir ID interno
  const centroId = areaToCentroId(areaProg.area);

  // 4. Buscar centro en JSON local
  const centro = findCentroById(centroId);
  if (!centro) {
    const err = new Error(
      'No se encontró un centro de salud asignado para este CUIL. ' +
      'Por favor comunicate con el CallCenter al 0800-888-5555.'
    );
    err.statusCode = 404;
    err.sinCentro = true;
    throw err;
  }

  // 5. Preparar servicios
  const servicios = Array.isArray(centro.servicios) ? centro.servicios : [];
  const serviciosCallcenter = servicios.filter((s) => s.turno_callcenter);
  const serviciosPresenciales = servicios.filter((s) => !s.turno_callcenter);

  // 6. Armar respuesta con dos mensajes
  const nombrePaciente = wiseData.datos?.nombres
    ? `${wiseData.datos.nombres} ${wiseData.datos.apellido || ''}`.trim()
    : null;

  const textoIdentificacion = nombrePaciente
    ? `Tu centro de salud asignado, ${nombrePaciente}, es **${centro.nombre}**, ubicado en ${centro.direccion}. Horario: ${centro.horarios || 'consultar en el centro'}.`
    : `Tu centro de salud asignado es **${centro.nombre}**, ubicado en ${centro.direccion}. Horario: ${centro.horarios || 'consultar en el centro'}.`;

  const textoServicios = servicios.length > 0
    ? `Servicios disponibles en tu centro:`
    : 'Este centro no tiene servicios cargados en el sistema.';

  return {
    mensajes: [
      {
        tipo: 'centro_identificado',
        texto: textoIdentificacion,
        datos: {
          id: centro.id,
          nombre: centro.nombre,
          direccion: centro.direccion,
          horarios: centro.horarios || null,
          coordenadas:
            typeof centro.latitud === 'number' && typeof centro.longitud === 'number'
              ? { latitud: centro.latitud, longitud: centro.longitud }
              : null,
          mapa_url:
            typeof centro.latitud === 'number'
              ? `https://www.google.com/maps/search/?api=1&query=${centro.latitud},${centro.longitud}`
              : null,
          detail_url: `/centros_salud/${centro.id}?detail=completo`,
        },
      },
      {
        tipo: 'servicios_disponibles',
        texto: textoServicios,
        datos: {
          total: servicios.length,
          servicios,
        },
        accion: {
          label: 'Quiero saber servicios disponibles',
          endpoint: `/centros_salud/${centro.id}/servicios`,
        },
      },
    ],
    _meta: {
      cuil,
      area_api: areaProg.area,
      centro_id: centroId,
    },
  };
}

module.exports = {
  getCentroByCuil,
};
