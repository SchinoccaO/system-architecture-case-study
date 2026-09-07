# Documentación Completa de Endpoints - API Servicios de Salud

## Información General
- **Versión:** 2.0.0
- **Base URL:** "http://localhost:{PORT}" (configurado en .env)
- **Autenticación:** JWT Bearer Token (excepto endpoints públicos)
- **Formato:** JSON
- **Rate Limiting:** Configurado por endpoint

---

## 1. AUTENTICACIÓN

### 1.1 Login - Generar Token JWT

**Nombre:** Login de Usuario  
**Descripción:** Genera un token JWT válido por 30 días para autenticar las peticiones subsiguientes  
**Método:** "POST"  
**URL:** "/api/auth/login"  
**Autenticación:** No requiere (público)  
**Rate Limit:** Existe un rate limit de 1000 requests por minuto

#### Parámetros (Body - JSON):
- "username" (string, requerido): Nombre de usuario para autenticación
  - Ejemplo: ""admin""
- "password" (string, requerido): Contraseña del usuario
  - Ejemplo: ""password123""

#### Ejemplo de Request:
"""http
POST /api/auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
"""

#### Ejemplo de Response (Éxito - 200):
"""json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "30d",
  "message": "Token generado exitosamente. Use: Authorization: Bearer <token>"
}
"""

#### Ejemplo de Response (Error - 401):
"""json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Credenciales invalidas"
  }
}
"""

#### Casos de Prueba:
1. username="admin", password="correctPassword123" → Éxito (200)
2. username="admin_invalido", password="correctPassword123" → Error 401
3. username="admin", password="wrongPassword" → Error 401
4. username="", password="correctPassword123" → Error 400
5. username="admin", password="" → Error 400
6. Body vacío {} → Error 400

#### Notas:
- Las credenciales válidas se configuran en variables de entorno (API_USERNAME y API_PASSWORD)
- El token debe incluirse en todas las peticiones protegidas mediante el header: "Authorization: Bearer {token}"
- Registra auditoría de intentos de login fallidos

---

### 1.2 Logout - Revocar Token JWT

**Nombre:** Logout de Usuario
**Descripción:** Invalida el token JWT activo. El token queda en una blacklist en memoria y es rechazado en todos los endpoints protegidos. Para volver a acceder se debe hacer login nuevamente.
**Método:** "POST"
**URL:** "/api/auth/logout"
**Autenticación:** JWT Bearer Token (requerido)

#### Ejemplo de Request:
"""http
POST /api/auth/logout HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Éxito - 200):
"""json
{
  "success": true,
  "message": "Sesion cerrada correctamente"
}
"""

#### Ejemplo de Response (Sin token - 401):
"""json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Token JWT requerido"
  }
}
"""

#### Casos de Prueba:
1. POST /logout (con token válido) → success=true (200)
2. POST /logout (sin token) → Error 401 AUTH_REQUIRED
3. Token revocado usado en cualquier endpoint protegido → Error 401 TOKEN_REVOKED

#### Notas:
- La blacklist es en memoria: se limpia al reiniciar el proceso. Para uso en producción con múltiples instancias, evaluar Redis.
- El token sigue siendo criptográficamente válido pero la API lo rechaza explícitamente.

---

## 2. HEALTH CHECK Y DEBUG

### 2.1 Endpoint Raíz

**Nombre:** Mensaje de Bienvenida  
**Descripción:** Devuelve un mensaje de bienvenida simple para verificar que la API está funcionando  
**Método:** "GET"  
**URL:** "/"  
**Autenticación:** No requiere

#### Ejemplo de Request:
"""http
GET // HTTP/1.1
Host: localhost:3000
"""

#### Ejemplo de Response (200):
"""
API de servicios de salud municipales
"""

#### Casos de Prueba:
1. GET / → Respuesta texto plano (200)
2. GET / (sin headers de autenticación) → Respuesta exitosa (200)

---

### 2.2 Debug

**Nombre:** Debug Check
**Descripción:** Endpoint de debug simple para verificar que el archivo de rutas está cargado correctamente
**Método:** "GET"
**URL:** "/debug"
**Autenticación:** JWT Bearer Token (requerido)

#### Ejemplo de Request:
"""http
GET /debug HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""
OK: estás en el archivo correcto
"""

#### Casos de Prueba:
1. GET /debug (con token válido) → Respuesta "OK: estás en el archivo correcto" (200)
2. GET /debug (sin token) → Error 401 AUTH_REQUIRED

---

### 2.3 Health Check

**Nombre:** Health Check del Sistema  
**Descripción:** Endpoint para monitoreo de salud de la API. Devuelve estado del sistema, versión y métricas básicas  
**Método:** "GET"  
**URL:** "/health"  
**Autenticación:** No requiere

#### Ejemplo de Request:
"""http
GET /health HTTP/1.1
Host: localhost:3000
"""

#### Ejemplo de Response (200):
"""json
{
  "status": "ok",
  "version": "2.0.0",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "services": {
    "centros_salud": true,
    "utils_coordenadas": true
  },
  "metadata": {
    "total_centros": 45
  }
}
"""

#### Ejemplo de Response (Error - 500):
"""json
{
  "status": "error",
  "message": "Health check failed"
}
"""

#### Casos de Prueba:
1. GET /health → status="ok", version="2.0.0" (200)
2. GET /health → Verificar metadata.total_centros > 0 (200)
3. GET /health → Verificar services.centros_salud = true (200)
4. GET /health → Verificar timestamp en formato ISO (200)

#### Notas:
- Este endpoint es usado por sistemas de monitoreo (health checks)
- No requiere autenticación para facilitar monitoreo externo

---

## 3. CENTROS DE SALUD

### 3.1 Listar Todos los Centros de Salud

**Nombre:** Listado de Centros de Salud  
**Descripción:** Devuelve el listado completo de centros de salud o paginado según parámetros  
**Método:** "GET"  
**URL:** "/centros_salud"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String - Opcionales):
- "page" (integer, opcional): Número de página para paginación
  - Ejemplo: "page=1"
  - Por defecto: Sin paginación (devuelve todo)
- "limit" (integer, opcional): Cantidad de resultados por página (máximo 20)
  - Ejemplo: "limit=10"
  - Por defecto: 10

#### Ejemplo de Request (Sin paginación):
"""http
GET /centros_salud HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Sin paginación - 200):
"""json
{
  "total": 45,
  "resultados": [
    {
      "id": "CS001",
      "nombre": "Centro de Salud Centro América",
      "direccion": "Av. Colón 1234",
      "latitud": -31.4135,
      "longitud": -64.1811,
      "telefono": "0351-4123456",
      "zona_programatica": "ZONA_1",
      "area_programatica": {
        "codigo_area": "AP01",
        "denominacion": "Centro"
      },
      "horarios": "Lunes a Viernes 7:00-19:00",
      "servicios": [
        {
          "nombre": "Clínica Médica",
          "turno_callcenter": true,
          "detalle": "Atención general"
        },
        {
          "nombre": "Odontología",
          "turno_callcenter": false,
          "detalle": "Atención odontológica general"
        }
      ]
    }
  ]
}
"""

#### Ejemplo de Request (Con paginación):
"""http
GET /centros_salud?page=1&limit=10 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Con paginación - 200):
"""json
{
  "resultados": [
    {
      "id": "CS001",
      "nombre": "Centro de Salud Centro América",
      "direccion": "Av. Colón 1234",
      "latitud": -31.4135,
      "longitud": -64.1811,
      "zona_programatica": "ZONA_1",
      "servicios": []
    }
  ],
  "pagina": 1,
  "siguientePagina": 2,
  "total": 45,
  "totalPaginas": 5
}
"""

#### Casos de Prueba:
1. GET /centros_salud → Devuelve todos los centros (200)
2. GET /centros_salud?page=1&limit=5 → Devuelve 5 centros, pagina=1 (200)
3. GET /centros_salud?page=999 → resultados=[], pagina=999 (200)
4. GET /centros_salud?limit=50 → Limita a 20 resultados máximo (200)
5. GET /centros_salud (sin Authorization header) → Error 401
6. GET /centros_salud?page=2&limit=10 → siguientePagina=3 o null (200)

#### Notas:
- Sin paginación devuelve formato completo con todos los servicios
- Con paginación devuelve formato más liviano para optimizar transferencia

---

### 3.2 Obtener Centro por ID

**Nombre:** Detalle de Centro de Salud  
**Descripción:** Devuelve información detallada de un centro de salud específico por su ID  
**Método:** "GET"  
**URL:** "/centros_salud/:id"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del centro de salud
  - Ejemplo: "CS001"
- "detail" (string, query parameter, opcional): Nivel de detalle de la respuesta
  - Valores: "lite" | "completo"
  - Por defecto: "lite"
  - Ejemplo: "?detail=completo"

#### Ejemplo de Request:
"""http
GET /centros_salud/CS001?detail=completo HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - formato completo):
"""json
{
  "id": "CS001",
  "nombre": "Centro de Salud Centro América",
  "direccion": "Av. Colón 1234",
  "latitud": -31.4135,
  "longitud": -64.1811,
  "telefono": "0351-4123456",
  "zona_programatica": "ZONA_1",
  "area_programatica": {
    "codigo_area": "AP01",
    "denominacion": "Centro"
  },
  "horarios": "Lunes a Viernes 7:00-19:00",
  "servicios": [
    {
      "nombre": "Clínica Médica",
      "turno_callcenter": true,
      "detalle": "Atención general"
    }
  ]
}
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "Centro no encontrado"
}
"""

#### Casos de Prueba:
1. GET /centros_salud/CS001?detail=lite → Centro con formato reducido (200)
2. GET /centros_salud/CS001?detail=completo → Centro con servicios completos (200)
3. GET /centros_salud/CSXXX → error="Centro no encontrado" (404)
4. GET /centros_salud/cs001 → Normaliza a CS001 y devuelve centro (200)
5. GET /centros_salud/SOM → Centro SOM (200)

#### Notas:
- El ID se normaliza a mayúsculas automáticamente
- Formato lite es optimizado para aplicaciones móviles

---

### 3.3 Obtener Servicios de un Centro

**Nombre:** Servicios de un Centro de Salud  
**Descripción:** Devuelve la lista de servicios disponibles en un centro específico, con opción de filtrar por disponibilidad de callcenter  
**Método:** "GET"  
**URL:** "/centros_salud/:id/servicios"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del centro de salud
  - Ejemplo: "CS001"
- "callcenter" (string, query parameter, opcional): Filtrar por disponibilidad de turno callcenter
  - Valores: "true" | "false"
  - Ejemplo: "?callcenter=true"

#### Ejemplo de Request:
"""http
GET /centros_salud/CS001/servicios?callcenter=true HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
[
  {
    "nombre": "Clínica Médica",
    "turno_callcenter": true,
    "detalle": "Atención general de adultos"
  },
  {
    "nombre": "Pediatría",
    "turno_callcenter": true,
    "detalle": "Atención de niños de 0 a 18 años"
  }
]
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "Centro no encontrado"
}
"""

