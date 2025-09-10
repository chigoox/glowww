const {
  createNode,
  setPrimitiveValueAtPath,
  evaluatePipeline
} = require('../app/Components/utils/userprops/userPropsEngine');

// Basic LCS diff is implemented in hook (React context); here we approximate by simulating two snapshots

function makeTree(){
  const root = createNode('object');
  root.children.a = createNode('string', { value: 'one' });
  return root;
}

describe('undo / diff basics (engine side)', () => {
  test('evaluate pipeline after change returns metrics', async () => {
    const root = makeTree();
    let r = await evaluatePipeline(root, null);
    expect(r.metrics).toHaveProperty('tookMs');
    setPrimitiveValueAtPath(root, 'a', 'two', 'string');
    r = await evaluatePipeline(root, null);
    expect(r.metrics).toHaveProperty('expressionEvaluations');
  });
});
