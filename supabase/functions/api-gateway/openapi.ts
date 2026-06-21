// openapi.ts — OpenAPI 3.0 spec for the public read-only catalog API.
// Served at GET /api-gateway/v1/openapi.json. `servers[0].url` is filled in at
// request time so Swagger UI "Try it out" targets the live deployment.

export function buildOpenApiSpec(serverUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "2MC Gastro Public API",
      version: "1.0.0",
      description:
        "Read-only access to the 2MC Gastro product catalog (products, categories, brands). " +
        "Authenticate with an API key in the `Authorization: Bearer <key>` header (or `x-api-key`). " +
        "Requests are rate-limited per minute and metered against a monthly quota; see the " +
        "`X-RateLimit-*` response headers. Errors use a standard `{ error: { code, message, request_id } }` shape.",
    },
    servers: [{ url: serverUrl, description: "Live" }],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        BearerAuth: { type: "http", scheme: "bearer", description: "Authorization: Bearer 2mc_live_…" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                request_id: { type: "string" },
              },
            },
          },
        },
        Brand: {
          type: "object",
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            logo_url: { type: "string", nullable: true },
          },
        },
        Category: {
          type: "object",
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            parent_slug: { type: "string", nullable: true },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            sku: { type: "string" },
            slug: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            price: { type: "number" },
            compare_price: { type: "number", nullable: true },
            currency: { type: "string" },
            stock: { type: "integer" },
            in_stock: { type: "boolean" },
            weight_kg: { type: "number", nullable: true },
            dimensions: { type: "object", nullable: true },
            images: { type: "array", items: { type: "string" } },
            specs: { type: "object" },
            energy_rating: { type: "string", nullable: true },
            brand: { $ref: "#/components/schemas/Brand", nullable: true },
            category: { $ref: "#/components/schemas/Category", nullable: true },
          },
        },
      },
    },
    paths: {
      "/v1/products": {
        get: {
          summary: "List products",
          parameters: [
            { name: "lang", in: "query", schema: { type: "string", enum: ["de", "en", "tr", "fr", "nl"], default: "en" } },
            { name: "category", in: "query", schema: { type: "string" }, description: "Category slug" },
            { name: "brand", in: "query", schema: { type: "string" }, description: "Brand slug" },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search in name/SKU" },
            { name: "price_min", in: "query", schema: { type: "number" } },
            { name: "price_max", in: "query", schema: { type: "number" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["price", "-price", "created_at", "-created_at"] } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "A page of products",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                      meta: {
                        type: "object",
                        properties: {
                          total: { type: "integer" },
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Missing/invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit or quota exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/v1/products/{idOrSlugOrSku}": {
        get: {
          summary: "Get a single product by id, slug or SKU",
          parameters: [
            { name: "idOrSlugOrSku", in: "path", required: true, schema: { type: "string" } },
            { name: "lang", in: "query", schema: { type: "string", enum: ["de", "en", "tr", "fr", "nl"], default: "en" } },
          ],
          responses: {
            "200": { description: "The product", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } } } } },
            "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/v1/categories": {
        get: {
          summary: "List categories",
          parameters: [{ name: "lang", in: "query", schema: { type: "string", enum: ["de", "en", "tr", "fr", "nl"], default: "en" } }],
          responses: { "200": { description: "Categories", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Category" } } } } } } } },
        },
      },
      "/v1/brands": {
        get: {
          summary: "List brands",
          responses: { "200": { description: "Brands", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Brand" } } } } } } } },
        },
      },
      "/v1/health": {
        get: { summary: "Health check (no auth)", security: [], responses: { "200": { description: "OK" } } },
      },
    },
  };
}
