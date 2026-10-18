import { randomBytes, timingSafeEqual } from 'node:crypto';

export const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export function isTrustedOrigin(origin, allowedOrigins = DEFAULT_ORIGINS) {
  if (typeof origin !== 'string') return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

export function createRequestSecurity(allowedOrigins = DEFAULT_ORIGINS) {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    authorize(req, res) {
      const deny = (code, message) => {
        const error = new Error(message);
        error.status = 403;
        error.code = code;
        throw error;
      };
      // Validate Host as well as Origin to reject requests routed via foreign hostnames.
      let host;
      try {
        host = new URL(`http://${req.headers.host}`).hostname;
      } catch {
        /* denied below */
      }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
        deny('UNTRUSTED_HOST', '不允许的请求主机');
      const origin = req.headers.origin;
      if (origin !== undefined && !isTrustedOrigin(origin, allowedOrigins))
        deny('UNTRUSTED_ORIGIN', '不允许的请求来源');
      if (req.headers['sec-fetch-site'] === 'cross-site')
        deny('UNTRUSTED_ORIGIN', '不允许跨站请求');
      res.setHeader('Cache-Control', 'no-store');
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, X-Dashboard-Token, X-Dashboard-Request',
      );
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
      const supplied = Buffer.from(
        String(req.headers['x-dashboard-token'] ?? ''),
      );
      const expected = Buffer.from(token);
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      )
        deny('INVALID_TOKEN', '会话已失效，请重新连接');
    },
  };
}
