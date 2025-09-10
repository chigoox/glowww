const {
  createNode,
  validateTree
} = require('../app/Components/utils/userprops/userPropsEngine');

describe('validation presets (manual simulation)', () => {
  test('required + pattern failure', () => {
    const root = createNode('object');
    root.children.email = createNode('string', { value: '', meta: { validation: { required: true, pattern: '^.+@.+\\..+$' } } });
    const errors = validateTree(root);
    expect(errors['email']).toBeTruthy();
  });

  test('passes valid email', () => {
    const root = createNode('object');
    root.children.email = createNode('string', { value: 'test@example.com', meta: { validation: { required: true, pattern: '^.+@.+\\..+$' } } });
    const errors = validateTree(root);
    expect(errors['email']).toBeUndefined();
  });
});