#### Casos de Prueba:
1. GET /centros_salud/CS001/servicios → Array con todos los servicios (200)
2. GET /centros_salud/CS001/servicios?callcenter=true → Solo servicios con turno_callcenter=true (200)
3. GET /centros_salud/CS001/servicios?callcenter=false → Solo servicios con turno_callcenter=false (200)
4. GET /centros_salud/CSXXX/servicios → error="Centro no encontrado" (404)
5. GET /centros_salud/CS999/servicios → [] si centro sin servicios (200)

#### Notas:
- Si no se especifica callcenter, devuelve todos los servicios
- Útil para mostrar disponibilidad de turnos telefónicos

---

### 3.4 Centro Correspondiente por Ubicación

**Nombre:** Asignación de Centro por Ubicación  
**Descripción:** Determina el centro de salud correspondiente según la ubicación geográfica del usuario (coordenadas GPS). Usa áreas programáticas definidas en polígonos GeoJSON  
**Método:** "GET"  
**URL:** "/centro_correspondiente"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String):
- "lat" (float, requerido): Latitud de la ubicación del usuario
  - Rango: -90 a 90
  - Ejemplo: "lat=-31.4135"
- "lon" (float, requerido): Longitud de la ubicación del usuario
  - Rango: -180 a 180
  - Ejemplo: "lon=-64.1811"

#### Ejemplo de Request:
"""http
GET /centro_correspondiente?lat=-31.4135&lon=-64.1811 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "centro_asignado": {
    "id": "CS001",
    "nombre": "Centro de Salud Centro América",
    "direccion": "Av. Colón 1234",
    "latitud": -31.4135,
    "longitud": -64.1811,
    "telefono": "0351-4123456",
    "zona_programatica": "ZONA_1",
    "distancia": 0.45,
    "servicios": [
      {
        "nombre": "Clínica Médica",
        "turno_callcenter": true
      }
    ]
  }
}
"""

#### Ejemplo de Response (Error - 400):
"""json
{
  "error": "Coordenadas inválidas o no proporcionadas"
}
"""

#### Ejemplo de Response (Error - 422) — *[2026-02-27] NUEVO*:
"""json
{
  "error": "Las coordenadas están fuera del ejido municipal de Córdoba Capital"
}
"""

#### Ejemplo de Response (Error - 404):
"""json
{
  "error": "No se encontró centro de salud para esa ubicación",
  "mensaje": "No pudimos determinar un centro de salud en tu zona"
}
"""

#### Casos de Prueba:
1. lat=-31.4135&lon=-64.1811 → Centro del área programática (200)
2. lat=-31.5000&lon=-64.3000 → Centro asignado del área más cercana (200)
3. lat=-34.6037&lon=-58.3816 → fuera del ejido, error 422 *[2026-02-27]*
4. lat=-32.0&lon=-65.0 → fuera del ejido, error 422 *[2026-02-27]*
5. lat=100&lon=-64.1811 → error="Coordenadas inválidas" (400)
6. lat=-31.4135&lon=200 → error="Coordenadas inválidas" (400)
7. lat=-31.4135 (sin lon) → error="Coordenadas inválidas" (400)
8. lat=-31.4201&lon=-64.1888 → distancia calculada en km (200)

#### Notas:
- Prioriza asignación por área programática (polígonos GeoJSON)
- Si no encuentra centro en el área, devuelve error 404 (NO usa fallback)
- La distancia se calcula en kilómetros usando fórmula Haversine
- Clave para asignación automática en chatbots
- Este endpoint es genérico (no específico de odontología)
- *[2026-02-27]* Valida bbox del ejido (lat -31.1 a -31.7 / lon -63.8 a -64.6) antes de consultar polígonos GeoJSON. Coordenadas fuera del ejido retornan HTTP 422 con mensaje diferenciado, permitiendo que el chatbot responda apropiadamente al ciudadano.

---

### 3.5 Obtener Área Programática por Coordenadas

**Nombre:** Consulta de Área Programática  
**Descripción:** Determina a qué área programática pertenece un punto geográfico específico usando polígonos GeoJSON  
**Método:** "GET"  
**URL:** "/area_programatica"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String):
- "lat" (float, requerido): Latitud del punto
  - Ejemplo: "lat=-31.4135"
- "lon" (float, requerido): Longitud del punto
  - Ejemplo: "lon=-64.1811"

#### Ejemplo de Request:
"""http
GET /area_programatica?lat=-31.4135&lon=-64.1811 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - encontrado):
"""json
{
  "encontrado": true,
  "area": {
    "zona": "ZONA_1",
    "area": "AP01",
    "denominacion": "Centro",
    "properties": {
      "AREA": "AP01",
      "DENOMINACION": "Centro"
    }
  }
}
"""

#### Ejemplo de Response (Error - 422) — *[2026-02-27] NUEVO*:
"""json
{
  "error": "Las coordenadas están fuera del ejido municipal de Córdoba Capital"
}
"""

#### Ejemplo de Response (404 - no encontrado):
"""json
{
  "encontrado": false,
  "mensaje": "No se encontró área programática para esas coordenadas"
}
"""

#### Ejemplo de Response (Error - 500):
"""json
{
  "error": "Error interno",
  "detalle": "Error message details"
}
"""

#### Casos de Prueba:
1. lat=-31.4135&lon=-64.1811 → encontrado=true, area="AP01" (200)
2. lat=-32.0000&lon=-65.0000 → fuera del ejido, error 422 *[2026-02-27]*
3. lat=-31.4200&lon=-64.1900 → Retorna área del polígono que contiene el punto (200)
4. lat=invalid&lon=-64.1811 → error="Coordenadas inválidas" (400)
5. lat=-31.4135&lon=-64.1811 → Verificar properties.AREA existe (200)

#### Notas:
- Usa archivo GeoJSON con polígonos de áreas programáticas
- Implementado con librería @turf/boolean-point-in-polygon
- Útil para análisis geográfico y planificación
- *[2026-02-27]* Valida bbox del ejido antes de consultar polígonos. HTTP 422 para coordenadas fuera de Córdoba Capital.

---

### 3.6 Centros para Mapa (Leaflet)

**Nombre:** Centros de Salud para Visualización en Mapa  
**Descripción:** Devuelve centros de salud en formato optimizado para visualización en mapas interactivos (Leaflet, Google Maps, etc.)  
**Método:** "GET"  
**URL:** "/centros_salud_mapa"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String - Opcional):
- "centro" (string, opcional): Filtrar por ID de centro específico
  - Ejemplo: "?centro=CS001"

#### Ejemplo de Request (Todos los centros):
"""http
GET /centros_salud_mapa HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
[
  {
    "id": "CS001",
    "nombre": "Centro de Salud Centro América",
    "direccion": "Av. Colón 1234",
    "latitud": -31.4135,
    "longitud": -64.1811,
    "zona_programatica": "ZONA_1"
  },
  {
    "id": "CS002",
    "nombre": "Centro de Salud Villa El Libertador",
    "direccion": "Calle 123",
    "latitud": -31.4500,
    "longitud": -64.2000,
    "zona_programatica": "ZONA_2"
  }
]
"""

#### Ejemplo de Request (Centro específico):
"""http
GET /centros_salud_mapa?centro=CS001 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Casos de Prueba:
1. GET /centros_salud_mapa → Array con todos los centros (formato lite) (200)
2. GET /centros_salud_mapa?centro=CS001 → Array con solo CS001 (200)
3. GET /centros_salud_mapa?centro=SOM → Array con solo SOM (200)
4. GET /centros_salud_mapa?centro=CSXXX → [] array vacío (200)
5. GET /centros_salud_mapa → Verificar que no incluye campo servicios (200)

#### Notas:
- Formato ligero optimizado para renderizado en mapas
- No incluye lista de servicios para reducir payload
- Compatible con Leaflet, Mapbox, Google Maps

---

## 4. ZONAS GEOGRÁFICAS (NAVEGACIÓN BOT)

### 4.1 Listar Todas las Zonas Geográficas

**Nombre:** Listado de Zonas  
**Descripción:** Devuelve todas las zonas geográficas disponibles (norte, sur, este, oeste) con conteo de centros. Sistema de navegación diseñado para botoneras de chatbot.  
**Método:** "GET"  
**URL:** "/api/centros/zonas"  
**Autenticación:** JWT Bearer Token (requerido)

#### Ejemplo de Request:
"""http
GET /api/centros/zonas HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "total": 4,
  "zonas": [
    {
      "zona": "norte",
      "total_centros": 24
    },
    {
      "zona": "sur",
      "total_centros": 19
    },
    {
      "zona": "este",
      "total_centros": 26
    },
    {
      "zona": "oeste",
      "total_centros": 30
    }
  ]
}
"""

#### Casos de Prueba:
1. GET /api/centros/zonas → 4 zonas (norte, sur, este, oeste) (200)
2. Verificar que total_centros > 0 en cada zona (200)
3. Verificar que suma de centros = 99 (total de centros con coordenadas válidas) (200)

#### Notas:
- Las zonas geográficas se calculan desde el centro geográfico de Córdoba (lat -31.413542, lon -64.178741)
- Algoritmo: compara distancias latitudinales vs longitudinales para asignar zona
- Solo incluye centros con coordenadas GPS válidas y zona_geografica asignada

---

### 4.2 Listar Centros de una Zona

**Nombre:** Centros por Zona Geográfica  
**Descripción:** Devuelve todos los centros de salud de una zona geográfica específica (norte, sur, este, oeste). Soporta paginación para facilitar la navegación en chatbots.  
**Método:** "GET"  
**URL:** "/api/centros/:zona"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (URL):
- "zona" (string, requerido): Zona geográfica
  - Valores permitidos: "norte", "sur", "este", "oeste"
  - Ejemplo: "/api/centros/norte"

#### Parámetros (Query String - Opcionales):
- "page" (integer, opcional): Número de página para paginación
  - Ejemplo: "page=1"
  - Por defecto: Sin paginación (devuelve todos)
- "limit" (integer, opcional): Cantidad de centros por página (máximo 20)
  - Ejemplo: "limit=5"
  - Por defecto: 5
  - **Recomendado para chatbots:** limit=5 para mostrar en botoneras

