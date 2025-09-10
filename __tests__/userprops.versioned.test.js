const { createNode, setNodeAtPath, exportTree, importTree } = require('../app/Components/utils/userprops/userPropsEngine');

test('versioned export/import roundtrip', () => {
  const root = createNode('object');
  setNodeAtPath(root, 'x', createNode('string', { value: 'hello' }));
  const json = exportTree(root);
  const imported = importTree(json);
  expect(imported.children.x.value).toBe('hello');
});
