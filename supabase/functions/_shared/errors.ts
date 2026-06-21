// _shared/errors.ts — standardized JSON response envelopes.
// Never leak SQL / system internals to clients: callers map known codes to clean
// messages; anything unexpected becomes a generic 500.

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "rate_limited"
  | "quota_exceeded"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  rate_limited: 429,
  quota_exceeded: 429,
  internal: 500,
};

export function requestId(): string {
  return crypto.randomUUID();
}

/** Success envelope: { data, meta? }. */
export function jsonOk(
  data: unknown,
  init: { status?: number; headers?: Record<string, string>; meta?: unknown } = {},
): Response {
  const body: Record<string, unknown> = { data };
  if (init.meta !== undefined) body.meta = init.meta;
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init.headers ?? {}) },
  });
}

/** Error envelope: { error: { code, message, request_id } }. */
export function jsonError(
  code: ApiErrorCode,
  message: string,
  headers: Record<string, string> = {},
  extra: Record<string, string> = {},
): Response {
  const status = STATUS[code];
  return new Response(
    JSON.stringify({ error: { code, message, request_id: requestId() } }),
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8", ...headers, ...extra },
    },
  );
}
