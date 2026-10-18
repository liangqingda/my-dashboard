import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBuild } from './build-state.mjs';

const config = {
  successMarkers: ['ready in', 'started'],
  failMarkers: ['error', 'failed'],
  failIgnorePatterns: ['client error'],
};
test('newest marker wins across marker types and configuration order', () => {
  assert.equal(
    classifyBuild(config, 'failed earlier\nready in 10ms\nerror latest', true),
    'fail',
  );
  assert.equal(
    classifyBuild(config, 'error earlier\nfailed again\nready in 10ms', true),
    'ok',
  );
  assert.equal(
    classifyBuild(
      { ...config, failMarkers: [...config.failMarkers].reverse() },
      'failed earlier\nready in 10ms\nerror latest',
      true,
    ),
    'fail',
  );
});
test('no evidence stays unknown, ignored errors and substrings do not count', () => {
  assert.equal(classifyBuild(config, 'booting', true), 'unknown');
  assert.equal(
    classifyBuild(config, 'ready in 10ms\nclient error', true),
    'ok',
  );
  assert.equal(
    classifyBuild(config, 'Errors/NotFound.tsx\nrestarted', true),
    'unknown',
  );
  assert.equal(classifyBuild(config, 'ready in 10ms', false), 'stopped');
});
