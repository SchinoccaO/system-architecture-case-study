# API Reference

## Overview

- **Base URL:** `http://localhost:{PORT}` (configured via `.env`)
- **Auth:** JWT Bearer token, except for public endpoints noted below
- **Format:** JSON
- **Rate limiting:** applied per endpoint (see Rate Limiting section)

---

## 1. Authentication

### 1.1 Login

`POST /api/auth/login` - issues a JWT valid for 30 days. Public.

**Body**
```json
{ "username": "admin", "password": "********" }
```

**200**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "30d",
  "message": "Token issued successfully. Use: Authorization: Bearer <token>"
}
```

**401**
```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid credentials" } }
```

Credentials are configured via environment variables. Failed attempts are audit-logged.

### 1.2 Logout

`POST /api/auth/logout` - revokes the caller token by adding it to an in-memory blacklist; rejected on every protected endpoint afterward. Requires JWT.

**200**
```json
{ "success": true, "message": "Session closed successfully" }
```

The blacklist is in-memory and resets on restart. For multi-instance deployments this would move to a shared store such as Redis.

---

## 2. Health & Status

| Endpoint | Auth | Purpose |
| :--- | :---: | :--- |
| `GET /` | No | Welcome/liveness message |
| `GET /health` | No | Status, version, and basic metadata (facility count, subsystem checks) |
| `GET /debug` | Yes | Confirms the route file in use is loaded correctly |

`/health` is intentionally unauthenticated so external monitoring can poll it directly.

---

## 3. Facility Directory Endpoints

Five resource families -- health centers, municipal hospitals, urgent-care facilities, medical specialty offices, and specialized referral centers -- expose the same three-endpoint shape, differing only in their base path and resource-specific fields:

| Operation | Pattern | Notes |
| :--- | :--- | :--- |
| List | `GET /{resource}` | Optional `page`/`limit` (max 20/page); omit both for the full unpaginated list |
| Get by ID | `GET /{resource}/:id` | `?detail=lite\|full` (default lite); ID is case-normalized |
| Get services | `GET /{resource}/:id/services` | Optional `?callcenter=true\|false` filter |

| Resource family | Base path |
| :--- | :--- |
| Health centers | `/centers` |
| Municipal hospitals | `/hospitals` |
| Urgent-care facilities | `/urgent-care` |
| Medical specialty offices | `/specialty-offices` |
| Specialized referral centers | `/referral-centers` |

### Worked example -- Health Centers

`GET /centers?page=1&limit=10`

```json
{
  "resultados": [
    {
      "id": "HC001",
      "nombre": "Example Community Health Center",
      "direccion": "123 Example Ave",
      "latitud": -31.41,
      "longitud": -64.18,
      "telefono": "555-0100",
      "zona_programatica": "ZONE_1",
      "horarios": "Mon-Fri 7:00-19:00",
      "servicios": [
        { "nombre": "General Medicine", "turno_callcenter": true, "detalle": "General care" },
        { "nombre": "Dentistry", "turno_callcenter": false, "detalle": "General dental care" }
      ]
    }
  ],
  "pagina": 1, "siguientePagina": 2, "total": 100, "totalPaginas": 10
}
```

`GET /centers/HC001?detail=full` returns the same shape as a single object. `GET /centers/HC001/services?callcenter=true` returns just the `servicios` array, filtered.

**404** (unknown ID): `{ "error": "Center not found" }`

The other four resource families follow this identically; hospitals and referral centers tend to carry higher-complexity services, and urgent-care facilities are all `turno_callcenter: false` (walk-in only, no phone scheduling).

### 3.x Map-optimized listing

`GET /centers/map?center=HC001` - lightweight variant (drops the `servicios` array) built for rendering on interactive maps (Leaflet/Mapbox/Google Maps). Optional `center` query param filters to one facility.

---

## 4. Geographic Zone Navigation (chatbot-oriented)

Designed so a low-bandwidth conversational interface (button-based chat UI) can let a user drill from "pick a cardinal direction" down to a specific facility without ever facing a 100-item list.

| Endpoint | Purpose |
| :--- | :--- |
| `GET /api/centers/zones` | Lists the four cardinal zones with facility counts |
| `GET /api/centers/:zone` | Facilities in one zone (north/south/east/west), optional `page`/`limit` (recommended `limit=5` for chat buttons) |
| `GET /api/centers/:zone/:query` | Fuzzy search within a zone by partial name or by facility number (1, 01, or 001 are all accepted); on no match, returns 404 with the first few available facilities as suggestions |

**Flow**
```
1. User picks a zone -> GET /api/centers/zones
2. Bot lists that zone facilities (paginated) -> GET /api/centers/north
3. User types a name or number -> GET /api/centers/north/example-name
4. Bot shows the matched facility detail
```

This reduces a 100-option list to roughly 25 per zone, then to one specific match -- the paginated/searchable design exists specifically to keep chat-button menus short.

### 4.x Programmatic zones

Distinct from the cardinal (geographic) zones above: facilities are also grouped by a numeric "programmatic zone" code (01-06), used for administrative reporting rather than navigation.

- `GET /api/zones/programmatic` - all zones with facility counts
- `GET /api/zones/programmatic/:zone` - facilities in one zone; accepts 1-6 or 01-06, with pagination

---

## 5. Programmatic Area Assignment

The core geolocation feature: given a coordinate pair, resolve which facility (and which administrative catchment area) a citizen belongs to.

### 5.1 Assigned facility by location

`GET /api/centers/assigned?lat=-31.41&lon=-64.18`

Resolves the facility via point-in-polygon lookup against the catchment-area boundaries (GeoJSON), returning the single facility responsible for that location -- deliberately not a list of nearby candidates, to keep the contract predictable for chatbot callers.

**200**
```json
{
  "centro_asignado": {
    "id": "HC001", "nombre": "Example Community Health Center",
    "direccion": "123 Example Ave", "distancia": 0.45,
    "servicios": [ { "nombre": "General Medicine", "turno_callcenter": true } ]
  }
}
```

**422** -- coordinates outside the service area:
```json
{ "error": "Coordinates are outside the municipal service boundary" }
```
A bounding-box check runs before the more expensive polygon lookup, so out-of-area requests fail fast with a message a chatbot can surface directly to the user, instead of a generic "not found".

**400** -- malformed/out-of-range coordinates. **404** -- inside the boundary but no polygon match.

### 5.2 Area lookup by location

`GET /api/areas/lookup?lat=...&lon=...` -- same boundary/point-in-polygon mechanics as above, but returns the administrative area itself rather than a facility. Same 422 boundary behavior. Implemented with `@turf/boolean-point-in-polygon`.

---

## 6. Dental Care Routing

A specialized routing flow layered on top of the facility directory, because not every facility offers phone-based scheduling for dental care.

| Endpoint | Behavior |
| :--- | :--- |
| `GET /api/specialized/dental/nearest?lat=&lon=` | Nearest facility offering dental care; results within the requesting client catchment area are prioritized first |
| `GET /api/specialized/dental/farther?lat=&lon=` | Suggestions outside that same catchment area -- used when the assigned facility has no dental service, so the bot can offer alternatives instead of a dead end |
| `GET /api/specialized/dental/by-patient/:patientId` | Same lookup, keyed by patient identifier instead of coordinates -- see section 7 |

**200 -- found, phone scheduling available:**
```json
{
  "encontrado": true,
  "centro": { "id": "HC001", "nombre": "Example Community Health Center", "distancia": 0.45 },
  "turno": { "callcenter": true, "presencial": true, "instrucciones": "Call the scheduling line, Mon-Fri 7:00-19:00." }
}
```

**200 -- not found:**
```json
{ "encontrado": false, "mensaje": "No dental-care facility found in your area", "sugerencia": "farther_centers" }
```

A legacy `GET /test_odo?lat=&lon=` endpoint remains for backward compatibility; it returns one of three cases (phone-scheduled, walk-in-only, or referred-to-specialist-center) and is superseded by the `/nearest` endpoint above for new integrations.

---

## 7. Patient Identity Lookup

`GET /api/patients/:patientId/facility` -- resolves the assigned facility for a patient, and its services, directly from a national identifier, formatted as two separate response "bubbles" for a chat UI.

This integrates with an external identity/eligibility service: given the patient identifier, it retrieves the registered address on file for that patient from a national civil registry, maps that address to a catchment area, and returns the corresponding facility. The integration token is managed automatically -- transparent retry on expiry, and scheduled renewal -- so callers never handle that credential directly.

**200**
```json
{
  "mensajes": [
    {
      "tipo": "centro_identificado",
      "texto": "Your assigned health center is Example Community Health Center, located at 123 Example Ave. Hours: Mon-Fri 7:00-13:00.",
      "datos": { "id": "HC064", "nombre": "Example Community Health Center", "direccion": "123 Example Ave" }
    },
    {
      "tipo": "servicios_disponibles",
      "texto": "Services available at this center:",
      "datos": { "total": 8, "servicios": [ "..." ] },
      "accion": { "label": "View available services", "endpoint": "/centers/HC064/services" }
    }
  ]
}
```

**404** -- identifier valid but no registered address/area on file. **400** -- malformed identifier. **404** -- identifier not found in the registry.

The facility ID is derived deterministically from the resolved area code (for example, area 64 maps to HC064).

---

## 8. Admin & Operations

Requires an admin credential: `X-ADMIN-KEY` header, or a JWT carrying an admin role claim.

### 8.1 System metrics

`GET /admin/metrics` -- request counts/error rates per endpoint, average response times, and process memory usage. Used for lightweight in-house monitoring; counters reset on restart.

### 8.2 Hot-reload catchment boundaries

`POST /admin/reload-boundaries` -- reloads the GeoJSON catchment-area polygons from disk without restarting the process, so boundary corrections ship with zero downtime.

- Optional body: `{ "file": "<path>" }` (defaults to the standard dataset path)
- Path-traversal attempts (`../..`) are rejected with 400
- Rate-limited to 10 requests/hour
- Every reload is audit-logged

**200**
```json
{ "success": true, "archivo": "<resolved path>", "features": 42 }
```

---

## Authentication Summary

| Auth level | Endpoints |
| :--- | :--- |
| Public | `/`, `/health`, `POST /api/auth/login` |
| JWT Bearer | All facility-directory, zone, area-assignment, dental-routing, and patient-lookup endpoints |
| Admin (X-ADMIN-KEY or JWT admin role) | `/admin/*` |

```
Authorization: Bearer <token>
X-ADMIN-KEY: <admin-key>
```

## HTTP Status Codes

| Code | Meaning |
| :--- | :--- |
| 200 | Success |
| 400 | Invalid or missing parameters |
| 401 | Missing/invalid JWT |
| 403 | Insufficient permissions (bad admin key) |
| 404 | Resource not found |
| 422 | Well-formed request, but semantically outside the service area |
| 500 | Internal server error |

## Rate Limiting

- **Login:** 1000 requests/minute
- **Admin boundary reload:** 10 requests/hour
- **General endpoints:** framework defaults

## Technical Notes

1. Coordinates use WGS84 decimal degrees (lat -90..90, lon -180..180).
2. Distances are computed in kilometers via the Haversine formula.
3. Catchment areas are resolved via `@turf/boolean-point-in-polygon` against GeoJSON boundary data.
4. All endpoints return JSON and are structured-logged for audit purposes.
5. Standard hardening applied: Helmet security headers, gzip compression, CORS, and defensive array/object validation on every response path.
