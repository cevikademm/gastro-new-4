# api-gateway

Public, **read-only** catalog API for external customers. The single entry point
("API Gateway"): authenticate API key → rate-limit/quota → route → catalog query.

## Deploy

External callers authenticate with **our** API keys (not Supabase JWTs), so this
function MUST be deployed with JWT verification disabled:

```bash
supabase functions deploy api-gateway --no-verify-jwt
```

The management function keeps JWT verification ON (default):

```bash
supabase functions deploy api-keys-admin
```

No new secrets are required — both functions reuse `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` (already set for the other edge functions).

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/health` | none | liveness |
| GET | `/v1/openapi.json` | none | OpenAPI 3.0 spec (Swagger UI) |
| GET | `/v1/products` | api key | filters: `lang, category, brand, q, price_min, price_max, sort, limit, offset` |
| GET | `/v1/products/{idOrSlugOrSku}` | api key | |
| GET | `/v1/categories` | api key | |
| GET | `/v1/brands` | api key | |

Auth header: `Authorization: Bearer 2mc_live_…` or `x-api-key: 2mc_live_…`.
Responses carry `X-RateLimit-Limit/Remaining/Reset`; `429` adds `Retry-After`.
