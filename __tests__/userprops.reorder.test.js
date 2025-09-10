const { createNode, pushItemToArray, reorderArrayItem, getNodeAtPath } = require('../app/Components/utils/userprops/userPropsEngine');

test('reorderArrayItem moves items correctly', () => {
  const root = createNode('object');
  root.children.list = createNode('array', { items: [] });
  pushItemToArray(root, 'list', 'string', 'a');
  pushItemToArray(root, 'list', 'string', 'b');
  pushItemToArray(root, 'list', 'string', 'c');
  reorderArrayItem(root, 'list', 0, 2);
  const arr = getNodeAtPath(root, 'list').items.map(i=>i.value);
  expect(arr).toEqual(['b','c','a']);
});
