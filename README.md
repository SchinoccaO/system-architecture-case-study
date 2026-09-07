# Municipal Healthcare Services API & Geographic Routing Engine

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT_Stateless-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Architecture](https://img.shields.io/badge/Architecture-MVC_%2B_Services-blue?style=flat-square)](https://github.com/SchinoccaO/system-architecture-case-study)
[![Tests](https://img.shields.io/badge/Tests-75_Passing-brightgreen?style=flat-square)](https://github.com/SchinoccaO/system-architecture-case-study)

Production-grade RESTful API designed for public sector healthcare administration. The platform acts as the core orchestration engine for conversational bots and citizen-facing portals, providing programmatic healthcare facility allocation, triage routing, and geolocation services.

---

## 📌 Case Study Overview & Technical Role

- **Domain:** Public Healthcare Systems & Municipal Citizen Services.
- **My Role:** Functional Analyst & Backend Engineer.
- **Key Contributions:**
  - **Modular Architecture Refactoring:** Decoupled a monolithic codebase into a layered **MVC + Services** pattern, reducing main server entry complexity from 1,295 lines down to 72 lines.
  - **Geographic Partitioning Engine:** Designed a high-performance quadrant-based allocation algorithm to allow chatbot interfaces to paginate and navigate facility directories seamlessly.
  - **Domain Modeling & API Contract Design:** Standardized data contracts across 100+ health centers, hospitals, and specialized dental care facilities.
  - **Automated Testing Suite:** Implemented and validated a test-driven regression suite (75 passing integration and unit tests).

---

## 🏗️ Architecture & Project Structure

The project follows a clean, modular structure prioritizing separation of concerns, testability, and resilience:

```text
src/
├── server.js                    # Minimal entry point (72 lines)
├── app.js                       # Express configuration & global middleware pipeline
├── config/                      # Security headers, rate limits, environment configs
├── middlewares/                 # JWT verification, request validation, error handlers
├── services/                    # Geolocation math, facility allocation, auth blacklist
├── routes/                      # Health, auth, health-centers, hospitals, dental, admin
└── utils/                       # GeoJSON parsers, coordinate converters, payload formatters

data/
├── unified_facilities_dataset.json   # 101 community centers + 4 emergency hospitals
└── programmatic_zones.geojson        # High-resolution boundary geometries

test/                            # 75 passing test suites (auth, integration, geo-queries)
```

---

## 🗺️ Geospatial Routing Algorithm (Chatbot Navigation)

To support low-bandwidth conversational bots (e.g., WhatsApp/Telegram buttons) without overwhelming users with 100+ options, the engine implements a quadrant partitioning algorithm calculated from the city's geographical center:

```javascript
// Dynamic Cardinal Quadrant Assignment
function resolveCardinalZone(latitude, longitude, centerLat, centerLon) {
  const deltaLat = Math.abs(latitude - centerLat);
  const deltaLon = Math.abs(longitude - centerLon);

  if (deltaLat > deltaLon) {
    return latitude > centerLat ? 'north' : 'south';
  }
  return longitude > centerLon ? 'east' : 'west';
}
```

### Key Capabilities

- **Hierarchical Navigation:** Users query zones (`/api/centers/:zone`) and retrieve paginated, bot-ready facility batches (`limit=5`).
- **Robust Coordinate Normalization:** Automatically handles European comma floats (`-31,4201`), aliases (`lat`, `latitude`, `lng`, `lon`), and bounds validation (`lat` [-90, 90], `lon` [-180, 180]).
- **Sub-neighborhood Drilldown:** Allows conversational flows to filter centers by neighborhood slugs with automated fallback suggestions if no match is found.

---

## 🔑 Core API Endpoints

All data mutations and protected catalog endpoints require a stateless Bearer token.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/login` | Issues a signed JWT with role claims | ❌ |
| `POST` | `/api/auth/logout` | Revokes active token via in-memory blacklist | ✅ |
| `GET` | `/api/centers/zones` | Summarizes facility distribution across quadrants | ✅ |
| `GET` | `/api/centers/:zone` | Fetches facilities by quadrant with cursor/offset pagination | ✅ |
| `GET` | `/api/centers/assigned` | Calculates nearest health center using Haversine formula | ✅ |
| `GET` | `/api/specialized/emergency` | Returns 24/7 immediate care facilities with Google Maps routing | ✅ |
| `GET` | `/api/specialized/dental` | Finds nearest facility providing dental surgery & triage | ✅ |

---

## 🧪 Testing & Reliability

The suite includes 75 automated unit and integration tests:

```bash
npm test
```

- **Authentication & Security:** Expired token rejection, blacklisted session handling, malformed payload defense.
- **Geospatial Accuracy:** Haversine distance assertions, fallback routing for out-of-boundary coordinates.
- **Integration Contracts:** JSON schema validation and response structure conformity across all public health endpoints.
