const { expect } = require('chai');
const { calcularDistancia } = require('../src/utils');

describe('Selección de centro dentro de un área', () => {
  it('Elige el centro más cercano entre múltiples centros de la misma área', () => {
    // Punto del usuario
    const userLat = 0.0;
    const userLon = 0.0;

    // Centros en la misma área 'AP_TEST'
    const centros = [
      {
        id: 'CS_A',
        nombre: 'Centro A (cercano)',
        area_programatica: { codigo_area: 'AP_TEST', denominacion: 'Test' },
        zona_programatica: '99',
        latitud: 0.01, // ~1.11 km
        longitud: 0.0,
      },
      {
        id: 'CS_B',
        nombre: 'Centro B (lejano)',
        area_programatica: { codigo_area: 'AP_TEST', denominacion: 'Test' },
        zona_programatica: '99',
        latitud: 0.05, // ~5.55 km
        longitud: 0.0,
      },
    ];

    const areaInfo = { area: 'AP_TEST', zona: '99', denominacion: 'Test' };

    // Filtrar candidatos por coincidencia de área/zona/denominación (misma lógica que server)
    const candidatos = centros.filter((c) => {
      const codigo = c.area_programatica?.codigo_area || c.area_programatica?.codigo || null;
      const denom = c.area_programatica?.denominacion || null;

      if (
        codigo &&
        areaInfo.area &&
        String(codigo).toLowerCase() === String(areaInfo.area).toLowerCase()
      )
        return true;
      if (
        c.zona_programatica &&
        areaInfo.zona &&
        String(c.zona_programatica) === String(areaInfo.zona)
      )
        return true;
      if (
        denom &&
        areaInfo.denominacion &&
        String(denom).toLowerCase() === String(areaInfo.denominacion).toLowerCase()
      )
        return true;
      return false;
    });

    expect(candidatos.length).to.equal(2);

    // Calcular distancias y seleccionar el más cercano
    const candidatosConDist = candidatos
      .map((c) => ({
        centro: c,
        distancia: calcularDistancia(userLat, userLon, c.latitud, c.longitud),
      }))
      .filter((cd) => !Number.isNaN(cd.distancia));

    candidatosConDist.sort((a, b) => a.distancia - b.distancia);

    expect(candidatosConDist[0].centro.id).to.equal('CS_A');
    // Comprobación adicional: distancia menor que la del otro
    expect(candidatosConDist[0].distancia).to.be.lessThan(candidatosConDist[1].distancia);
  });
});
