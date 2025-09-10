const { createNode, setNodeAtPath, evaluatePipeline } = require('../app/Components/utils/userprops/userPropsEngine');
const { buildExpressionTemplate } = require('../app/Components/utils/userprops/userPropTemplates');

test('expression template sumTwo works', async () => {
  const root = createNode('object');
  setNodeAtPath(root, 'a', createNode('number', { value: 2 }));
  setNodeAtPath(root, 'b', createNode('number', { value: 5 }));
  setNodeAtPath(root, 's', createNode('number', { value: 0, meta: {} }));
  root.children.s.meta.expression = buildExpressionTemplate('sumTwo', { pathA:'a', pathB:'b' });
  const { exprChanges } = await evaluatePipeline(root, null);
  expect(exprChanges).toContain('s');
  expect(root.children.s.value).toBe(7);
});
