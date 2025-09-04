// Nested userProps engine
// Schema Node:
// { type: 'object'|'array'|'string'|'number'|'boolean', value?, children?, items?, global? }

const PRIMITIVE_TYPES = ['string','number','boolean'];
const CONTAINER_TYPES = ['object','array'];

function createNode(type, opts = {}) {
  const base = { type };
  if (PRIMITIVE_TYPES.includes(type)) {
    base.value = opts.value !== undefined ? opts.value : (type === 'string' ? '' : type === 'number' ? 0 : false);
  } else if (type === 'object') {
    base.children = opts.children || {};
  } else if (type === 'array') {
    base.items = opts.items || [];
  }
  if (opts.global) base.global = true;
  return base;
}

function isPrimitive(node) { return !!node && PRIMITIVE_TYPES.includes(node.type); }
function isContainer(node) { return !!node && CONTAINER_TYPES.includes(node.type); }

// Migration from legacy flat map: { key: { value, type, global? } }
function migrateFlatMapToTree(flatMap = {}) {
  const root = createNode('object');
  Object.entries(flatMap).forEach(([key, data]) => {
    const { type, value, global } = data || {};
    if (!type) return; // skip invalid
    if (PRIMITIVE_TYPES.includes(type)) {
      root.children[key] = createNode(type, { value, global });
    } else if (type === 'object') {
      // Attempt to parse value if it's a string JSON
      let parsed = value;
      if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch { parsed = {}; }
      }
      root.children[key] = jsToNode(parsed, { global });
    } else if (type === 'array') {
      let parsed = value;
      if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch { parsed = []; }
      }
      root.children[key] = jsToNode(parsed, { global });
    }
  });
  return root;
}

// Convert JS value to node recursively
function jsToNode(value, opts = {}) {
  if (Array.isArray(value)) {
    return createNode('array', { items: value.map(v => jsToNode(v)), global: opts.global });
  }
  if (value && typeof value === 'object') {
    const children = {};
    Object.entries(value).forEach(([k,v]) => {
      children[k] = jsToNode(v);
    });
    return createNode('object', { children, global: opts.global });
  }
  switch(typeof value) {
    case 'string': return createNode('string', { value, global: opts.global });
    case 'number': return createNode('number', { value, global: opts.global });
    case 'boolean': return createNode('boolean', { value, global: opts.global });
    default: return createNode('string', { value: String(value), global: opts.global });
  }
}

// Convert node back to plain JS value
function nodeToJs(node) {
  if (!node) return undefined;
  if (isPrimitive(node)) return node.value;
  if (node.type === 'object') {
    const obj = {};
    Object.entries(node.children || {}).forEach(([k,child]) => {
      obj[k] = nodeToJs(child);
    });
    return obj;
  }
  if (node.type === 'array') {
    return (node.items || []).map(i => nodeToJs(i));
  }
  return undefined;
}

// Flatten only top-level children for legacy compatibility
function flattenTreeToLegacyMap(root) {
  if (!root || root.type !== 'object') return {};
  const map = {};
  Object.entries(root.children || {}).forEach(([key,node]) => {
    if (isPrimitive(node)) {
      map[key] = { type: node.type, value: node.value, global: !!node.global };
    } else {
      // container -> store JSON string to preserve legacy behavior
      map[key] = { type: node.type, value: JSON.stringify(nodeToJs(node)), global: !!node.global };
    }
  });
  return map;
}

function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

// Utility: split path 'a.b.0.c'
function splitPath(path) {
  if (!path) return [];
  return path.split('.').filter(Boolean);
}

function getNodeAtPath(root, path) {
  if (!root) return null;
  const parts = splitPath(path);
  let current = root;
  for (let p of parts) {
    if (!current) return null;
    if (current.type === 'object') {
      current = current.children?.[p];
    } else if (current.type === 'array') {
      const idx = Number(p);
      if (Number.isNaN(idx)) return null;
      current = current.items?.[idx];
    } else {
      return null;
    }
  }
  return current || null;
}

function setNodeAtPath(root, path, node) {
  if (!root) throw new Error('Root required');
  if (!path) throw new Error('Path required');
  const parts = splitPath(path);
  let current = root;
  for (let i=0;i<parts.length;i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    if (current.type === 'object') {
      if (isLast) {
        current.children = current.children || {};
        current.children[part] = node;
        return;
      }
      current.children = current.children || {};
      if (!current.children[part]) {
        // create intermediate object node
        current.children[part] = createNode('object');
      }
      current = current.children[part];
    } else if (current.type === 'array') {
      const idx = Number(part);
      if (Number.isNaN(idx)) throw new Error('Invalid array index in path segment: '+part);
      current.items = current.items || [];
      if (isLast) {
        current.items[idx] = node;
        return;
      }
      if (!current.items[idx]) current.items[idx] = createNode('object');
      current = current.items[idx];
    } else {
      throw new Error('Cannot traverse into primitive at '+parts.slice(0,i).join('.'));
    }
  }
}

