const {
  createNode,
  setExpressionAtPath,
  evaluatePipeline,
  flattenSnapshot,
  ensureTree
} = require('../app/Components/utils/userprops/userPropsEngine');

// Helper to build minimal props object
function initProps(){ return { userPropsTree: createNode('object') }; }

describe('userProps sandbox timeouts', () => {
  test('expression timeout sets expressionError', async () => {
    const props = initProps();
    const root = props.userPropsTree;
    // primitive node
    root.children.example = createNode('number', { value: 1, meta: {} });
    setExpressionAtPath(root, 'example', 'let x = 0; while(true){ x++; if(x>1e9) break; } return x;');
    const { validationErrors, watcherResult } = await evaluatePipeline(root, null);
    expect(root.children.example.meta.expressionError).toBeTruthy();
  });
});
