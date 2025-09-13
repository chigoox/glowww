const engine = require('../app/Components/utils/userprops/userPropsEngine');
const {
  createNode,
  setNodeAtPath,
  getNodeAtPath,
  bindUserPropToComponentProp,
  traverseAndSyncReferences,
  buildExpressionDependencyGraph
} = engine;

test('bindUserPropToComponentProp sets ref and value for primitive', () => {
  const root = createNode('object');
  setNodeAtPath(root, 'title', createNode('string', { value: '' }));
  const bound = bindUserPropToComponentProp(root, 'title', 'nodeA', 'label', 'Hello');
  expect(bound.meta.ref).toEqual({ sourceNodeId: 'nodeA', propName: 'label' });
  expect(bound.value).toBe('Hello');
});

test('traverseAndSyncReferences updates changed values', () => {
  const root = createNode('object');
  setNodeAtPath(root, 'n', createNode('number', { value: 1, meta: { ref: { sourceNodeId: 'A', propName: 'count' } } }));
  const changed1 = traverseAndSyncReferences(root, (id, prop) => (id==='A' && prop==='count') ? 2 : undefined);
  expect(changed1).toBe(true);
  expect(getNodeAtPath(root,'n').value).toBe(2);
  const changed2 = traverseAndSyncReferences(root, (id, prop) => (id==='A' && prop==='count') ? 2 : undefined);
  expect(changed2).toBe(false); // no further change when same value
});

test('buildExpressionDependencyGraph links dependent nodes', () => {
  const root = createNode('object');
  setNodeAtPath(root, 'a', createNode('number', { value: 1 }));
  setNodeAtPath(root, 'b', createNode('number', { value: 2 }));
  setNodeAtPath(root, 'sum', createNode('number', { value: 0, meta: { expression: 'get("a") + get("b")' } }));
  const g = buildExpressionDependencyGraph(root);
  const edge = g.edges.find(e => e.from==='a' && e.to==='sum');
  expect(edge).toBeDefined();
  expect(Array.isArray(g.nodes)).toBe(true);
});
