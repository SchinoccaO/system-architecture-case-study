# Changelog — Servicios Unificados API

Este changelog resume los releases y el historial de desarrollo detallado (sesiones, decisiones técnicas, pruebas y métricas).

---

## v2.1.0 — 2026-02-27 (Data fixes + nuevos endpoints + validación ejido)

**Cambios Principales:**

- 🐛 **Fix crítico de datos — CS011 coordenadas invertidas**
  - `latitud` y `longitud` estaban transpuestas en el registro "Centro de Salud Colón"
  - Corregido: `latitud: -31.43975`, `longitud: -64.164217`
  - Impacto: el centro ahora es seleccionable correctamente por `seleccionarCentroPorArea()`

- 📞 **Datos — Campo `telefono` en los 4 HPA**
  - HPACB (Cura Brochero): `03543 40-7299`
  - HPAMC (Maria Teresa De Calcuta): `0351 483-1676`
  - HPASJ (San Jorge): `0351 327-9181`
  - HPACP (Comipaz): `0351 445-6667`

- 🗺️ **Validación de ejido municipal — HTTP 422**
  - Endpoints `GET /centro_correspondiente` y `GET /area_programatica`
  - Bbox implementado: lat (-31.1 a -31.7), lon (-63.8 a -64.6)
  - Coordenadas fuera del ejido retornan HTTP 422 con mensaje diferenciado, en lugar de 404 genérico
  - Permite que el chatbot (Wise) muestre mensajes apropiados al ciudadano

- ✨ **Nuevo endpoint — Zonas Programáticas**
  - `GET /api/zonas_programaticas` — lista las 6 zonas con conteo de centros
  - `GET /api/zonas_programaticas/:zona` — centros de una zona ("01"–"06"), con paginación opcional
  - Acepta "1"–"6" y normaliza a formato "01"–"06"
  - Servicio: `src/services/zonaProgramatica.service.js`
  - Rutas: `src/routes/zonaProgramatica.routes.js`

- 📄 **Documentación actualizada**
  - `DOCUMENTACION_ENDPOINTS.md`: secciones 3.4, 3.5, 5.5 (HPA), 5.6 (Zonas Programáticas)
  - Todos los cambios marcados con `*[2026-02-27]*`

---

## v2.0.0 — 2026-01-06 (Refactorización Modular)

**Cambios Principales:**
- 🏗️ **Arquitectura Modular MVC + Services**: Refactorización completa de server.js (1295 líneas) en estructura modularizada
  - `config/` - Configuración centralizada (constants, security, rateLimits)
  - `middlewares/` - Middlewares reutilizables (auth, logging, validation, timeout, errorHandlers)
  - `services/` - Lógica de negocio (auth, area, centroSelection)
  - `routes/` - Endpoints organizados por dominio (health, auth, centros, area, odontologia, som, admin)
  - `utils/` - Utilidades compartidas (formatters.js)
  
- 📉 **Reducción de Complejidad**:
  - `server.js`: 1295 líneas → 72 líneas (94% reducción)
  - Eliminada duplicación de código (formatoCentroLite, formatoCentroCompleto)
  - Imports optimizados, comentarios duplicados eliminados
  
- 🔧 **Mejoras de Código**:
  - Logging estructurado consistente (reemplazados console.log por logger/auditLogger)
  - Comentarios traducidos a español
  - Eliminado require('dotenv') duplicado
  - Exports consistentes y retrocompatibles
  
- ✨ **Nuevas Funcionalidades**:
  - `/centros_salud_mapa`: Ahora soporta filtro `?centro=CS024` y retorna campo `horarios`
  - `/api/odontologia/lejanos`: Reescrito para siempre retornar sugerencias fuera del área del usuario
  - Endpoints públicos corregidos: `/`, `/health`, `/debug` (sin JWT)
  
- 🐛 **Bugfixes**:
  - Corregido orden de ejecución de dotenv (causaba fallo en validaciones de seguridad)
  - `/api/odontologia/lejanos` ahora funciona correctamente con coordenadas válidas
  
- ✅ **Testing**:
  - 70/70 tests pasando (vs 59 en v1.0.0)
  - Tests de regresión completos para validar refactorización
  
**Sesiones de Desarrollo:**

### SESIÓN 6 — 2026-01-06 — Revisión transversal y limpieza final
- Revisión completa del código refactorizado
- Eliminación de console.log duplicados → logger estructurado
- Corrección de endpoints públicos (/, /health, /debug sin JWT)
- Actualización de README.md y CHANGELOG.md
- Validación final: 70/70 tests passing

### SESIÓN 5 — 2026-01-05 — Merge y sincronización
- Merge de rama refactor/restructure-server a main
- Sincronización local con remoto (git pull)
- Validación de estructura completa en main
- Verificación de tests post-merge

### SESIÓN 4 — 2026-01-03 — Code cleanup y optimización
- Creación de `utils/formatters.js` con funciones compartidas
- Eliminación de código duplicado en routes/
- Traducción de comentarios inglés → español
- Optimización de imports en odontologia.routes.js
- Limpieza de comentarios duplicados

### SESIÓN 3 — 2026-01-02 — Mejoras de endpoints
- Mejora de `/centros_salud_mapa`: filtro por centro + horarios
- Reescritura de `/api/odontologia/lejanos`: lógica independiente para sugerencias
- Testing exhaustivo de endpoints mejorados
- Validación de formato de respuestas

### SESIÓN 2 — 2025-12-27 — Testing y bugfixes
- Corrección de bug dotenv (execution order)
- Todos los tests pasando (70/70)
- Validación de endpoints legacy (/test_odo, /centros_salud_mapa)
- Testing de flujos de odontología completos

