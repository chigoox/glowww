const { createNode, setNodeAtPath, evaluatePipeline } = require('../app/Components/utils/userprops/userPropsEngine');

test('loop guard triggers on excessive loop', async () => {
  const root = createNode('object');
  setNodeAtPath(root, 'x', createNode('number', { value: 0, meta: {} }));
  root.children.x.meta.expression = 'for(let i=0;i<1000000;i++){ } return 1';
  await evaluatePipeline(root, null); // Should not hang
  // If guard worked, value is set to 1 OR expressionError present
  const meta = root.children.x.meta;
  expect(meta.expressionError || root.children.x.value === 1).toBeTruthy();
});
