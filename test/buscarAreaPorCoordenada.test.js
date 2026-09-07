const { expect } = require('chai');
const path = require('path');

// Importar la función desde server.js (ajusta el path si la mueves a otro archivo)
const { buscarAreaPorCoordenada } = require('../src/utils');

describe('buscarAreaPorCoordenada', () => {
  it('debería encontrar un área válida para coordenadas conocidas', () => {
    // Ejemplo: usa coordenadas que sabes que están dentro de un polígono
    const lon = -64.185;
    const lat = -31.352;
    const area = buscarAreaPorCoordenada(
      lon,
      lat,
      path.join(__dirname, '../data/areasredefinidas.json'),
    );
    expect(area).to.be.an('object');
    expect(area).to.have.property('zona');
    expect(area).to.have.property('area');
    expect(area).to.have.property('denominacion');
  });

  it('debería devolver null para coordenadas fuera de cualquier polígono', () => {
    // Ejemplo: usa coordenadas fuera de la ciudad
    const lon = -70.0;
    const lat = -40.0;
    const area = buscarAreaPorCoordenada(
      lon,
      lat,
      path.join(__dirname, '../data/areasredefinidas.json'),
    );
    expect(area).to.be.null;
  });
});