### SESIÓN 1 — 2025-12-23 — Inicio de refactorización
- Creación de rama `refactor/restructure-server`
- Planificación de arquitectura MVC + Services
- Extracción de config/ (constants, security, rateLimits)
- Creación de middlewares/ (auth, logging, validation, timeout, errorHandlers)
- Creación de services/ (auth, area, centroSelection)
- Creación de routes/ (health, auth, centros, area, odontologia, som, admin)
- Backup de server.js original → server.js.backup

---

## v1.0.0 — 2025-12-16 (Deploy Inicial)

- Alcance:
  - Implementación y despliegue del endpoint `SOM` para servicios odontológicos especializados (`/api/servicios_odontologicos/servicios`).
  - Formato liviano optimizado para mapas en `/centros_salud_mapa`.
  - Autenticación básica aplicada (excepto `/health`).
  - Validaciones RF7: parsing y validación de coordenadas (coma/punto), aliases, rangos y robustez ante campos faltantes.
  - Tests: suite final (local) mostró 59 tests en ejecución; historial de desarrollo registra suites de 35/35 en sesiones previas.
  - Datos: dataset final con 101 centros (`CS001`..`CS101`) + `SOM`.

---

## Historial detallado de desarrollo

### SESIÓN 1 — 2025-12-12 — Setup inicial y refactor RF7

- Objetivos:
  - Implementar RF7 (normalización y validación de datos).
  - Resolver edge-cases de asignación odontológica (Casos A/B/C).
  - Añadir validaciones defensivas para evitar crashes con datos inconsistentes.

- Problemas detectados:
  1. Caso B (`/test_odo`): muchos centros tienen `turno_callcenter: true`; algunos (27) tienen `false` — al probar con coordenadas de ciertos centros (ej. `CS017`) siempre se asignaba otro más cercano con callcenter.
  2. Caso C (derivación a `SOM`): en datos reales TODOS los centros tienen odontología, por lo que fue necesario usar mocks para probar la derivación.

- Soluciones y cambios:
  - Tests unitarios con datos mock (`odo.test.js`) para cubrir casos A/B/C.
  - Validaciones defensivas añadidas en `server.js`:
    - `/test_odo`: `const servicios = Array.isArray(asignado.servicios) ? asignado.servicios : []`.
    - `/centro_correspondiente`: `const serviciosValidos = Array.isArray(centro.servicios) ? centro.servicios : []`.
    - `/centros_salud/:id`: garantizar `centro.servicios = []` si falta.
  - `SOM` se obtiene ahora desde el JSON de datos en vez de estar hardcoded.

---

### SESIÓN 2 — 2025-12-15 — Suite completa de tests

- Objetivos:
  - Añadir tests automatizados con Mocha/Chai y Supertest.
  - Testear casos A/B/C con combinación de datos reales y mocks.
  - Verificar consistencia global del proyecto y documentar RF6 (lógica) y RF7 (robustez).

- Auditoría principal:
  - `odo.test.js` original usaba una estructura incorrecta para `servicios` (objeto). Se refactorizó a usar arrays tal como en el JSON real.

- Dependencias para testing (instaladas como devDependencies en desarrollo): `mocha`, `chai`, `supertest`.

- Suites implementadas y resultados:
  1. `odo.test.js` — 4 tests unitarios (mocks): Caso A, B, C y validación de parámetros.
  2. `odo.real.test.js` — 3 tests con datos reales: Caso A real, conteo de centros sin callcenter (27) y verificación de odontología en todos los CS.
  3. `server.integration.test.js` — 28 tests de integración contra `server.js` real.

- Resultado reportado en sesiones: 35/35 passing (sesión específica). En ejecuciones locales posteriores aparecen 59 tests en el repo actual.

---

## Decisiones técnicas importantes

- Algoritmo de distancia: Haversine (precisión y corrección geográfica). Ejemplo:

```javascript
function calcularDistancia(lat1, lon1, lat2, lon2) { /* Haversine */ }
```

- Motivaciones principales:
  - Separación RF6 (lógica de negocio: asignación) y RF7 (robustez, validaciones). Esto permite cambios independientes y pruebas más seguras.
  - Añadir logs de auditoría para trazabilidad: `console.log('[ASIGNACION_ODO] lat=..., lon=... -> centro=CSxxx (Caso X)')`.
  - Deprecación comentada del endpoint `/centros_cercanos` porque contradecía la política de devolver un único `centro_asignado`.

---

## Resumen de métricas (extraídas del historial)

- Centros en dataset: 101 (CS001..CS101) + `SOM`.
- Con odontología: 101/101.
- Con `turno_callcenter` en odontología: 73.
- Sin `turno_callcenter` en odontología: 27.
- Tests (ejemplos en historial): 35 passing (sesión); ejecuciones locales recientes muestran 59 passing.

---

## Endpoints implementados (resumen)

- `GET /health` — health check y metadata (version, total_centros).
- `GET /test_odo` — asignación odontológica (Casos A/B/C). Acepta aliases y formatos de coordenadas (coma/punto).
- `GET /centro_correspondiente` — centro asignado único para coordenadas.
- `GET /centros_salud` — listado paginado o completo.
- `GET /centros_salud/:id` — detalle (lite/completo).
- `GET /centros_salud/:id/servicios` — servicios por centro (filtros por `callcenter`).
- `GET /centros_salud_mapa` — formato liviano para mapas.

Para detalles y ejemplos ver `README.md` y los tests en `/test`.


---

**Última actualización:** 2025-12-22
