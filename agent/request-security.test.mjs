import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestSecurity } from './request-security.mjs';

const res = { setHeader() {} };
const request = (method = 'GET', headers = {}) => ({
  method,
  headers: { host: '127.0.0.1:8787', ...headers },
});
test('invalid, opaque, foreign and unrelated local origins are rejected', () => {
  const security = createRequestSecurity();
  for (const origin of [
    'null',
    'bad origin',
    'https://foreign.example',
    'http://localhost:9999',
    'http://localhost:3000/path',
  ]) {
    assert.throws(() => security.authorize(request('GET', { origin }), res), {
      status: 403,
      code: 'UNTRUSTED_ORIGIN',
    });
  }
  assert.throws(
    () =>
      security.authorize(request('GET', { host: 'foreign.example:8787' }), res),
    { code: 'UNTRUSTED_HOST' },
  );
  assert.throws(
    () =>
      security.authorize(
        request('GET', { 'sec-fetch-site': 'cross-site' }),
        res,
      ),
    { code: 'UNTRUSTED_ORIGIN' },
  );
});
test('every mutation requires a token and allowed origin; tokens rotate per process', () => {
  const security = createRequestSecurity();
  security.authorize(request(), res);
  assert.throws(
    () =>
      security.authorize(
        request('POST', { origin: 'http://localhost:3000' }),
        res,
      ),
    { code: 'INVALID_TOKEN' },
  );
  assert.throws(() => security.authorize(request('POST'), res), {
    code: 'INVALID_TOKEN',
  });
  security.authorize(
    request('POST', {
      origin: 'http://localhost:3000',
      'x-dashboard-token': security.token,
    }),
    res,
  );
  security.authorize(
    request('POST', { 'x-dashboard-token': security.token }),
    res,
  );
  assert.throws(
    () =>
      createRequestSecurity().authorize(
        request('POST', { 'x-dashboard-token': security.token }),
        res,
      ),
    { code: 'INVALID_TOKEN' },
  );
});
