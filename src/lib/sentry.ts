import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string;
const SERVICE_NAME = (Constants.expoConfig?.extra?.serviceName as string) || 'novaescola';

function parsePath(url: string): { path: string; table: string; host: string } {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    const match = parsed.pathname.match(/\/rest\/v1\/(.+)/);
    const table = match ? match[1] : parsed.pathname;
    return { path, table, host: parsed.hostname };
  } catch {
    return { path: url, table: url, host: 'unknown' };
  }
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return body; }
  }
  return body;
}

export function initSupabaseLogger() {
  if (!Constants.expoConfig?.extra?.sentryDsn) return;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function supabaseTracedFetch(input, init) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;

    if (!url.startsWith(SUPABASE_URL)) {
      return originalFetch(input, init);
    }

    const method = (init?.method?.toUpperCase() || 'GET') as string;
    const { path, table, host } = parsePath(url);
    const requestBody = parseBody(init?.body);
    const startTime = Date.now();

    return await Sentry.startSpan(
      {
        name: `supabase: ${method} ${table}`,
        op: 'db.query',
        attributes: {
          'db.table': table,
          'http.method': method,
          'http.host': host,
          'service.name': SERVICE_NAME,
          'db.request_body': requestBody ? JSON.stringify(requestBody) : undefined,
        },
      },
      async (span) => {
        try {
          const response = await originalFetch(input, init);
          const duration = Date.now() - startTime;

          const clone = response.clone();
          let responseBody: unknown;
          try { responseBody = await clone.json(); } catch { responseBody = null; }

          const rowCount = Array.isArray(responseBody) ? responseBody.length : undefined;

          span.setAttribute('http.status_code', response.status);
          span.setAttribute('db.response_rows', rowCount ?? 0);
          span.setAttribute('db.duration_ms', duration);

          if (!response.ok) {
            Sentry.captureMessage(`Supabase error: ${method} ${table} → ${response.status}`, {
              level: 'error',
              extra: {
                host,
                service: SERVICE_NAME,
                http_verb: method,
                path,
                request: requestBody,
                response: responseBody,
                status: response.status,
              },
            });
          }

          Sentry.addBreadcrumb({
            category: 'supabase',
            message: `${method} ${path}`,
            data: {
              host,
              service: SERVICE_NAME,
              http_verb: method,
              table,
              status: response.status,
              duration_ms: duration,
              row_count: rowCount,
              request: requestBody,
              response: Array.isArray(responseBody) ? responseBody.slice(0, 5) : responseBody,
            },
            level: response.ok ? 'info' : 'error',
            timestamp: startTime / 1000,
          });

          return response;
        } catch (error) {
          Sentry.captureException(error, {
            extra: { host, service: SERVICE_NAME, http_verb: method, path, request: requestBody },
          });
          throw error;
        }
      }
    );
  };
}
