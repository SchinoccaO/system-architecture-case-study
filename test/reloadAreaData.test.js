const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { buscarAreaPorCoordenada, reloadAreaData } = require('../src/utils');

describe('reloadAreaData', () => {
  const tmpFile = path.resolve(__dirname, '..', 'tmp', 'areas_test_reload.json');
  const polygonFeature = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { area: 'TEST_AREA', denominacion: 'Test Area' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-64.01, -31.01],
              [-63.99, -31.01],
              [-63.99, -30.99],
              [-64.01, -30.99],
              [-64.01, -31.01],
            ],
          ],
        },
      },
    ],
  };

  after(() => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // ignore missing temp file during cleanup
    }
  });

  it('should reload areas from a new geojson and reflect changes', () => {
    // ensure tmp dir exists and write initial file
    fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
    fs.writeFileSync(tmpFile, JSON.stringify(polygonFeature), 'utf-8');

    // load via reloadAreaData
    const loaded = reloadAreaData(tmpFile);
    expect(loaded).to.be.an('object');
    expect(loaded.features).to.have.lengthOf(1);

    // query a point inside polygon
    const area = buscarAreaPorCoordenada(-64.0, -31.0, tmpFile);
    expect(area).to.be.an('object');
    expect(area.area).to.equal('TEST_AREA');

    // modify file and reload
    polygonFeature.features[0].properties.area = 'TEST_AREA_2';
    fs.writeFileSync(tmpFile, JSON.stringify(polygonFeature), 'utf-8');

    const reloaded = reloadAreaData(tmpFile);
    expect(reloaded.features[0].properties.area).to.equal('TEST_AREA_2');

    const area2 = buscarAreaPorCoordenada(-64.0, -31.0, tmpFile);
    expect(area2).to.be.an('object');
    expect(area2.area).to.equal('TEST_AREA_2');
  });
});
