# Changelog

All notable changes to this project are documented here. Dates use the project's internal release calendar.

---

## v2.1.0 — Data integrity fixes, new endpoints, boundary validation

**Fixed**
- Corrected a data entry error where a facility record had latitude/longitude transposed, which prevented it from being correctly selected by the area-assignment algorithm.
- Added missing `phone` field across the urgent-care facility dataset.

**Added**
- Municipal-boundary validation on coordinate-based lookups (`assigned facility` and `programmatic area` endpoints): requests with coordinates outside the service area now return a distinct `422` response instead of a generic `404`, so client applications (chatbots, portals) can surface a clearer message to the end user.
- New "programmatic zones" endpoints: list all zones with facility counts, and list facilities within a given zone (accepts both zero-padded and short zone codes, normalizes automatically).

**Docs**
- Updated the API reference with the new endpoints and the boundary-validation behavior.

---

## v2.0.0 — Modular architecture refactor

**Changed**
- Refactored the monolithic entry point into a layered MVC + Services structure: `config/` (constants, security, rate limits), `middlewares/` (auth, logging, validation, timeout, error handling), `services/` (business logic), `routes/` (domain-organized endpoints), `utils/` (shared formatters).
- Reduced the main server file from ~1,300 lines to under 100 by extracting responsibilities into the layers above.
- Replaced ad hoc `console.log` calls with structured logging throughout.
- Removed duplicated response-formatting logic in favor of shared formatter utilities.

**Added**
- Facility-map endpoint now supports filtering by a single facility and includes operating hours.
- Public endpoints (root, health check, debug) explicitly excluded from JWT enforcement.

**Fixed**
- Corrected environment-variable load order, which had been causing security validations to fail on cold start.
- Fixed a "farther facilities" fallback endpoint that wasn't returning results outside the caller's own service area.

**Testing**
- Full regression suite passing (70/70) after the refactor, up from 59 pre-refactor.

**Development history (condensed)**
The refactor was carried out incrementally over six working sessions: initial architecture planning and extraction of the config layer; middleware and service extraction; route reorganization; a cross-cutting cleanup pass (removing duplicated logic, translating internal comments to a consistent language); a merge/sync pass; and a final review with full regression validation.

---

## v1.0.0 — Initial deployment

- Deployed the specialized dental-referral endpoint and the lightweight map-formatted facility listing.
- Applied baseline authentication (all endpoints except health check).
- Added defensive parsing/validation for coordinate input (locale-aware decimal separators, parameter aliases, range checks, and graceful handling of missing fields).
- Initial dataset: 100+ facility records plus one specialized referral center.
- Test suite: 59 passing tests at release; earlier development milestones had run smaller suites (35/35) against mocked data.

---

## Key technical decisions

- **Distance calculation:** Haversine formula, chosen for its accuracy over the short distances typical of intra-city routing.
- **Separation of concerns:** Facility-assignment logic (business rules) and input-robustness logic (validation/defensive coding) were deliberately kept in separate layers, so either can change independently and be tested in isolation.
- **Audit logging:** Every assignment decision is logged with the input coordinates and the resulting facility/case, to support later debugging of routing edge cases.
- **API surface discipline:** An early "nearby facilities" endpoint that returned multiple candidates was deprecated in favor of a single `assigned facility` endpoint, to keep the contract predictable for downstream chatbot consumers.

## Dataset summary (at v1.0.0 baseline)

- 100+ facilities in the primary dataset, plus one specialized referral center.
- All facilities offer a baseline dental service; roughly a quarter require an in-person visit to book (no call-center scheduling).
