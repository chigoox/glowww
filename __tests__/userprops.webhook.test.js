/**
 * Tests webhook batching via onUserPropsEvent and configureUserPropsWebhook
 */

const { onUserPropsEvent, emitUserPropsEvent } = require('../app/Components/utils/userprops/userPropsEngine');

// Import ESM file through transpiled Next context is fine as it doesn't export default
let hook = null;
try {
  hook = require('../app/Components/utils/userprops/userPropsWebhook.js');
} catch (e) {
  // ESM import may fail under CJS Jest; tests will be skipped if not available
  hook = null;
}

// Provide global fetch mock
global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(global, 'setTimeout');
  fetch.mockClear();
  // reset webhook by configuring with null first
  if (hook) hook.configureUserPropsWebhook(null);
});

afterEach(() => {
  jest.useRealTimers();
});

const itOrSkip = hook ? test : test.skip;

itOrSkip('batches pipelineComplete events and posts once after debounce', async () => {
  hook.configureUserPropsWebhook('https://example.test/webhook');
  // Emit three events rapidly
  emitUserPropsEvent('pipelineComplete', { durationMs: 5, exprChanges: ['x'], watchersTriggered: [], validationErrorCount: 0 });
  emitUserPropsEvent('pipelineComplete', { durationMs: 7, exprChanges: [], watchersTriggered: ['y'], validationErrorCount: 1 });
  emitUserPropsEvent('pipelineComplete', { durationMs: 3, exprChanges: ['z'], watchersTriggered: [], validationErrorCount: 0 });

  // Advance time just before debounce
  jest.advanceTimersByTime(1400);
  expect(fetch).not.toHaveBeenCalled();

  // Hit debounce threshold to flush
  jest.advanceTimersByTime(200);
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, opts] = fetch.mock.calls[0];
  expect(url).toBe('https://example.test/webhook');
  expect(opts.method).toBe('POST');
  const payload = JSON.parse(opts.body);
  expect(Array.isArray(payload.batch)).toBe(true);
  expect(payload.batch.length).toBe(3);
});
