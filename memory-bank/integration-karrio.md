# Karrio Integration (Minimal)

Karrio provides multi-carrier shipping APIs. It is optional for local development unless testing shipping flows.

## Local setup (dev compose)
- API: `http://localhost:5002`
- Env in compose is based on root `.env` (`KARRIO_*` variables)
- Backed by its own Postgres and Redis instances (`karrio-db`, `karrio-redis`)

## Web dashboard
- The dashboard service may be disabled in dev due to memory constraints; use the API directly.

## Panel ↔ Karrio
- Panel uses `KARRIO_API_URL` (e.g., `http://karrio-server:5002`)
- Tokens:
  - `FULEXO_TO_KARRIO_API_TOKEN`: for API-to-Karrio calls
  - `FULEXO_INTERNAL_API_TOKEN`: for worker-internal calls

## Notes
- You can comment out Karrio services in dev if not needed
- Configure carriers in Karrio when moving beyond smoke testing