#### Ejemplo de Request (Sin paginación):
"""http
GET /api/centros/norte HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Sin paginación - 200):
"""json
{
  "zona": "norte",
  "total": 24,
  "centros": [
    {
      "id": "CS001",
      "nombre": "Centro de Salud General Mosconi",
      "direccion": "Calle Pedro Naon 1330",
      "telefono": "0351-4705811",
      "horarios": "Lunes a Viernes 8:00 - 16:00",
      "zona_geografica": "norte",
      "coordenadas": {
        "latitud": -31.3648,
        "longitud": -64.149057,
        "validas": true
      },
      "area_programatica": {
        "codigo": "1",
        "denominacion": "GENERAL MOSCONI"
      },
      "servicios": [
        "Atención ambulatoria",
        "Control de salud",
        "Vacunación",
        "Odontología"
      ],
      "mapa_url": "https://maps.google.com/maps/search/Centro%20de%20Salud%20General%20Mosconi%2C%20Calle%20Pedro%20Naon%201330/@-31.3648,-64.149057,17z"
    }
    // ... 23 centros más
  ]
}
"""

#### Ejemplo de Request (Con paginación):
"""http
GET /api/centros/norte?page=1&limit=5 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Con paginación - 200):
"""json
{
  "zona": "norte",
  "total": 24,
  "pagina": 1,
  "limite": 5,
  "totalPaginas": 5,
  "hasMore": true,
  "siguientePagina": 2,
  "centros": [
    {
      "id": "CS001",
      "nombre": "Centro de Salud General Mosconi",
      "direccion": "Calle Pedro Naon 1330",
      "telefono": "0351-4705811",
      "horarios": "Lunes a Viernes 8:00 - 16:00",
      "zona_geografica": "norte",
      "coordenadas": {
        "latitud": -31.3648,
        "longitud": -64.149057,
        "validas": true
      },
      "area_programatica": {
        "codigo": "1",
        "denominacion": "GENERAL MOSCONI"
      },
      "servicios": [
        "Atención ambulatoria",
        "Control de salud",
        "Vacunación",
        "Odontología"
      ],
      "mapa_url": "https://maps.google.com/maps/search/..."
    }
    // ... 4 centros más (total 5)
  ]
}
"""

#### Ejemplo de Response (Última página):
"""json
{
  "zona": "norte",
  "total": 24,
  "pagina": 5,
  "limite": 5,
  "totalPaginas": 5,
  "hasMore": false,
  "siguientePagina": null,
  "centros": [
    // ... 4 centros (últimos)
  ]
}
"""

#### Ejemplo de Response (Error - 400):
"""json
{
  "error": "Zona inválida. Valores permitidos: norte, sur, este, oeste",
  "zona_recibida": "nordeste"
}
"""

#### Casos de Prueba:
1. GET /api/centros/norte → 24 centros sin paginación (200)
2. GET /api/centros/norte?page=1&limit=5 → 5 centros, hasMore=true (200)
3. GET /api/centros/norte?page=5&limit=5 → Últimos centros, hasMore=false (200)
4. GET /api/centros/norte?page=999&limit=5 → centros=[], hasMore=false (200)
5. GET /api/centros/oeste?limit=30 → Limita a 20 (máximo) (200)
6. GET /api/centros/sur?page=2&limit=5 → siguientePagina=3 (200)
7. GET /api/centros/NORTE?page=1&limit=5 → Normaliza a minúsculas (200)
8. GET /api/centros/nordeste?page=1 → Error 400 (zona inválida)
9. GET /api/centros/este?limit=5 → page=1 por defecto (200)
10. Verificar que todos tienen campo zona_geografica (200)

#### Notas:
- **Sin parámetros de paginación:** Devuelve todos los centros de la zona
- **Con paginación:** Ideal para chatbots con botoneras (limit=5 recomendado)
- **hasMore:** Indica si hay más páginas disponibles (útil para botón "Ver más")
- **siguientePagina:** Número de página siguiente o null si es la última
- **Límite máximo:** 20 centros por página
- Normaliza la zona a minúsculas automáticamente
- Todos los centros incluyen información completa (servicios, horarios, coordenadas)

---

### 4.3 Buscar Centro por Zona y Nombre/Número

**Nombre:** Búsqueda de Centro Específico  
**Descripción:** Busca un centro específico dentro de una zona geográfica por nombre parcial o por número (acepta 001, 01, o 1). Retorna 404 con sugerencias si no se encuentra.  
**Método:** "GET"  
**URL:** "/api/centros/:zona/:centro"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (URL):
- "zona" (string, requerido): Zona geográfica
  - Valores permitidos: "norte", "sur", "este", "oeste"
  - Ejemplo: "norte"
- "centro" (string, requerido): Nombre parcial del centro o número (sin prefijo CS)
  - Ejemplos: "mosconi", "albertsabin", "001", "01", "1"
  - La búsqueda es case-insensitive y normaliza espacios/guiones

#### Ejemplo de Request (por nombre):
"""http
GET /api/centros/norte/mosconi HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Request (por número):
"""http
GET /api/centros/norte/001 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - Encontrado):
"""json
{
  "zona": "norte",
  "busqueda": "mosconi",
  "total": 1,
  "centros": [
    {
      "id": "CS001",
      "nombre": "Centro de Salud General Mosconi",
      "direccion": "Calle Pedro Naon 1330",
      "telefono": "0351-4705811",
      "horarios": "Lunes a Viernes 8:00 - 16:00",
      "zona_geografica": "norte",
      "coordenadas": {
        "latitud": -31.3648,
        "longitud": -64.149057,
        "validas": true
      },
      "area_programatica": {
        "codigo": "1",
        "denominacion": "GENERAL MOSCONI"
      },
      "servicios": [
        "Atención ambulatoria",
        "Control de salud",
        "Vacunación",
        "Odontología"
      ],
      "mapa_url": "https://maps.google.com/maps/search/..."
    }
  ]
}
"""

#### Ejemplo de Response (404 - No encontrado):
"""json
{
  "success": false,
  "error": "CENTRO_NO_ENCONTRADO",
  "detalle": "No se encontró el centro \"10\" en la zona norte. Centros disponibles: 001 - Centro de Salud General Mosconi, 013 - Centro de Salud Irigoyen, 014 - Centro de Salud General Bustos, 015 - Centro de Salud Remedios De Escalada, 016 - Centro de Salud Zumaran..."
}
"""

#### Ejemplo de Response (400 - Zona inválida):
"""json
{
  "error": "Zona inválida. Valores permitidos: norte, sur, este, oeste",
  "zona_recibida": "centro"
}
"""

#### Casos de Prueba:
1. GET /api/centros/norte/mosconi → CS001 (200)
2. GET /api/centros/sur/albertsabin → CS030 (200)
3. GET /api/centros/norte/001 → CS001 (200)
4. GET /api/centros/norte/01 → CS001 (normaliza a 001) (200)
5. GET /api/centros/norte/1 → Múltiples resultados (CS001, CS010, CS012, etc.) (200)
6. GET /api/centros/norte/noexiste → Error 404 con sugerencias
7. GET /api/centros/invalida/mosconi → Error 400 (zona inválida)
8. GET /api/centros/sur/mosconi → Error 404 (mosconi está en zona norte)
9. Búsqueda case-insensitive: GET /api/centros/norte/MOSCONI → CS001 (200)
10. Búsqueda con espacios: GET /api/centros/norte/general%20mosconi → CS001 (200)

#### Notas:
- **Búsqueda por nombre:** Parcial, case-insensitive, normaliza espacios y guiones
- **Búsqueda por número:** Acepta 001, 01, o 1 (sin prefijo "CS")
  - 001 y 01 retornan resultado exacto (1 centro)
  - 1 puede retornar múltiples resultados (cualquier centro con "1" en su número)
- **Error 404 mejorado:** Incluye número + nombre de los primeros 5 centros disponibles en la zona
- **Formato de sugerencias:** "001 - Centro de Salud General Mosconi"
- Útil para búsqueda directa después de que el usuario selecciona una zona

---

### 4.4 Flujo de Navegación Recomendado para Chatbot

**Ejemplo de integración en botonera de chatbot:**

"""text
┌─────────────────────────────────────────┐
│ 1. Selecciona tu zona:                  │
│ [Norte 🧭] [Sur 🧭] [Este 🧭] [Oeste 🧭] │
│                                         │
│ → Usuario elige "Norte"                 │
│ → GET /api/centros/zonas                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 2. Centros en zona Norte (24):          │
│ • CS001 - General Mosconi               │
│ • CS013 - Irigoyen                      │
│ • CS014 - General Bustos                │
│ ... (mostrar todos o paginar)           │
│                                         │
│ → GET /api/centros/norte                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 3. Búsqueda específica:                 │
│ Usuario escribe: "mosconi" o "001"      │
│                                         │
│ → GET /api/centros/norte/mosconi        │
│ → Mostrar detalles de CS001             │
└─────────────────────────────────────────┘
"""

**Ventajas de este sistema:**
- ✅ Navegación intuitiva por zonas cardinales
- ✅ Búsqueda flexible (nombre parcial o número)
- ✅ Mensajes de error con sugerencias útiles
- ✅ Compatible con botoneras y búsqueda por texto
- ✅ Reducción de opciones progresiva (99 centros → 24 en zona → 1 específico)

---

## 5. HOSPITALES MUNICIPALES

### 5.1 Listar Hospitales Municipales

**Nombre:** Listado de Hospitales  
**Descripción:** Devuelve el listado completo de hospitales municipales o paginado según parámetros  
**Método:** "GET"  
**URL:** "/hospitales"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String - Opcionales):
- "page" (integer, opcional): Número de página para paginación
  - Ejemplo: "page=1"
- "limit" (integer, opcional): Cantidad de resultados por página (máximo 20)
  - Ejemplo: "limit=10"
  - Por defecto: 10

#### Ejemplo de Request (Sin paginación):
"""http
GET /hospitales HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "total": 8,
  "resultados": [
    {
      "id": "HM001",
      "nombre": "Hospital Municipal de Urgencias",
      "direccion": "Catamarca 441",
      "latitud": -31.4201,
      "longitud": -64.1888,
      "telefono": "0351-4342200",
      "horarios": "24 horas",
      "servicios": [
        {
          "nombre": "Guardia de Emergencias",
          "turno_callcenter": false,
          "detalle": "Atención 24hs"
        }
      ]
    }
  ]
}
"""

#### Casos de Prueba:
1. GET /hospitales → Devuelve todos los hospitales (200)
2. GET /hospitales?page=1&limit=5 → 5 hospitales, pagina=1 (200)
3. GET /hospitales?page=2&limit=3 → Hospitales de página 2 (200)
4. GET /hospitales (sin Authorization) → Error 401

#### Notas:
- Similar a centros de salud pero para hospitales municipales
- Incluye servicios de mayor complejidad

---

### 4.2 Obtener Hospital por ID

**Nombre:** Detalle de Hospital  
**Descripción:** Devuelve información detallada de un hospital específico  
**Método:** "GET"  
**URL:** "/hospitales/:id"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del hospital
  - Ejemplo: "HM001"
- "detail" (string, query parameter, opcional): Nivel de detalle
  - Valores: "lite" | "completo"
  - Por defecto: "lite"

#### Ejemplo de Request:
"""http
GET /hospitales/HM001?detail=completo HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "id": "HM001",
  "nombre": "Hospital Municipal de Urgencias",
  "direccion": "Catamarca 441",
  "latitud": -31.4201,
  "longitud": -64.1888,
  "telefono": "0351-4342200",
  "horarios": "24 horas",
  "servicios": [
    {
      "nombre": "Guardia de Emergencias",
      "turno_callcenter": false
    }
  ]
}
"""

