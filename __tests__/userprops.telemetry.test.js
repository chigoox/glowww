const {
  createNode,
  setNodeAtPath,
  evaluatePipeline,
  getUserPropsTelemetry,
  resetUserPropsTelemetry
} = require('../app/Components/utils/userprops/userPropsEngine');

test('telemetry increments and resets correctly', async () => {
  resetUserPropsTelemetry();
  const before = getUserPropsTelemetry();
  expect(before.pipelines).toBe(0);

  const root = createNode('object');
  // a=2, b=3, sum expression
  setNodeAtPath(root, 'a', createNode('number', { value: 2 }));
  setNodeAtPath(root, 'b', createNode('number', { value: 3 }));
  setNodeAtPath(root, 'sum', createNode('number', { value: 0, meta: { expression: 'get("a") + get("b")' } }));
  const res = await evaluatePipeline(root, null);
  expect(res.exprChanges).toContain('sum');

  const after = getUserPropsTelemetry();
  expect(after.pipelines).toBe(1);
  expect(after.expressionsEvaluated).toBeGreaterThanOrEqual(1);
  expect(after.watcherErrors).toBeGreaterThanOrEqual(0);

  resetUserPropsTelemetry();
  const reset = getUserPropsTelemetry();
  expect(reset.pipelines).toBe(0);
  expect(reset.expressionsEvaluated).toBe(0);
});
