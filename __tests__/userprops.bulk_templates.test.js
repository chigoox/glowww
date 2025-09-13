const { createNode, setNodeAtPath, evaluatePipeline, getNodeAtPath } = require('../app/Components/utils/userprops/userPropsEngine');
const { buildExpressionTemplate } = require('../app/Components/utils/userprops/userPropTemplates');

test('bulk apply template code across paths (via engine directly)', async () => {
  const code = buildExpressionTemplate('sumTwo', { pathA: 'a', pathB: 'b' });
  const root = createNode('object');
  setNodeAtPath(root, 'a', createNode('number', { value: 1 }));
  setNodeAtPath(root, 'b', createNode('number', { value: 4 }));
  setNodeAtPath(root, 's1', createNode('number', { value: 0, meta: {} }));
  setNodeAtPath(root, 's2', createNode('number', { value: 0, meta: {} }));
  getNodeAtPath(root,'s1').meta.expression = code;
  getNodeAtPath(root,'s2').meta.expression = code;
  const res = await evaluatePipeline(root, null);
  expect(res.exprChanges).toEqual(expect.arrayContaining(['s1','s2']));
  expect(getNodeAtPath(root,'s1').value).toBe(5);
  expect(getNodeAtPath(root,'s2').value).toBe(5);
});