#### Casos de Prueba:
1. GET /hospitales/HM001?detail=completo → Hospital con servicios (200)
2. GET /hospitales/HM001?detail=lite → Hospital formato reducido (200)
3. GET /hospitales/HMXXX → error="Hospital no encontrado" (404)

---

### 4.3 Obtener Servicios de un Hospital

**Nombre:** Servicios de Hospital  
**Descripción:** Devuelve la lista de servicios disponibles en un hospital con instrucciones para sacar turnos  
**Método:** "GET"  
**URL:** "/hospitales/:id/servicios"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del hospital
- "callcenter" (string, query parameter, opcional): Filtrar por callcenter
  - Valores: "true" | "false"

#### Ejemplo de Request:
"""http
GET /hospitales/HM001/servicios HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "hospital": {
    "id": "HM001",
    "nombre": "Hospital Municipal de Urgencias",
    "direccion": "Catamarca 441",
    "latitud": -31.4201,
    "longitud": -64.1888
  },
  "servicios": [
    {
      "nombre": "Guardia de Emergencias",
      "turno_callcenter": false
    }
  ],
  "total": 1,
  "instrucciones": "Acercate personalmente al establecimiento para sacar turno en el horario de atención."
}
"""

#### Casos de Prueba:
1. GET /hospitales/HM001/servicios → Todos los servicios + instrucciones (200)
2. GET /hospitales/HM001/servicios?callcenter=true → Solo servicios con callcenter (200)
3. GET /hospitales/HM001/servicios?callcenter=false → Solo servicios presenciales (200)
4. GET /hospitales/HMXXX/servicios → error="Hospital no encontrado" (404)

#### Notas:
- Incluye instrucciones dinámicas para turnos
- Diferencia entre turnos por callcenter y presenciales

---

## 5.5 HOSPITALES DE PRONTA ATENCIÓN (HPA) — *[2026-02-27]*

> Cuatro establecimientos de urgencia distribuidos en el ejido municipal. Atienden las 24 horas.
> Campo `telefono` incorporado al dataset en esta fecha.

### 5.5.1 Listar Todos los HPA

**Nombre:** Listado de HPA
**Método:** "GET"
**URL:** "/api/hpa"
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String - Opcionales):
- "page" (integer, opcional): Número de página
- "limit" (integer, opcional): Cantidad por página (máx 20, default 10)

#### Ejemplo de Request:
"""http
GET /api/hpa HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "total": 4,
  "resultados": [
    {
      "id": "HPACB",
      "nombre": "Hospital Pronta Atención Cura Brochero",
      "direccion": "Av. Cura Brochero 2990, Córdoba",
      "telefono": "03543 40-7299",
      "horarios": "07:00 a 14:00 hs",
      "coordenadas": {
        "latitud": -31.3735,
        "longitud": -64.1916,
        "validas": true
      },
      "servicios": ["Guardia / Emergencia", "Shockroom", "Laboratorio", "Imágenes / Radiología", "Farmacia"]
    },
    {
      "id": "HPAMC",
      "nombre": "Hospital Pronta Atención Maria Teresa De Calcuta",
      "direccion": "Av. Valparaíso 5595, Córdoba",
      "telefono": "0351 483-1676",
      "horarios": "07:00 a 14:00 hs",
      "coordenadas": { "latitud": -31.4488, "longitud": -64.2389, "validas": true }
    },
    {
      "id": "HPASJ",
      "nombre": "Hospital Pronta Atención San Jorge",
      "direccion": "Av. Richieri 2200, Córdoba",
      "telefono": "0351 327-9181",
      "horarios": "07:00 a 14:00 hs",
      "coordenadas": { "latitud": -31.3869, "longitud": -64.1353, "validas": true }
    },
    {
      "id": "HPACP",
      "nombre": "Hospital Pronta Atención Comipaz",
      "direccion": "Av. Vélez Sarsfield 5100, Córdoba",
      "telefono": "0351 445-6667",
      "horarios": "07:00 a 14:00 hs",
      "coordenadas": { "latitud": -31.4385, "longitud": -64.1283, "validas": true }
    }
  ]
}
"""

#### Casos de Prueba:
1. GET /api/hpa → 4 HPA con telefono (200)
2. GET /api/hpa?page=1&limit=2 → 2 resultados paginados (200)
3. GET /api/hpa (sin Authorization) → Error 401

---

### 5.5.2 Obtener HPA por ID

**Nombre:** Detalle de HPA
**Método:** "GET"
**URL:** "/api/hpa/:id"
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del HPA
  - Valores válidos: "HPACB" | "HPAMC" | "HPASJ" | "HPACP"

#### Ejemplo de Request:
"""http
GET /api/hpa/HPACB HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "id": "HPACB",
  "nombre": "Hospital Pronta Atención Cura Brochero",
  "direccion": "Av. Cura Brochero 2990, Córdoba",
  "telefono": "03543 40-7299",
  "horarios": "07:00 a 14:00 hs",
  "coordenadas": { "latitud": -31.3735, "longitud": -64.1916, "validas": true },
  "servicios": [
    { "nombre": "Guardia / Emergencia", "turno_callcenter": false },
    { "nombre": "Shockroom", "turno_callcenter": false },
    { "nombre": "Laboratorio", "turno_callcenter": false },
    { "nombre": "Imágenes / Radiología", "turno_callcenter": false },
    { "nombre": "Farmacia", "turno_callcenter": false }
  ]
}
"""

#### Ejemplo de Response (Error - 404):
"""json
{ "error": "HPA no encontrado" }
"""

#### Casos de Prueba:
1. GET /api/hpa/HPACB → Cura Brochero con telefono (200)
2. GET /api/hpa/HPAMC → Maria Teresa De Calcuta (200)
3. GET /api/hpa/HPASJ → San Jorge (200)
4. GET /api/hpa/HPACP → Comipaz (200)
5. GET /api/hpa/HPAXXX → error 404

#### Notas:
- Los 4 HPA tienen `turno_callcenter: false` en todos sus servicios (no se sacan turnos por callcenter)
- Teléfonos directos *[2026-02-27]*: HPACB 03543 40-7299 / HPAMC 0351 483-1676 / HPASJ 0351 327-9181 / HPACP 0351 445-6667

---

## 5.6 ZONAS PROGRAMÁTICAS — *[2026-02-27]*

> Permite consultar los 100 centros de salud agrupados por su `zona_programatica` (código numérico "01"–"06"). Distinto de la zona geográfica (norte/sur/este/oeste).

### 5.6.1 Listar Todas las Zonas Programáticas

**Nombre:** Listado de Zonas Programáticas
**Método:** "GET"
**URL:** "/api/zonas_programaticas"
**Autenticación:** JWT Bearer Token (requerido)

#### Ejemplo de Request:
"""http
GET /api/zonas_programaticas HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "total": 6,
  "zonas_programaticas": [
    { "zona_programatica": "01", "total_centros": 16 },
    { "zona_programatica": "02", "total_centros": 14 },
    { "zona_programatica": "03", "total_centros": 16 },
    { "zona_programatica": "04", "total_centros": 17 },
    { "zona_programatica": "05", "total_centros": 21 },
    { "zona_programatica": "06", "total_centros": 16 }
  ]
}
"""

---

### 5.6.2 Centros por Zona Programática

**Nombre:** Centros de una Zona Programática
**Método:** "GET"
**URL:** "/api/zonas_programaticas/:zona"
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "zona" (string, path): Código de zona ("01"–"06"). Se acepta "1"–"6" (se normaliza automáticamente).
- "page" (integer, query, opcional): Número de página
- "limit" (integer, query, opcional): Resultados por página (máx 20, default 10)

#### Ejemplo de Request:
"""http
GET /api/zonas_programaticas/01 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 — sin paginación):
"""json
{
  "zona_programatica": "01",
  "total": 16,
  "centros": [
    {
      "id": "CS001",
      "nombre": "Centro de Salud General Mosconi",
      "direccion": "Pedro Naón 1330, Córdoba",
      "zona_programatica": "01",
      "coordenadas": { "latitud": -31.415277, "longitud": -64.200531, "validas": true },
      "horarios": "07:00 a 14:00 hs",
      "servicios": [ { "nombre": "Medicina Familiar", "turno_callcenter": true } ]
    }
  ]
}
"""

#### Ejemplo de Response (Error - 404):
"""json
{
  "error": "Zona programática \"07\" no encontrada. Zonas disponibles: 01, 02, 03, 04, 05, 06"
}
"""

#### Casos de Prueba:
1. GET /api/zonas_programaticas/01 → 16 centros (200)
2. GET /api/zonas_programaticas/1 → mismo resultado (normaliza a "01") (200)
3. GET /api/zonas_programaticas/05 → 21 centros (200)
4. GET /api/zonas_programaticas/07 → error 404
5. GET /api/zonas_programaticas/01?page=1&limit=5 → 5 centros paginados (200)

---

## 6. ODONTOLOGÍA

### 6.1 Centro Cercano con Odontología

**Nombre:** Búsqueda de Centro con Odontología  
**Descripción:** Encuentra el centro de salud más cercano con servicio de odontología según la ubicación del usuario. Prioriza centros dentro del área programática  
**Método:** "GET"  
**URL:** "/api/odontologia/cercano"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String):
- "lat" (float, requerido): Latitud de la ubicación
  - Ejemplo: "lat=-31.4135"
- "lon" (float, requerido): Longitud de la ubicación
  - Ejemplo: "lon=-64.1811"
- "debug" (string, opcional): Modo debug para ver asignación
  - Valores: "0" | "1"
  - Ejemplo: "?debug=1"

#### Ejemplo de Request:
"""http
GET /api/odontologia/cercano?lat=-31.4135&lon=-64.1811 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - Centro encontrado):
"""json
{
  "encontrado": true,
  "centro": {
    "id": "CS001",
    "nombre": "Centro de Salud Centro América",
    "direccion": "Av. Colón 1234",
    "zona_programatica": "ZONA_1",
    "distancia": 0.45,
    "coordenadas": {
      "latitud": -31.4135,
      "longitud": -64.1811
    }
  },
  "turno": {
    "callcenter": true,
    "presencial": true,
    "instrucciones": "Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs."
  }
}
"""

#### Ejemplo de Response (200 - No encontrado):
"""json
{
  "encontrado": false,
  "mensaje": "No encontramos un centro con odontología en tu zona",
  "sugerencia": "centros_lejanos"
}
"""

#### Ejemplo de Response (Debug Mode):
"""json
{
  "debug": true,
  "asignado": {
    "id": "CS001",
    "nombre": "Centro de Salud Centro América",
    "distancia": 0.450
  },
  "asignado_tiene_odonto": true
}
"""

