const {
  createNode,
  setPrimitiveValueAtPath,
  setNodeAtPath,
  setExpressionAtPath,
  evaluatePipeline,
  validateTree,
  runWatchers
} = require('../app/Components/utils/userprops/userPropsEngine');

describe('userProps pipeline', () => {
  test('evaluates expressions then validation and triggers watcher', async () => {
    const root = createNode('object');
    // base primitives
    setNodeAtPath(root, 'a', createNode('number', { value: 2 }));
    setNodeAtPath(root, 'b', createNode('number', { value: 3 }));
    setNodeAtPath(root, 'sum', createNode('number', { value: 0, meta: {} }));
    // expression sum = a + b
    const sumNode = root.children.sum; sumNode.meta.expression = 'get("a") + get("b")';
    // add validation to ensure sum >=5
    sumNode.meta.validation = { min:5 };
    // watcher on sum (record changes)
    sumNode.meta.watchers = [{ script: 'if(previous!==value && value===5){ /* ok */ }' }];
    const prev = null;
  const { exprChanges, validationErrors, watcherResult, metrics } = await evaluatePipeline(root, prev);
    expect(exprChanges).toContain('sum');
    expect(validationErrors['sum']).toBeUndefined();
    expect(watcherResult.triggered).toContain('sum');
    expect(metrics.expressionEvaluations).toBeGreaterThanOrEqual(1);
  });

  test('validation catches errors and watcher not triggered without change', async () => {
    const root = createNode('object');
    setNodeAtPath(root, 'x', createNode('number', { value: 10, meta: { validation: { max: 5 } } }));
  const { exprChanges, validationErrors, watcherResult } = await evaluatePipeline(root, null);
    expect(exprChanges.length).toBe(0);
    expect(validationErrors['x']).toBeDefined();
    expect(watcherResult.triggered.length).toBe(0);
  });
});
