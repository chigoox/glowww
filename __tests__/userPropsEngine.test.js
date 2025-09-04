const engine = require('../app/Components/utils/userprops/userPropsEngine');
const {
  migrateFlatMapToTree,
  flattenTreeToLegacyMap,
  setPrimitiveValueAtPath,
  getNodeAtPath,
  addChildToObject,
  pushItemToArray,
  listPaths,
  ensureTree
} = engine;

describe('userPropsEngine', () => {
  test('migrates flat map and flattens back', () => {
    const flat = {
      title: { type: 'string', value: 'Hello' },
      count: { type: 'number', value: 5 },
      flags: { type: 'array', value: JSON.stringify(['a','b']) }
    };
  const tree = migrateFlatMapToTree(flat);
    expect(tree.children.title.type).toBe('string');
    expect(tree.children.count.type).toBe('number');
    const roundTrip = flattenTreeToLegacyMap(tree);
    expect(roundTrip.title.value).toBe('Hello');
    expect(roundTrip.count.value).toBe(5);
  });

  test('set primitive at path and retrieve', () => {
    const props = {};
    const tree = ensureTree(props);
    addChildToObject(tree, '', 'meta', 'object');
    setPrimitiveValueAtPath(tree, 'meta.version', '1.0.0', 'string');
    const node = getNodeAtPath(tree, 'meta.version');
    expect(node.value).toBe('1.0.0');
  });

  test('array push and list paths', () => {
    const props = {};
    const tree = ensureTree(props);
    addChildToObject(tree, '', 'items', 'array');
    pushItemToArray(tree, 'items', 'string', 'first');
    pushItemToArray(tree, 'items', 'string', 'second');
    const paths = listPaths(tree, { leavesOnly: true });
    const leafPaths = paths.map(p => p.path);
    expect(leafPaths).toContain('items.0');
    expect(leafPaths).toContain('items.1');
  });
});