#### Casos de Prueba:
1. lat=-31.4135&lon=-64.1811 → encontrado=true, centro con odontología (200)
2. lat=-31.5000&lon=-64.3000 → encontrado=false, sugerencia="centros_lejanos" (200)
3. lat=-31.4135&lon=-64.1811&debug=1 → Modo debug con info de asignación (200)
4. lat=-31.4201&lon=-64.1888 → Centro con turno.callcenter=true (200)
5. lat=-31.4300&lon=-64.2000 → Centro con turno.callcenter=false (200)
6. lat=invalid&lon=-64.1811 → error="Coordenadas inválidas" (400)

#### Notas:
- Prioriza centros dentro del área programática del usuario; si no encuentra, responde encontrado=false y sugiere centros_lejanos
- Distancia máxima de búsqueda configurada: 10 km
- turno.callcenter / turno.presencial pueden variar según el centro y reflejan la lógica de turnos del servicio
- Incluye debug=1 para diagnóstico de asignación (no usar en producción para usuarios finales)
- Detecta "odonto" de forma flexible (normaliza acentos)

---

### 6.2 Centros Lejanos con Odontología

**Nombre:** Centros con Odontología Fuera de Zona  
**Descripción:** Devuelve centros con odontología que están fuera del área programática del usuario, como sugerencias alternativas  
**Método:** "GET"  
**URL:** "/api/odontologia/lejanos"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String):
- "lat" (float, requerido): Latitud de la ubicación
  - Ejemplo: "lat=-31.4135"
- "lon" (float, requerido): Longitud de la ubicación
  - Ejemplo: "lon=-64.1811"
- "limit" (integer, opcional): Cantidad máxima de resultados (máximo 10)
  - Por defecto: 3
  - Ejemplo: "?limit=5"

#### Ejemplo de Request:
"""http
GET /api/odontologia/lejanos?lat=-31.4135&lon=-64.1811&limit=5 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - Con centros):
"""json
{
  "centros": [
    {
      "id": "CS015",
      "nombre": "Centro de Salud Villa Allende",
      "direccion": "Calle Falsa 123",
      "zona_programatica": "ZONA_5",
      "distancia": 12.5,
      "turno_callcenter": true,
      "instrucciones": "Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs."
    },
    {
      "id": "CS023",
      "nombre": "Centro de Salud La Calera",
      "direccion": "Av. Principal 456",
      "zona_programatica": "ZONA_8",
      "distancia": 15.3,
      "turno_callcenter": false,
      "instrucciones": "Acercate personalmente al centro para sacar turno en el horario de atención."
    }
  ],
  "total": 2,
  "mensaje": "Estos centros están fuera de tu zona programática pero cuentan con odontología"
}
"""

#### Ejemplo de Response (200 - Fallback a SOM cuando no hay centros):
"""json
{
  "centros": [],
  "total": 0,
  "fallback_som": true,
  "som": {
    "id": "SOM",
    "nombre": "Servicio Odontológico Municipal",
    "direccion": "San Martín 850, Córdoba",
    "telefono": "0800-888-5555",
    "horarios": "Lunes a Viernes 7:00-14:00",
    "coordenadas": {
      "latitud": -31.4201,
      "longitud": -64.1888
    }
  },
  "mensaje": "No encontramos centros con odontología disponibles. Te recomendamos acercarte al Servicio Odontológico Municipal (SOM)",
  "instrucciones": "El SOM ofrece servicios odontológicos especializados. Podés solicitar turno llamando al 0800-888-5555 o acercándote a San Martín 850, Córdoba"
}
"""

#### Casos de Prueba:
1. lat=-31.4135&lon=-64.1811 → Devuelve 3 centros lejanos (por defecto) (200)
2. lat=-31.4135&lon=-64.1811&limit=5 → Devuelve 5 centros lejanos (200)
3. lat=-31.4135&lon=-64.1811&limit=15 → Limita a 10 centros máximo (200)
4. lat=-31.4135&lon=-64.1811&limit=1 → Devuelve 1 centro más cercano fuera del área (200)
5. lat=-32.0000&lon=-65.0000 → Centros ordenados por distancia ascendente (200)
6. lat=coordenadas sin centros cercanos → fallback_som=true con datos del SOM (200)

#### Notas:
- Devuelve opciones alternativas fuera del centro asignado por área (ordenados por distancia ascendente)
- limit tiene tope (máx. 10) y default: 3
- Útil cuando el centro correspondiente no tiene odontología, o cuando el usuario quiere ver otras opciones
- **FALLBACK A SOM**: Si no hay centros lejanos disponibles, devuelve información del SOM
- Este es el endpoint final del flujo de odontología: cercano → lejanos → SOM

---

### 6.3 Odontología por CUIL

**Nombre:** Centro con Odontología por CUIL
**Descripción:** Verifica si el centro de salud asignado al paciente (según su CUIL) cuenta con servicio de odontología. Opcionalmente busca alternativas cercanas si el centro asignado no tiene odontología.
**Método:** "GET"
**URL:** "/api/odontologia/cuil/:cuil"
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Path):
- "cuil" (string, requerido): CUIL del paciente, solo dígitos (10 u 11 caracteres)
  - Ejemplo: "27243949810"

#### Parámetros (Query String):
- "alternativas" (boolean, opcional): Si es `true`, incluye centros cercanos con odontología cuando el asignado no tiene el servicio
  - Por defecto: `false`
  - Ejemplo: `?alternativas=true`
- "limit" (integer, opcional): Cantidad de alternativas a devolver (máximo 10). Solo aplica si `alternativas=true`
  - Por defecto: 3
  - Ejemplo: `?alternativas=true&limit=5`

#### Ejemplo de Request:
"""http
GET /api/odontologia/cuil/27243949810 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - Centro asignado SÍ tiene odontología):
"""json
{
  "encontrado": true,
  "origen": "cuil",
  "centro": {
    "id": "CS004",
    "nombre": "Centro de Salud Municipal N°4",
    "direccion": "Av. Colón 1234, Córdoba",
    "zona_programatica": "ZONA_2",
    "coordenadas": {
      "latitud": -31.4201,
      "longitud": -64.1888
    }
  },
  "turno": {
    "callcenter": true,
    "presencial": true,
    "instrucciones": "Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs."
  }
}
"""

#### Ejemplo de Response (200 - Centro asignado NO tiene odontología, sin alternativas):
"""json
{
  "encontrado": false,
  "origen": "cuil",
  "centro_asignado": {
    "id": "CS012",
    "nombre": "Centro de Salud Municipal N°12",
    "direccion": "Bv. San Juan 890, Córdoba"
  },
  "mensaje": "Tu centro de salud asignado no cuenta con odontología."
}
"""

#### Ejemplo de Response (200 - Centro asignado NO tiene odontología, con alternativas):
"""http
GET /api/odontologia/cuil/27243949810?alternativas=true HTTP/1.1
"""
"""json
{
  "encontrado": false,
  "origen": "cuil",
  "centro_asignado": {
    "id": "CS012",
    "nombre": "Centro de Salud Municipal N°12",
    "direccion": "Bv. San Juan 890, Córdoba"
  },
  "mensaje": "Tu centro de salud asignado no cuenta con odontología.",
  "alternativas": {
    "centros": [
      {
        "id": "CS004",
        "nombre": "Centro de Salud Municipal N°4",
        "direccion": "Av. Colón 1234, Córdoba",
        "zona_programatica": "ZONA_2",
        "distancia": 2.3,
        "turno_callcenter": true,
        "instrucciones": "Podés sacar turno llamando al 0800-888-5555, de Lunes a Viernes de 7:00 a 19:00hs."
      }
    ],
    "total": 1,
    "mensaje": "Centros con odontología más cercanos a tu centro asignado:"
  }
}
"""

#### Ejemplo de Response (400 - CUIL inválido):
"""json
{
  "error": "CUIL inválido",
  "detalle": "El CUIL debe contener solo dígitos (10 u 11 caracteres)"
}
"""

#### Ejemplo de Response (404 - CUIL no encontrado en el padrón):
"""json
{
  "error": "CUIL no encontrado en el padrón"
}
"""

#### Casos de Prueba:
1. CUIL válido, centro asignado con odontología → `encontrado: true`, datos del centro y turno (200)
2. CUIL válido, centro asignado sin odontología → `encontrado: false`, `centro_asignado` y mensaje (200)
3. CUIL válido, sin odontología + `?alternativas=true` → `encontrado: false` + array `alternativas.centros` (200)
4. CUIL válido, sin odontología + `?alternativas=true&limit=5` → hasta 5 alternativas (200)
5. CUIL con letras o longitud incorrecta → 400 CUIL inválido
6. CUIL no registrado en el padrón → 404
7. CUIL sin área programática asignada → 404 con mensaje descriptivo

#### Notas:
- Internamente usa el mismo servicio que `/api/cuil/:cuil/centro` para resolver el centro asignado
- Si el centro asignado no tiene coordenadas válidas, el campo `alternativas` indicará que no es posible buscar opciones cercanas
- El flujo recomendado para el chatbot es: primero llamar sin `?alternativas=true`, y solo si `encontrado=false` volver a llamar con `?alternativas=true`
- En caso de no haber alternativas disponibles, la respuesta incluye fallback al SOM (Servicio Odontológico Municipal)

---

### 5.3 Test Odontología (Legacy)

**Nombre:** Test de Asignación Odontológica (Legacy)  
**Descripción:** Endpoint legacy para compatibilidad. Devuelve caso A, B o C según disponibilidad de odontología en centro asignado  
**Método:** "GET"  
**URL:** "/test_odo"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query String):
- "lat" (float, requerido): Latitud
- "lon" (float, requerido): Longitud

