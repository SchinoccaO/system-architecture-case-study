/**
 * Generar HTML con datos embebidos
 */

const fs = require('fs');

console.log('Leyendo datos...');
const serviciosRaw = fs.readFileSync('./data/servicios_unificados_full_final.json', 'utf8');
const data = JSON.parse(serviciosRaw);
const servicios = data.centros_salud;

const CENTRO_LAT = -31.413542;
const CENTRO_LON = -64.178741;

// Filtrar y clasificar centros
const centros = servicios
    .filter(c => c.latitud && c.longitud)
    .filter(c => c.latitud >= -32 && c.latitud <= -31 && c.longitud >= -65 && c.longitud <= -64)
    .map(c => {
        const distLat = Math.abs(c.latitud - CENTRO_LAT);
        const distLon = Math.abs(c.longitud - CENTRO_LON);
        
        let zona;
        if (distLat > distLon) {
            zona = c.latitud > CENTRO_LAT ? 'norte' : 'sur';
        } else {
            zona = c.longitud > CENTRO_LON ? 'este' : 'oeste';
        }
        
        return {
            id: c.id,
            nombre: c.nombre,
            latitud: c.latitud,
            longitud: c.longitud,
            zona: zona
        };
    });

console.log(`Centros procesados: ${centros.length}`);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Propuesta de Zonas Geográficas - Córdoba</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        #header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        #header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        #header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        #controls {
            background: white;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .filter-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #ddd;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .filter-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .filter-btn.active {
            color: white;
            border-color: transparent;
        }
        
        .filter-btn.norte.active { background: #3b82f6; }
        .filter-btn.sur.active { background: #ef4444; }
        .filter-btn.este.active { background: #10b981; }
        .filter-btn.oeste.active { background: #f59e0b; }
        .filter-btn.todos.active { background: #8b5cf6; }
        
        .color-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }
        
        .norte-dot { background: #3b82f6; }
        .sur-dot { background: #ef4444; }
        .este-dot { background: #10b981; }
        .oeste-dot { background: #f59e0b; }
        
        #map {
            flex: 1;
            width: 100%;
        }
        
        #stats {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 200px;
        }
        
        #stats h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #333;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px 0;
            font-size: 14px;
        }
        
        .stat-label {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stat-value {
            font-weight: bold;
            color: #666;
        }
        
        .info-panel {
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .info-panel h4 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #333;
        }
        
        .info-panel p {
            margin: 3px 0;
            font-size: 12px;
            color: #666;
        }
        
        .leaflet-popup-content {
            margin: 8px;
        }
    </style>
</head>
<body>
    <div id="header">
        <h1>🗺️ Propuesta de Zonas Geográficas - Córdoba</h1>
        <p>Centros de salud divididos por dirección cardinal desde el centro geográfico</p>
    </div>
    
    <div id="controls">
        <div class="filter-group">
            <strong>Filtrar zonas:</strong>
            <button class="filter-btn todos active" onclick="filtrarZona('todos')">
                Todas las zonas
            </button>
            <button class="filter-btn norte" onclick="filtrarZona('norte')">
                <span class="color-dot norte-dot"></span>
                NORTE
            </button>
            <button class="filter-btn sur" onclick="filtrarZona('sur')">
                <span class="color-dot sur-dot"></span>
                SUR
            </button>
            <button class="filter-btn este" onclick="filtrarZona('este')">
                <span class="color-dot este-dot"></span>
                ESTE
            </button>
            <button class="filter-btn oeste" onclick="filtrarZona('oeste')">
                <span class="color-dot oeste-dot"></span>
                OESTE
            </button>
        </div>
    </div>
    
    <div id="map"></div>
    
    <div id="stats">
        <h3>📊 Estadísticas</h3>
        <div class="stat-item">
            <span class="stat-label"><span class="color-dot norte-dot"></span> NORTE</span>
            <span class="stat-value" id="stat-norte">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label"><span class="color-dot sur-dot"></span> SUR</span>
            <span class="stat-value" id="stat-sur">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label"><span class="color-dot este-dot"></span> ESTE</span>
            <span class="stat-value" id="stat-este">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label"><span class="color-dot oeste-dot"></span> OESTE</span>
            <span class="stat-value" id="stat-oeste">0</span>
        </div>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid #eee;">
        <div class="stat-item">
            <strong>TOTAL</strong>
            <span class="stat-value" id="stat-total">0</span>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Datos embebidos
        const CENTRO_LAT = ${CENTRO_LAT};
        const CENTRO_LON = ${CENTRO_LON};
        
        const centros = ${JSON.stringify(centros, null, 2)};
        
        let markers = {};
        let map;
        let centroMarker;
        let divisionLines = [];
        
        // Colores por zona
        const colores = {
            norte: '#3b82f6',
            sur: '#ef4444',
            este: '#10b981',
            oeste: '#f59e0b'
        };
        
        // Inicializar mapa
        function initMap() {
            map = L.map('map').setView([CENTRO_LAT, CENTRO_LON], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Marcar el centro geográfico
            centroMarker = L.circleMarker([CENTRO_LAT, CENTRO_LON], {
                radius: 10,
                fillColor: '#000',
                color: '#fff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            centroMarker.bindPopup(\`
                <div class="info-panel">
                    <h4>⭐ Centro Geográfico</h4>
                    <p><strong>Lat:</strong> \${CENTRO_LAT.toFixed(6)}</p>
                    <p><strong>Lon:</strong> \${CENTRO_LON.toFixed(6)}</p>
                </div>
            \`);
            
            // Dibujar líneas divisorias
            const latRange = 0.15;
            const lonRange = 0.15;
            
            // Línea horizontal (divide Norte/Sur)
            const lineaNS = L.polyline([
                [CENTRO_LAT, CENTRO_LON - lonRange],
                [CENTRO_LAT, CENTRO_LON + lonRange]
            ], {
                color: '#666',
                weight: 2,
                dashArray: '10, 10',
                opacity: 0.5
            }).addTo(map);
            divisionLines.push(lineaNS);
            
            // Línea vertical (divide Este/Oeste)
            const lineaEO = L.polyline([
                [CENTRO_LAT - latRange, CENTRO_LON],
                [CENTRO_LAT + latRange, CENTRO_LON]
            ], {
                color: '#666',
                weight: 2,
                dashArray: '10, 10',
                opacity: 0.5
            }).addTo(map);
            divisionLines.push(lineaEO);
            
            mostrarCentros();
            actualizarEstadisticas();
        }
        
        // Mostrar centros en el mapa
        function mostrarCentros() {
            centros.forEach(centro => {
                const marker = L.circleMarker([centro.latitud, centro.longitud], {
                    radius: 6,
                    fillColor: colores[centro.zona],
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                marker.bindPopup(\`
                    <div class="info-panel">
                        <h4>\${centro.id}</h4>
                        <p><strong>\${centro.nombre}</strong></p>
                        <p style="color: \${colores[centro.zona]}; font-weight: bold; text-transform: uppercase;">
                            Zona: \${centro.zona}
                        </p>
                        <p style="font-size: 11px; color: #999;">
                            \${centro.latitud.toFixed(6)}, \${centro.longitud.toFixed(6)}
                        </p>
                    </div>
                \`);
                
                marker.addTo(map);
                markers[centro.id] = marker;
            });
        }
        
        // Filtrar por zona
        function filtrarZona(zona) {
            // Actualizar botones activos
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Filtrar markers
            centros.forEach(centro => {
                const marker = markers[centro.id];
                if (zona === 'todos' || centro.zona === zona) {
                    marker.setStyle({ fillOpacity: 0.8, opacity: 1 });
                } else {
                    marker.setStyle({ fillOpacity: 0.1, opacity: 0.3 });
                }
            });
        }
        
        // Actualizar estadísticas
        function actualizarEstadisticas() {
            const stats = {
                norte: centros.filter(c => c.zona === 'norte').length,
                sur: centros.filter(c => c.zona === 'sur').length,
                este: centros.filter(c => c.zona === 'este').length,
                oeste: centros.filter(c => c.zona === 'oeste').length
            };
            
            document.getElementById('stat-norte').textContent = stats.norte;
            document.getElementById('stat-sur').textContent = stats.sur;
            document.getElementById('stat-este').textContent = stats.este;
            document.getElementById('stat-oeste').textContent = stats.oeste;
            document.getElementById('stat-total').textContent = centros.length;
        }
        
        // Inicializar
        window.addEventListener('load', initMap);
    </script>
</body>
</html>`;

fs.writeFileSync('./tmp/mapa_visualizacion.html', html, 'utf8');
console.log('\n✅ Archivo generado: tmp/mapa_visualizacion.html');
console.log('   Abrilo directamente en tu navegador\n');
