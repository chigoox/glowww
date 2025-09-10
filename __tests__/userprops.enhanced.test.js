/**
 * Tests for advanced user props system: binding precedence, expressions ordering, validation, watchers.
 */

// NOTE: Minimal isolated copies of engine functions imported from source.

const {
  createNode,
  setPrimitiveValueAtPath,
  setPrimitiveSmart,
  bindUserPropToComponentProp,
  traverseAndSyncReferences,
  evaluateExpressions,
  validateTree,
  runWatchers,
  getNodeAtPath
} = require('../app/Components/utils/userprops/userPropsEngine.js');

function buildBasicTree(){
  const root = createNode('object');
  root.children.foo = createNode('number', { value: 2 });
  root.children.bar = createNode('string', { value: 'bar' });
  root.children.dep = createNode('number', { value: 5 });
  // expression node starts as number placeholder; expression uses get('path') API per engine
  root.children.expr = createNode('number', { value: 0, meta: { expression: "get('foo') + get('dep')" } });
  return root;
}

describe('User Props Advanced', () => {
  test('expression evaluates after dependency change', async () => {
    const tree = buildBasicTree();
    const exprChanges1 = await evaluateExpressions(tree);
    expect(getNodeAtPath(tree,'expr').value).toBe(7);
    expect(exprChanges1).toContain('expr');
    setPrimitiveValueAtPath(tree,'dep',10);
    const exprChanges2 = await evaluateExpressions(tree);
    expect(getNodeAtPath(tree,'expr').value).toBe( getNodeAtPath(tree,'foo').value + 10 );
    expect(exprChanges2).toContain('expr');
  });

  test('validation catches required + pattern', () => {
    const tree = buildBasicTree();
    const foo = getNodeAtPath(tree,'foo');
  // pattern must be a string per engine (converted via new RegExp), use digits pattern
  foo.meta = { validation: { required: true, pattern: "^\\\\d+$" } };
    // valid initial
    let errors = validateTree(tree);
    expect(Object.keys(errors).length).toBe(0);
    // set invalid
    setPrimitiveValueAtPath(tree,'foo','abc');
    errors = validateTree(tree);
    expect(errors.foo).toBeDefined();
  });

  test('watcher triggers on value change', async () => {
    const tree = buildBasicTree();
    const dep = getNodeAtPath(tree,'dep');
  dep.meta = { watchers: [ { script: '/* watcher executes when value changes */ if(previous !== value){ /* side effects could go here */ }' } ] };
    let snap = null;
    let res = await runWatchers(tree,snap);
    expect(res.triggered.length).toBe(1);
    snap = res.snapshot;
    setPrimitiveValueAtPath(tree,'dep', 20);
    res = await runWatchers(tree,snap);
    expect(res.triggered.length).toBe(1);
  });
});