#### Ejemplo de Request:
"""http
GET /test_odo?lat=-31.4135&lon=-64.1811 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Caso A - Odonto con callcenter):
"""json
{
  "caso": "A",
  "centro": {
    "id": "CS001",
    "nombre": "Centro de Salud Centro América",
    "direccion": "Av. Colón 1234",
    "distancia": 0.45
  },
  "instrucciones": "Tu centro de salud cuenta con el servicio de odontología activo y podés sacar turno llamando a nuestro 0800-888-5555"
}
"""

#### Ejemplo de Response (Caso B - Odonto sin callcenter):
"""json
{
  "caso": "B",
  "centro": {
    "id": "CS002",
    "nombre": "Centro de Salud Norte",
    "direccion": "Calle Norte 789",
    "zona_programatica": "ZONA_2",
    "distancia": 1.2
  },
  "instrucciones": "Tu centro de salud cuenta con el servicio de odontología activo. Para sacar turno deberás acercarte personalmente al centro"
}
"""

#### Ejemplo de Response (Caso C - Fallback a SOM):
"""json
{
  "caso": "C",
  "centro": {
    "id": "SOM",
    "nombre": "Servicio Odontológico Municipal",
    "direccion": "San Martín 850",
    "horarios": "Lunes a Viernes 7:00-14:00"
  },
  "instrucciones": "Te recomendamos acercarte al Servicio Odontológico Municipal (SOM) para atención odontológica"
}
"""

#### Casos de Prueba:
1. lat=-31.4135&lon=-64.1811 → caso="A" (odonto con callcenter) (200)
2. lat=-31.4300&lon=-64.2000 → caso="B" (odonto sin callcenter) (200)
3. lat=-31.5000&lon=-64.3500 → caso="C" (fallback a SOM) (200)
4. lat=invalid&lon=-64.1811 → error="Coordenadas inválidas" (400)

#### Notas:
- Mantener por compatibilidad con sistemas legacy
- Preferir usar "/api/odontologia/cercano" para nuevas implementaciones
- Casos: A (callcenter), B (presencial), C (SOM fallback)

---

## 7. SERVICIOS ESPECIALIZADOS SOM

### 7.1 Servicios Odontológicos Especializados

**Nombre:** Listado de Servicios Especializados del SOM  
**Descripción:** Devuelve todos los servicios odontológicos especializados disponibles en el Servicio Odontológico Municipal (SOM) con información completa e instrucciones  
**Método:** "GET"  
**URL:** "/api/servicios_odontologicos/servicios"  
**Autenticación:** JWT Bearer Token (requerido)

#### Ejemplo de Request:
"""http
GET /api/servicios_odontologicos/servicios HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""
d
#### Ejemplo de Response (200):
"""json
{
  "centro": {
    "id": "SOM",
    "nombre": "Servicio Odontológico Municipal",
    "direccion": "San Martín 850, Córdoba",
    "telefono": "0800-888-5555",
    "horarios": "Lunes a Viernes 7:00-14:00",
    "ubicacion": "San Martín 850, Córdoba",
    "coordenadas": {
      "latitud": -31.4201,
      "longitud": -64.1888
    }
  },
  "servicios_especializados": [
    {
      "nombre": "Cirugía Bucal",
      "detalle": "Extracciones complejas, terceros molares, quistes",
      "turno_callcenter": false,
      "presencial": true
    },
    {
      "nombre": "Endodoncia",
      "detalle": "Tratamiento de conductos",
      "turno_callcenter": false,
      "presencial": true
    },
    {
      "nombre": "Periodoncia",
      "detalle": "Tratamiento de encías y tejidos de soporte",
      "turno_callcenter": false,
      "presencial": true
    },
    {
      "nombre": "Prótesis Dental",
      "detalle": "Prótesis removibles y fijas",
      "turno_callcenter": false,
      "presencial": true
    }
  ],
  "instrucciones": {
    "paso_1": "Solicitá turno para Derivaciones (SOM) por CallCenter: 0800-888-5555 (Lunes a Viernes 7:00-19:00hs)",
    "paso_2": "Concurrí al SOM (San Martín 850) el día y horario indicado",
    "paso_3": "Según evaluación en Derivaciones, se gestiona el acceso a especialidades"
  },
  "total_servicios": 4
}
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "SOM no encontrado",
  "mensaje": "No se encontró el Servicio Odontológico Municipal"
}
"""

#### Casos de Prueba:
1. GET /api/servicios_odontologicos/servicios → Lista completa de servicios SOM (200)
2. GET /api/servicios_odontologicos/servicios → Verificar centro.id="SOM" (200)
3. GET /api/servicios_odontologicos/servicios → total_servicios >= 4 (200)
4. GET /api/servicios_odontologicos/servicios → Verificar instrucciones.paso_1 existe (200)
5. GET /api/servicios_odontologicos/servicios (sin token) → Error 401

#### Notas:
- Este endpoint devuelve información institucional del SOM + listado de servicios especializados + cómo gestionar turno
- El turno para "Derivaciones" se gestiona por CallCenter (0800) y no requiere derivación médica previa
- "Derivaciones" es el área/servicio administrativo del SOM, no una derivación médica previa
- La asignación del turno para la especialidad puede depender de la evaluación/derivación interna del SOM
- Horario del SOM: Lunes a Viernes 7:00-14:00 | Ubicación fija: San Martín 850, Córdoba

---

## 8. DIRECCIONES DE ESPECIALIDADES MÉDICAS (DEM)

### 8.1 Listar Todos los DEMs

**Nombre:** Listado de Direcciones de Especialidades Médicas  
**Descripción:** Devuelve el listado completo de las Direcciones de Especialidades Médicas (DEM) en formato lite, sin incluir los servicios. Permite filtrar por IDs específicos.  
**Método:** "GET"  
**URL:** "/dem"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query):
- "id" (string, query parameter, opcional): IDs de DEMs a filtrar, separados por comas
  - Valores: "DC", "DN", "DO" o combinaciones: "DC,DO"
  - Ejemplo: "?id=DC" o "?id=DC,DO"

#### Ejemplo de Request (todos los DEMs):
"""http
GET /dem HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - todos):
"""json
{
  "total": 3,
  "filtro": null,
  "resultados": [
    {
      "id": "DC",
      "nombre": "Dirección de Especialidades Médicas Centro",
      "direccion": "Santa Rosa 360",
      "latitud": -31.410921,
      "longitud": -64.187266,
      "horarios": "7:00 a 18:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/Direcci%C3%B3n%20de%20Especialidades%20M%C3%A9dicas%20Centro%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
    },
    {
      "id": "DN",
      "nombre": "Dirección de Especialidades Médicas Norte",
      "direccion": "Anacreonte esq. Jujuy - Bº Alta Córdoba",
      "latitud": -31.379501,
      "longitud": -64.181353,
      "horarios": "7:00 a 18:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/Direcci%C3%B3n%20de%20Especialidades%20M%C3%A9dicas%20Norte%2C%20Anacreonte%20esq.%20Jujuy/@-31.379501,-64.181353,17z"
    },
    {
      "id": "DO",
      "nombre": "Dirección de Especialidades Médicas Oeste Dr. Benito Soria",
      "direccion": "Deán Funes 2000, Córdoba",
      "latitud": -31.407888,
      "longitud": -64.209959,
      "horarios": "7:00 a 18:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/Direcci%C3%B3n%20de%20Especialidades%20M%C3%A9dicas%20Oeste%2C%20De%C3%A1n%20Funes%202000/@-31.407888,-64.209959,17z"
    }
  ]
}
"""

#### Ejemplo de Request (filtrado por ID):
"""http
GET /dem?id=DC HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - filtrado):
"""json
{
  "total": 1,
  "filtro": ["DC"],
  "resultados": [
    {
      "id": "DC",
      "nombre": "Dirección de Especialidades Médicas Centro",
      "direccion": "Santa Rosa 360",
      "latitud": -31.410921,
      "longitud": -64.187266,
      "horarios": "7:00 a 18:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/Direcci%C3%B3n%20de%20Especialidades%20M%C3%A9dicas%20Centro%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
    }
  ]
}
"""

#### Casos de Prueba:
1. GET /dem → Devuelve los 3 DEMs (200)
2. GET /dem?id=DC → Devuelve solo DEM Centro (200)
3. GET /dem?id=DC,DO → Devuelve DEMs Centro y Oeste (200)
4. GET /dem?id=dc → Normaliza a DC y devuelve DEM Centro (200)
5. GET /dem (sin Authorization header) → Error 401
6. GET /dem → Verificar que incluye campo mapa_url (200)
7. GET /dem → Verificar que no incluye campo servicios (200)

#### Notas:
- Formato lite optimizado para listados rápidos
- No incluye servicios para reducir payload
- Útil para mostrar ubicaciones de DEMs en mapas o listas
- El campo "filtro" indica qué IDs se aplicaron (null si no hay filtro)
- Los IDs se normalizan automáticamente a mayúsculas
- El campo mapa_url apunta directamente a Google Maps con coordenadas exactas

---

### 8.2 Obtener DEM por ID

**Nombre:** Detalle de Dirección de Especialidades Médicas  
**Descripción:** Devuelve información detallada de un DEM específico por su ID, con opción de incluir o excluir servicios  
**Método:** "GET"  
**URL:** "/dem/:id"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del DEM
  - Valores: "DC" (Centro), "DN" (Norte), "DO" (Oeste)
  - Ejemplo: "DC"
- "detail" (string, query parameter, opcional): Nivel de detalle de la respuesta
  - Valores: "lite" | "completo"
  - Por defecto: "completo" (incluye servicios)
  - Ejemplo: "?detail=lite"

#### Ejemplo de Request (formato completo):
"""http
GET /dem/DC HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - formato completo):
"""json
{
  "id": "DC",
  "nombre": "Dirección de Especialidades Médicas Centro",
  "direccion": "Santa Rosa 360",
  "latitud": -31.410921,
  "longitud": -64.187266,
  "horarios": "7:00 a 18:00 hs",
  "zona_programatica": "00",
  "area_programatica": {
    "codigo_area": "DC",
    "denominacion": "Dirección de Especialidades Médicas Centro"
  },
  "servicios": [
    {
      "nombre": "Cardiología",
      "turno_callcenter": true
    },
    {
      "nombre": "Clínica Médica",
      "turno_callcenter": true
    },
    {
      "nombre": "Circuito De La Mujer",
      "turno_callcenter": false
    },
    {
      "nombre": "Dermatología",
      "turno_callcenter": true
    },
    {
      "nombre": "Ecografía",
      "turno_callcenter": true
    }
  ],
  "mapa_url": "https://maps.google.com/maps/search/Direcci%C3%B3n%20de%20Especialidades%20M%C3%A9dicas%20Centro%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
}
"""

#### Ejemplo de Request (formato lite):
"""http
GET /dem/DC?detail=lite HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - formato lite):
"""json
{
  "id": "DC",
  "nombre": "Dirección de Especialidades Médicas Centro",
  "direccion": "Santa Rosa 360",
  "latitud": -31.410921,
  "longitud": -64.187266,
  "horarios": "7:00 a 18:00 hs",
  "mapa_url": "https://maps.google.com/maps/search/Direcci%C3%B3n%20de%20Especialidades%20M%C3%A9dicas%20Centro%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
}
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "DEM no encontrado",
  "id_solicitado": "DX"
}
"""

#### Casos de Prueba:
1. GET /dem/DC → DEM con servicios completos y mapa_url (200)
2. GET /dem/DC?detail=lite → DEM sin servicios pero con mapa_url (200)
3. GET /dem/DN?detail=completo → DEM Norte con servicios (200)
4. GET /dem/DO → DEM Oeste con servicios (200)
5. GET /dem/dc → Normaliza a DC y devuelve DEM (200)
6. GET /dem/DX → error="DEM no encontrado" (404)
7. GET /dem/DC (sin token) → Error 401

#### Notas:
- El ID se normaliza a mayúsculas automáticamente
- Formato completo (por defecto) incluye todos los servicios y mapa_url
- Formato lite incluye información básica: dirección, horarios, coordenadas y mapa_url
- Los servicios incluyen el campo turno_callcenter para saber si se pueden gestionar telefónicamente
- El campo mapa_url está presente en ambos formatos (lite y completo)
- URLs de Google Maps apuntan directamente a la ubicación exacta con zoom 17z

---

### 8.3 Obtener Servicios de un DEM