function setPrimitiveValueAtPath(root, path, value, typeHint) {
  const inferredType = typeHint || typeof value;
  let type = inferredType;
  if (inferredType === 'object') type = 'string'; // fallback; caller should pass explicit
  if (!PRIMITIVE_TYPES.includes(type)) throw new Error('Invalid primitive type: '+type);
  const node = createNode(type, { value });
  setNodeAtPath(root, path, node);
}

function deleteAtPath(root, path) {
  if (!root || !path) return;
  const parts = splitPath(path);
  let current = root;
  for (let i=0;i<parts.length-1;i++) {
    const part = parts[i];
    if (current.type === 'object') {
      current = current.children?.[part];
    } else if (current.type === 'array') {
      const idx = Number(part);
      current = current.items?.[idx];
    } else return; // can't traverse
    if (!current) return;
  }
  const last = parts[parts.length-1];
  if (current.type === 'object') {
    if (current.children) delete current.children[last];
  } else if (current.type === 'array') {
    const idx = Number(last);
    if (!Number.isNaN(idx) && current.items) current.items.splice(idx,1);
  }
}

function listPaths(root, options = {}) {
  const { includeContainers = true, leavesOnly = false, filterGlobal, prefix = '' } = options;
  const results = [];
  function visit(node, currentPath) {
    if (!node) return;
    const isLeaf = isPrimitive(node) || (node.type === 'array' && (node.items||[]).length === 0) || (node.type === 'object' && Object.keys(node.children||{}).length === 0);
    const include = (leavesOnly ? isLeaf : includeContainers || isLeaf);
    if (include) {
      if (filterGlobal === undefined || !!node.global === !!filterGlobal) {
        results.push({ path: currentPath, node, type: node.type, isLeaf });
      }
    }
    if (node.type === 'object') {
      Object.entries(node.children || {}).forEach(([k,child]) => visit(child, currentPath ? currentPath + '.' + k : k));
    } else if (node.type === 'array') {
      (node.items || []).forEach((child, idx) => visit(child, currentPath ? currentPath + '.' + idx : String(idx)));
    }
  }
  visit(root, prefix ? prefix : '');
  return results.filter(r => r.path !== '');
}

function ensureTree(props) {
  // If already has tree just return it
  if (props.userPropsTree && props.userPropsTree.type) return props.userPropsTree;
  // Migrate from legacy if available
  if (props.userProps && Object.keys(props.userProps).length > 0) {
    const tree = migrateFlatMapToTree(props.userProps);
    props.userPropsTree = tree;
    // Maintain legacy mirror
    props.userProps = flattenTreeToLegacyMap(tree);
    return tree;
  }
  // Initialize empty tree
  const empty = createNode('object');
  props.userPropsTree = empty;
  props.userProps = {};
  return empty;
}

function touchLegacyMap(props) {
  if (!props.userPropsTree) return;
  props.userProps = flattenTreeToLegacyMap(props.userPropsTree);
}

function addChildToObject(root, path, key, type, initialValue, global) {
  const parent = path ? getNodeAtPath(root, path) : root;
  if (!parent || parent.type !== 'object') throw new Error('Parent path is not an object node');
  parent.children = parent.children || {};
  if (parent.children[key]) throw new Error('Key already exists: '+key);
  let node;
  if (PRIMITIVE_TYPES.includes(type)) node = createNode(type, { value: initialValue, global });
  else if (type === 'object') node = createNode('object', { children: {}, global });
  else if (type === 'array') node = createNode('array', { items: [], global });
  else throw new Error('Invalid type: '+type);
  parent.children[key] = node;
}

function pushItemToArray(root, path, type, initialValue, global) {
  const parent = getNodeAtPath(root, path);
  if (!parent || parent.type !== 'array') throw new Error('Parent path is not an array node');
  let node;
  if (PRIMITIVE_TYPES.includes(type)) node = createNode(type, { value: initialValue, global });
  else if (type === 'object') node = createNode('object', { children: {}, global });
  else if (type === 'array') node = createNode('array', { items: [], global });
  else throw new Error('Invalid type: '+type);
  parent.items = parent.items || [];
  parent.items.push(node);
  return parent.items.length - 1; // index
}

function setGlobalFlag(root, path, isGlobal) {
  const node = getNodeAtPath(root, path);
  if (node) node.global = !!isGlobal; 
}

module.exports = {
  createNode,
  migrateFlatMapToTree,
  jsToNode,
  nodeToJs,
  flattenTreeToLegacyMap,
  cloneNode,
  getNodeAtPath,
  setNodeAtPath,
  setPrimitiveValueAtPath,
  deleteAtPath,
  listPaths,
  ensureTree,
  touchLegacyMap,
  addChildToObject,
  pushItemToArray,
  setGlobalFlag,
  isPrimitive,
  isContainer
};