**Nombre:** Servicios de un DEM  
**Descripción:** Devuelve la lista de servicios disponibles en un DEM específico, con opción de filtrar por disponibilidad de turno callcenter  
**Método:** "GET"  
**URL:** "/dem/:id/servicios"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del DEM
  - Ejemplo: "DC"
- "callcenter" (string, query parameter, opcional): Filtrar por disponibilidad de turno callcenter
  - Valores: "true" | "false"
  - Ejemplo: "?callcenter=true"

#### Ejemplo de Request (todos los servicios):
"""http
GET /dem/DC/servicios HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "dem": {
    "id": "DC",
    "nombre": "Dirección de Especialidades Médicas Centro",
    "direccion": "Santa Rosa 360",
    "latitud": -31.410921,
    "longitud": -64.187266
  },
  "servicios": [
    {
      "nombre": "Cardiología",
      "turno_callcenter": true
    },
    {
      "nombre": "Clínica Médica",
      "turno_callcenter": true
    },
    {
      "nombre": "Circuito De La Mujer",
      "turno_callcenter": false
    },
    {
      "nombre": "Dermatología",
      "turno_callcenter": true
    },
    {
      "nombre": "Ecografía",
      "turno_callcenter": true
    }
  ],
  "total": 27,
  "filtro_callcenter": null
}
"""

#### Ejemplo de Request (solo con callcenter):
"""http
GET /dem/DC/servicios?callcenter=true HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - filtrado):
"""json
{
  "dem": {
    "id": "DC",
    "nombre": "Dirección de Especialidades Médicas Centro",
    "direccion": "Santa Rosa 360",
    "latitud": -31.410921,
    "longitud": -64.187266
  },
  "servicios": [
    {
      "nombre": "Cardiología",
      "turno_callcenter": true
    },
    {
      "nombre": "Clínica Médica",
      "turno_callcenter": true
    },
    {
      "nombre": "Dermatología",
      "turno_callcenter": true
    },
    {
      "nombre": "Ecografía",
      "turno_callcenter": true
    }
  ],
  "total": 21,
  "filtro_callcenter": true
}
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "DEM no encontrado",
  "id_solicitado": "DX"
}
"""

#### Casos de Prueba:
1. GET /dem/DC/servicios → Array con todos los servicios (200)
2. GET /dem/DC/servicios?callcenter=true → Solo servicios con turno_callcenter=true (200)
3. GET /dem/DC/servicios?callcenter=false → Solo servicios con turno_callcenter=false (200)
4. GET /dem/DN/servicios → Servicios del DEM Norte (200)
5. GET /dem/DO/servicios?callcenter=true → Servicios del DEM Oeste con callcenter (200)
6. GET /dem/DX/servicios → error="DEM no encontrado" (404)
7. GET /dem/DC/servicios (sin token) → Error 401

#### Notas:
- Si no se especifica callcenter, devuelve todos los servicios
- filtro_callcenter en la respuesta indica el filtro aplicado (true, false, o null para todos)
- Útil para mostrar disponibilidad de turnos telefónicos
- El DEM Centro (DC) tiene la mayor cantidad de especialidades
- Los servicios varían según la ubicación del DEM (Centro, Norte, Oeste)

---

## 9. CENTROS ESPECIALIZADOS (CENESP)

### 9.1 Listar Todos los Centros Especializados

**Nombre:** Listado de Centros Especializados  
**Descripción:** Devuelve el listado completo de centros especializados en formato lite, sin incluir los servicios. Permite filtrar por IDs específicos.  
**Método:** "GET"  
**URL:** "/cenesp"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros (Query):
- "id" (string, query parameter, opcional): IDs de centros a filtrar, separados por comas
  - Valores: "MP", "PLM", "CSMCT", "CAL", "CACJ", "CACLA" o combinaciones: "MP,CSMCT"
  - Ejemplo: "?id=MP" o "?id=MP,CSMCT"

#### Ejemplo de Request (todos):
"""http
GET /cenesp HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - todos):
"""json
{
  "total": 6,
  "filtro": null,
  "resultados": [
    {
      "id": "MP",
      "nombre": "Medicina Preventiva",
      "direccion": "Santa Rosa 360",
      "latitud": -31.410921,
      "longitud": -64.187266,
      "telefono": "No especificado",
      "horarios": "07:00 a 13:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/Medicina%20Preventiva%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
    },
    {
      "id": "CSMCT",
      "nombre": "Centro de Salud Mental Comunitaria Tramas",
      "direccion": "San Jerónimo 2573, B° San Vicente",
      "latitud": -31.4228185,
      "longitud": -64.150846,
      "telefono": "3512266003",
      "horarios": "08:00 a 18:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/..."
    }
  ]
}
"""

#### Ejemplo de Request (filtrado):
"""http
GET /cenesp?id=MP HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - filtrado):
"""json
{
  "total": 1,
  "filtro": ["MP"],
  "resultados": [
    {
      "id": "MP",
      "nombre": "Medicina Preventiva",
      "direccion": "Santa Rosa 360",
      "latitud": -31.410921,
      "longitud": -64.187266,
      "telefono": "No especificado",
      "horarios": "07:00 a 13:00 hs",
      "mapa_url": "https://maps.google.com/maps/search/Medicina%20Preventiva%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
    }
  ]
}
"""

#### Casos de Prueba:
1. GET /cenesp → Devuelve los 6 centros especializados (200)
2. GET /cenesp?id=MP → Devuelve solo Medicina Preventiva (200)
3. GET /cenesp?id=MP,CSMCT → Devuelve 2 centros (200)
4. GET /cenesp?id=mp → Normaliza a MP y devuelve centro (200)
5. GET /cenesp (sin Authorization header) → Error 401
6. GET /cenesp → Verificar que incluye campo mapa_url (200)
7. GET /cenesp → Verificar que no incluye campo servicios (200)

#### Notas:
- Formato lite optimizado para listados rápidos
- No incluye servicios para reducir payload
- Útil para mostrar ubicaciones en mapas o listas
- El campo "filtro" indica qué IDs se aplicaron (null si no hay filtro)
- Los IDs se normalizan automáticamente a mayúsculas
- El campo mapa_url apunta directamente a Google Maps con coordenadas exactas

---

### 9.2 Obtener Centro Especializado por ID

**Nombre:** Detalle de Centro Especializado  
**Descripción:** Devuelve información detallada de un centro especializado específico por su ID, con opción de incluir o excluir servicios  
**Método:** "GET"  
**URL:** "/cenesp/:id"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del centro especializado
  - Valores: "MP", "PLM", "CSMCT", "CAL", "CACJ", "CACLA"
  - Ejemplo: "MP"
- "detail" (string, query parameter, opcional): Nivel de detalle de la respuesta
  - Valores: "lite" | "completo"
  - Por defecto: "completo" (incluye servicios)
  - Ejemplo: "?detail=lite"

#### Ejemplo de Request (formato completo):
"""http
GET /cenesp/CSMCT HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - formato completo):
"""json
{
  "id": "CSMCT",
  "nombre": "Centro de Salud Mental Comunitaria Tramas",
  "direccion": "San Jerónimo 2573, B° San Vicente",
  "latitud": -31.4228185,
  "longitud": -64.150846,
  "telefono": "3512266003",
  "horarios": "08:00 a 18:00 hs",
  "servicios": [],
  "mapa_url": "https://maps.google.com/maps/search/Centro%20de%20Salud%20Mental%20Comunitaria%20Tramas%2C%20San%20Jer%C3%B3nimo%202573/@-31.4228185,-64.150846,17z"
}
"""

#### Ejemplo de Request (formato lite):
"""http
GET /cenesp/MP?detail=lite HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200 - formato lite):
"""json
{
  "id": "MP",
  "nombre": "Medicina Preventiva",
  "direccion": "Santa Rosa 360",
  "latitud": -31.410921,
  "longitud": -64.187266,
  "telefono": "No especificado",
  "horarios": "07:00 a 13:00 hs",
  "mapa_url": "https://maps.google.com/maps/search/Medicina%20Preventiva%2C%20Santa%20Rosa%20360/@-31.410921,-64.187266,17z"
}
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "Centro especializado no encontrado",
  "id_solicitado": "XXX"
}
"""

#### Casos de Prueba:
1. GET /cenesp/MP → Centro con servicios y mapa_url (200)
2. GET /cenesp/MP?detail=lite → Centro sin servicios pero con mapa_url (200)
3. GET /cenesp/CSMCT?detail=completo → Centro Salud Mental con servicios (200)
4. GET /cenesp/CAL → Centro Asistencia Lazos (200)
5. GET /cenesp/mp → Normaliza a MP y devuelve centro (200)
6. GET /cenesp/XXX → error="Centro especializado no encontrado" (404)
7. GET /cenesp/MP (sin token) → Error 401

#### Notas:
- El ID se normaliza a mayúsculas automáticamente
- Formato completo (por defecto) incluye servicios y mapa_url
- Formato lite incluye información básica: dirección, horarios, coordenadas, teléfono y mapa_url
- Algunos centros no tienen servicios definidos (array vacío)
- El campo mapa_url está presente en ambos formatos (lite y completo)

---

### 9.3 Obtener Servicios de un Centro Especializado

**Nombre:** Servicios de un Centro Especializado  
**Descripción:** Devuelve la lista de servicios disponibles en un centro especializado específico, con opción de filtrar por disponibilidad de turno callcenter  
**Método:** "GET"  
**URL:** "/cenesp/:id/servicios"  
**Autenticación:** JWT Bearer Token (requerido)

#### Parámetros:
- "id" (string, path parameter, requerido): ID del centro especializado
  - Ejemplo: "MP"
- "callcenter" (string, query parameter, opcional): Filtrar por disponibilidad de turno callcenter
  - Valores: "true" | "false"
  - Ejemplo: "?callcenter=true"

#### Ejemplo de Request (todos los servicios):
"""http
GET /cenesp/CSMCT/servicios HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (200):
"""json
{
  "centro": {
    "id": "CSMCT",
    "nombre": "Centro de Salud Mental Comunitaria Tramas",
    "direccion": "San Jerónimo 2573, B° San Vicente",
    "latitud": -31.4228185,
    "longitud": -64.150846
  },
  "servicios": [],
  "total": 0,
  "filtro_callcenter": null
}
"""

#### Ejemplo de Response (404):
"""json
{
  "error": "Centro especializado no encontrado",
  "id_solicitado": "XXX"
}
"""

#### Casos de Prueba:
1. GET /cenesp/MP/servicios → Array con servicios (200)
2. GET /cenesp/CSMCT/servicios → Array vacío (centro sin servicios) (200)
3. GET /cenesp/MP/servicios?callcenter=true → Solo servicios con turno_callcenter=true (200)
4. GET /cenesp/MP/servicios?callcenter=false → Solo servicios con turno_callcenter=false (200)
5. GET /cenesp/XXX/servicios → error="Centro especializado no encontrado" (404)
6. GET /cenesp/MP/servicios (sin token) → Error 401

#### Notas:
- Si no se especifica callcenter, devuelve todos los servicios
- filtro_callcenter en la respuesta indica el filtro aplicado (true, false, o null para todos)
- La mayoría de centros especializados no tienen servicios definidos (array vacío)
- Útil para verificar qué servicios están disponibles con turno telefónico

---

## 10. CUIL — CENTRO ASIGNADO — *[2026-03-10]*

Consulta el centro de salud asignado a un paciente a partir de su CUIL. Integra con la API externa Wise (portal salud Córdoba) que obtiene el domicilio del padrón RENAPER y determina el área programática correspondiente. El token Wise se gestiona automáticamente (reintento ante 401, renovación cada 7 días).

### 10.1 Centro de salud por CUIL

**Nombre:** Centro asignado por CUIL
**Descripción:** Devuelve el centro de salud asignado al paciente y sus servicios disponibles, en dos mensajes para renderizar como burbujas separadas en el chat
**Método:** "GET"
**URL:** "/api/cuil/:cuil/centro"
**Autenticación:** JWT Bearer Token requerido

#### Parámetros (Path):
- "cuil" (string, requerido): CUIL del paciente, solo dígitos, 10 u 11 caracteres
  - Ejemplo: "27381585625"

#### Ejemplo de Request:
"""http
GET /api/cuil/27381585625/centro HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

#### Ejemplo de Response (Éxito - 200):
"""json
{
  "mensajes": [
    {
      "tipo": "centro_identificado",
      "texto": "Tu centro de salud asignado, Augusto Malik, es **Centro de Salud Bialet Masse**, ubicado en Av. Circunvalación 5200. Horario: Lunes a Viernes 7:00-13:00.",
      "datos": {
        "id": "CS064",
        "nombre": "Centro de Salud Bialet Masse",
        "direccion": "Av. Circunvalación 5200",
        "horarios": "Lunes a Viernes 7:00-13:00",
        "coordenadas": { "latitud": -31.45, "longitud": -64.16 },
        "mapa_url": "https://www.google.com/maps/search/?api=1&query=-31.45,-64.16"
      }
    },
    {
      "tipo": "servicios_disponibles",
      "texto": "Servicios disponibles en tu centro:",
      "datos": {
        "total": 8,
        "servicios": [ ... ]
      },
      "accion": {
        "label": "Quiero saber servicios disponibles",
        "endpoint": "/centros_salud/CS064/servicios"
      }
    }
  ],
  "_meta": {
    "cuil": "27381585625",
    "area_api": "64",
    "centro_id": "CS064"
  }
}
"""

#### Ejemplo de Response (CUIL sin área asignada - 404):
"""json
{
  "error": "Augusto Malik no tiene domicilio o área programática registrada. No es posible determinar el centro de salud asignado.",
  "codigo": "SIN_AREA_PROGRAMATICA"
}
"""

#### Ejemplo de Response (CUIL inválido - 400):
"""json
{
  "error": "CUIL inválido",
  "detalle": "El CUIL debe contener solo dígitos (10 u 11 caracteres)"
}
"""

#### Ejemplo de Response (CUIL no encontrado en padrón - 404):
"""json
{
  "error": "CUIL no encontrado en el padrón"
}
"""

#### Notas:
- La conversión área → centro es: `"CS" + area.padStart(3, '0')` (ej: área "64" → "CS064")
- El campo `_meta` es para debug interno, no se muestra al usuario
- El campo `accion.endpoint` permite al bot llamar directamente a los servicios del centro

---

## 11. ADMINISTRACIÓN

### 10.1 Métricas del Sistema

**Nombre:** Métricas y Estadísticas del Sistema  
**Descripción:** Devuelve métricas de uso del sistema, estadísticas de endpoints, tiempos de respuesta y errores  
**Método:** "GET"  
**URL:** "/admin/metrics"  
**Autenticación:** Admin Token (X-ADMIN-KEY header o JWT con role 'admin')

#### Headers Requeridos:
- "X-ADMIN-KEY" (string): Clave de administrador configurada en .env
  - Ejemplo: "X-ADMIN-KEY: your-secret-admin-key"
- O bien: "Authorization: Bearer {jwt_token}" con role 'admin'

#### Ejemplo de Request:
"""http
GET /admin/metrics HTTP/1.1
Host: localhost:3000
X-ADMIN-KEY: your-secret-admin-key
"""

#### Ejemplo de Response (200):
"""json
{
  "timestamp": "2026-01-14T10:30:00.000Z",
  "uptime": 3600,
  "requests": {
    "total": 1250,
    "success": 1180,
    "errors": 70,
    "rate": 0.35
  },
  "endpoints": {
    "/api/auth/login": {
      "count": 45,
      "avgResponseTime": 120,
      "errors": 5
    },
    "/centros_salud": {
      "count": 350,
      "avgResponseTime": 85,
      "errors": 2
    },
    "/api/odontologia/cercano": {
      "count": 280,
      "avgResponseTime": 150,
      "errors": 12
    }
  },
  "errors": [
    {
      "code": "INVALID_CREDENTIALS",
      "count": 5,
      "lastOccurrence": "2026-01-14T10:25:00.000Z"
    }
  ],
  "memory": {
    "heapUsed": 45.2,
    "heapTotal": 89.5,
    "external": 2.3
  }
}
"""

#### Casos de Prueba:
1. X-ADMIN-KEY: {valid_key} → Métricas completas del sistema (200)
2. X-ADMIN-KEY: invalid_key → Error 403
3. (sin X-ADMIN-KEY header) → Error 401
4. X-ADMIN-KEY: {valid_key} → Verificar endpoints.* existen (200)
5. X-ADMIN-KEY: {valid_key} → Verificar memory.heapUsed > 0 (200)

#### Notas:
- Requiere autenticación de administrador
- Útil para monitoreo y debugging
- Se reinicia con cada restart del servidor

---

### 10.2 Recargar Áreas Programáticas

**Nombre:** Recarga de GeoJSON de Áreas  
**Descripción:** Recarga en caliente el archivo GeoJSON con los polígonos de áreas programáticas sin necesidad de reiniciar el servidor  
**Método:** "POST"  
**URL:** "/admin/reload_areas"  
**Autenticación:** Admin Token (X-ADMIN-KEY o JWT admin)  
**Rate Limit:** Limitado a 10 requests por hora

#### Headers Requeridos:
- "X-ADMIN-KEY" (string): Clave de administrador
- "Content-Type: application/json"

#### Parámetros (Body - JSON):
- "archivo" (string, opcional): Ruta al archivo GeoJSON a cargar
  - Por defecto: "./data/areasredefinidas.json"
  - Ejemplo: "{"archivo": "./data/areasredefinidas.json"}"

#### Ejemplo de Request:
"""http
POST /admin/reload_areas HTTP/1.1
Host: localhost:3000
X-ADMIN-KEY: your-secret-admin-key
Content-Type: application/json

{
  "archivo": "./data/areasredefinidas.json"
}
"""

#### Ejemplo de Response (200):
"""json
{
  "success": true,
  "archivo": "C:\\Users\\gonzalezschinocca_on\\chatbot\\data\\areasredefinidas.json",
  "features": 42
}
"""

#### Ejemplo de Response (400 - Path inválido):
"""json
{
  "success": false,
  "error": {
    "code": "INVALID_PATH",
    "message": "Ruta invalida"
  }
}
"""

#### Ejemplo de Response (500 - Error al cargar):
"""json
{
  "success": false,
  "error": {
    "code": "RELOAD_ERROR",
    "message": "Error recargando archivo",
    "detalle": "ENOENT: no such file or directory"
  }
}
"""

#### Casos de Prueba:
1. Body: {} → Recarga archivo por defecto, success=true (200)
2. Body: {"archivo":"./data/areasredefinidas.json"} → success=true, features > 0 (200)
3. Body: {"archivo":"../../../etc/passwd"} → error="Ruta invalida" (400)
4. Body: {"archivo":"./noexiste.json"} → error="RELOAD_ERROR" (500)
5. (sin X-ADMIN-KEY) → Error 401
6. X-ADMIN-KEY: invalid → Error 403

#### Notas:
- Seguridad: bloquea path traversal (..)
- Registra auditoría de cada recarga
- No requiere reiniciar servidor (hot reload)
- Rate limit estricto para evitar abuso
- Útil para actualizar áreas sin downtime

---

## RESUMEN DE AUTENTICACIÓN

### Tipos de Autenticación por Endpoint:

**Sin Autenticación (Públicos):**
- "GET /" - Bienvenida
- "GET /debug" - Debug
- "GET /health" - Health check
- "POST /api/auth/login" - Login

**JWT Bearer Token:**
- Todos los endpoints de centros ("/centros_salud")
- Todos los endpoints de hospitales ("/hospitales")
- Todos los endpoints de DEM ("/dem")
- Todos los endpoints de odontología ("/api/odontologia/*")
- Todos los endpoints de SOM ("/api/servicios_odontologicos/*")
- Endpoints de área programática

**Admin (X-ADMIN-KEY o JWT admin):**
- "GET /admin/metrics"
- "POST /admin/reload_areas"

### Formato de Headers:

**JWT Bearer:**
"""
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"""

**Admin Key:**
"""
X-ADMIN-KEY: your-secret-admin-key
"""

---

## CÓDIGOS DE RESPUESTA HTTP

- "200" - OK: Operación exitosa
- "400" - Bad Request: Parámetros inválidos o faltantes
- "401" - Unauthorized: Token JWT inválido o no proporcionado
- "403" - Forbidden: No tiene permisos (admin key inválida)
- "404" - Not Found: Recurso no encontrado
- "500" - Internal Server Error: Error del servidor

---

## RATE LIMITING

- **Login:** 1000 requests por minuto
- **Admin reload_areas:** 10 requests por hora
- **Endpoints generales:** Sin límite estricto (usa defaults del servidor)

---

## CONTACTO Y SOPORTE

- **Teléfono CallCenter:** 0800-888-5555
- **Horario CallCenter:** Lunes a Viernes 7:00-19:00hs
- **SOM Dirección:** San Martín 850, Córdoba
- **SOM Horario:** Lunes a Viernes 7:00-14:00hs

---

## NOTAS TÉCNICAS GENERALES

1. **Coordenadas:** Todas las coordenadas usan formato decimal (WGS84)
   - Latitud: -90 a 90
   - Longitud: -180 a 180

2. **Distancias:** Calculadas en kilómetros usando fórmula Haversine

3. **Áreas Programáticas:** Determinadas por polígonos GeoJSON usando @turf/boolean-point-in-polygon

4. **Formato de Respuesta:** JSON en todos los endpoints

5. **Logging:** Todos los endpoints registran auditoría (winston)

6. **Timeouts:** Configurados a nivel de aplicación

7. **CORS:** Habilitado para permitir requests cross-origin

8. **Compresión:** Respuestas comprimidas con gzip

9. **Seguridad:** Headers de seguridad configurados con Helmet

10. **Validación:** Validación defensiva de arrays y objetos en todos los endpoints

---

**Última actualización:** Enero 29, 2026  
**Versión de la API:** 2.0.0  

