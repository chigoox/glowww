// Nested userProps engine
// Schema Node:
// { type: 'object'|'array'|'string'|'number'|'boolean', value?, children?, items?, global? }

const PRIMITIVE_TYPES = ['string','number','boolean'];
const CONTAINER_TYPES = ['object','array'];

// Basic forbidden tokens to reduce risk in user-provided expression / watcher scripts
const FORBIDDEN_TOKENS = ['while(true','for(;;','process.','require(','import ','XMLHttpRequest','fetch(','new Function','eval('];
// Execution safety config (can be overridden by env before bundling)
const USER_PROPS_EXECUTION_LIMIT_MS = parseInt(process.env.USER_PROPS_EXECUTION_LIMIT_MS || '40', 10); // soft limit per script
// Schema + loop guard limits
const USER_PROPS_SCHEMA_VERSION = 1; // increment when serialized shape changes
const USER_PROPS_MAX_STEPS = parseInt(process.env.USER_PROPS_MAX_STEPS || '50000', 10);

// Telemetry (cumulative in-memory)
const __userPropsTelemetry = {
  expressionsEvaluated: 0,
  expressionErrors: 0,
  watchersRun: 0,
  watcherErrors: 0,
  pipelines: 0,
  totalMs: 0
};
function getUserPropsTelemetry(){ return { ...__userPropsTelemetry }; }
function resetUserPropsTelemetry(){ Object.keys(__userPropsTelemetry).forEach(k=>{ __userPropsTelemetry[k]=0; }); }

// Simple event bus
const __userPropsEventListeners = new Set();
function onUserPropsEvent(listener){ if (typeof listener==='function'){ __userPropsEventListeners.add(listener); return ()=>__userPropsEventListeners.delete(listener);} return ()=>{}; }
function emitUserPropsEvent(type, payload){ __userPropsEventListeners.forEach(l=>{ try { l({ type, payload, ts: Date.now() }); } catch {/* ignore */} }); }

function safeEvalSnippet(argsNames, argsValues, body, kind, pathRef) {
  // Timeout + cooperative loop guard instrumentation
  if (FORBIDDEN_TOKENS.some(t => body.includes(t))) throw new Error('Forbidden token in '+kind);
  let instrumented = body;
  // Inject step counter calls at loops (heuristic)
  instrumented = instrumented.replace(/\b(for|while)\s*\([^)]*\)\s*{/g, m => m + '__loopStep();');
  instrumented = instrumented.replace(/\bdo\s*{/g, m => m + '__loopStep();');
  // Auto-return heuristic: if user supplied a simple expression (no explicit return / declarations)
  const trimmed = instrumented.trim();
  const looksLikeExpression = (
    // not starting with common statement keywords
    !/^(let|const|var|if|for|while|do|switch|class|function|async|return|try|throw|import|export)\b/.test(trimmed) &&
    // and does not contain obvious statement tokens anywhere
    !/\b(if|for|while|do|switch|return|function|class|try|catch|throw)\b/.test(trimmed) &&
    !/[{};]/.test(trimmed) &&
    // single-line only
    !trimmed.includes('\n') &&
    // not an arrow func itself
    !/=>/.test(trimmed)
  );
  if (looksLikeExpression) {
    instrumented = 'return ('+instrumented+');';
  }
  const wrapped = `let __steps=0; function __loopStep(){ if((++__steps) > ${USER_PROPS_MAX_STEPS}) throw new Error('Step limit exceeded (${kind}${pathRef? ' '+pathRef: ''})'); }`+
    `return (async function(){ ${instrumented.startsWith('return')||instrumented.includes('=>')? '' : ''} ${instrumented} })();`;
  const fn = new Function(...argsNames, wrapped);
  let timer;
  const timeoutPromise = new Promise((_, reject) => { timer = setTimeout(()=> reject(new Error(kind+' timeout > '+USER_PROPS_EXECUTION_LIMIT_MS+'ms'+ (pathRef? ' @ '+pathRef: ''))), USER_PROPS_EXECUTION_LIMIT_MS); });
  return Promise.race([
    fn(...argsValues),
    timeoutPromise
  ]).finally(()=> clearTimeout(timer));
}

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
  if (opts.meta) base.meta = opts.meta; else base.meta = {}; // meta: { expression?, ref?, watchers?:[], validation?:{}, namespace? }
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
  // If an existing primitive node is present, mutate in place to preserve meta/global
  const existing = getNodeAtPath(root, path);
  if (existing && isPrimitive(existing)) {
    existing.type = type;
    existing.value = value;
    return existing;
  }
  const node = createNode(type, { value });
  setNodeAtPath(root, path, node);
  return node;
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
  const { includeContainers = true, leavesOnly = false, filterGlobal, prefix = '', nameFilter, typeFilter } = options;
  const results = [];
  function visit(node, currentPath) {
    if (!node) return;
    const isLeaf = isPrimitive(node) || (node.type === 'array' && (node.items||[]).length === 0) || (node.type === 'object' && Object.keys(node.children||{}).length === 0);
    const include = (leavesOnly ? isLeaf : includeContainers || isLeaf);
    if (include) {
      if (filterGlobal === undefined || !!node.global === !!filterGlobal) {
        if (!nameFilter || currentPath.toLowerCase().includes(nameFilter.toLowerCase())) {
          if (!typeFilter || (Array.isArray(typeFilter) ? typeFilter.includes(node.type) : typeFilter === node.type)) {
            results.push({ path: currentPath, node, type: node.type, isLeaf });
          }
        }
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

// ---- Type Inference & Smart Setting ----
function inferTypeFromString(raw) {
  if (raw === 'true' || raw === 'false') return 'boolean';
  if (raw === '' || raw === undefined || raw === null) return 'string';
  if (!Number.isNaN(Number(raw)) && raw.trim() !== '') return 'number';
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return 'array';
      if (parsed && typeof parsed === 'object') return 'object';
    } catch { /* ignore */ }
  }
  return 'string';
}

function coerceToType(value, type) {
  try {
    if (type === 'string') return String(value);
    if (type === 'number') {
      const n = Number(value); return Number.isNaN(n) ? 0 : n;
    }
    if (type === 'boolean') return value === 'false' ? false : !!value;
    if (type === 'object') {
      if (typeof value === 'string') return JSON.parse(value || '{}');
      return value && typeof value === 'object' ? value : {};
    }
    if (type === 'array') {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
      }
      return Array.isArray(value) ? value : [];
    }
  } catch { return type === 'array' ? [] : (type === 'object' ? {} : (type === 'number' ? 0 : type === 'boolean' ? false : '')); }
  return value;
}

function setPrimitiveSmart(root, path, rawValue, options = {}) {
  const { respectExistingType = true, explicitType } = options;
  const existing = getNodeAtPath(root, path);
  let targetType = explicitType;
  if (!targetType) {
    if (respectExistingType && existing && isPrimitive(existing)) targetType = existing.type;
    else targetType = inferTypeFromString(String(rawValue));
  }
  if (!PRIMITIVE_TYPES.includes(targetType)) throw new Error('Smart set only supports primitive target types');
  const coerced = coerceToType(rawValue, targetType);
  setPrimitiveValueAtPath(root, path, coerced, targetType);
  return { type: targetType, value: coerced };
}

// ---- Expressions & References ----
function setExpressionAtPath(root, path, expression) {
  const node = getNodeAtPath(root, path);
  if (!node || !isPrimitive(node)) throw new Error('Expression can only be set on existing primitive node');
  node.meta = node.meta || {};
  node.meta.expression = expression; // e.g., template or JS-lite expression
}

function clearExpressionAtPath(root, path) {
  const node = getNodeAtPath(root, path);
  if (node && node.meta) delete node.meta.expression;
}

function setReferenceAtPath(root, path, ref) {
  // ref: { nodeId, targetPath }
  const node = getNodeAtPath(root, path);
  if (!node || !isPrimitive(node)) throw new Error('Reference can only be set on existing primitive node');
  node.meta = node.meta || {};
  node.meta.ref = ref; // stored for runtime resolution
}

function clearReferenceAtPath(root, path) {
  const node = getNodeAtPath(root, path);
  if (node && node.meta) delete node.meta.ref;
}

// ---- History (simple snapshot stack; managed externally via props) ----
function snapshotTree(root) { return cloneNode(root); }

// ---- Import / Export ----
function exportTree(root) {
  return JSON.stringify({ version: USER_PROPS_SCHEMA_VERSION, tree: root }, null, 2);
}
function importTree(json) {
  const obj = JSON.parse(json);
  if (obj && typeof obj === 'object' && obj.version && obj.tree) {
    // Future migration logic based on obj.version could be added here
    return obj.tree;
  }
  return obj; // legacy (raw tree)
}

// Basic search convenience
function searchPaths(root, queryStr, options = {}) {
  if (!queryStr) return listPaths(root, options);
  return listPaths(root, { ...options, nameFilter: queryStr });
}

// ---- Binding to Component Props (live sync meta.ref) ----
function updateNodeFromJsValue(root, path, jsValue, preserveMeta = true) {
  // Replace node at path with structure derived from jsValue
  const parts = path.split('.').filter(Boolean);
  let parentPath = parts.slice(0, -1).join('.');
  const key = parts[parts.length - 1];
  if (!parentPath && parts.length === 1) parentPath = ''; // root child
  const parent = getNodeAtPath(root, parentPath);
  if (!parent || parent.type !== 'object') throw new Error('updateNodeFromJsValue currently supports object parent paths only');
  const existing = parent.children[key];
  const preserved = (preserveMeta && existing && existing.meta) ? existing.meta : {};
  // Build node from js value
  let newNode;
  if (jsValue === null || jsValue === undefined) {
    newNode = createNode('string', { value: '' });
  } else if (typeof jsValue === 'string') {
    newNode = createNode('string', { value: jsValue });
  } else if (typeof jsValue === 'number') {
    newNode = createNode('number', { value: jsValue });
  } else if (typeof jsValue === 'boolean') {
    newNode = createNode('boolean', { value: jsValue });
  } else if (Array.isArray(jsValue)) {
    newNode = createNode('array', { items: jsValue.map(v => jsToNode(v)) });
  } else if (typeof jsValue === 'object') {
    const children = {};
    Object.entries(jsValue).forEach(([k, v]) => { children[k] = jsToNode(v); });
    newNode = createNode('object', { children });
  } else {
    newNode = createNode('string', { value: String(jsValue) });
  }
  if (existing && existing.global) newNode.global = true;
  newNode.meta = { ...preserved, ...(newNode.meta || {}) };
  parent.children[key] = newNode;
  return newNode;
}

function bindUserPropToComponentProp(root, path, sourceNodeId, propName, currentValue) {
  // Create or update node meta.ref and set value from currentValue
  const node = getNodeAtPath(root, path);
  if (!node) throw new Error('Cannot bind non-existent user prop node (create it first)');
  // If container and incoming primitive, just convert; if primitive and incoming container, rebuild
  const incomingIsContainer = currentValue && (Array.isArray(currentValue) || typeof currentValue === 'object');
  const nodeIsContainer = node.type === 'object' || node.type === 'array';
  if (incomingIsContainer || nodeIsContainer) {
    // Rebuild structure fully to mirror current value
    updateNodeFromJsValue(root, path, currentValue, true);
  } else {
    // primitive path
    const t = typeof currentValue;
    if (t === 'number' || t === 'boolean' || t === 'string') {
      node.type = t === 'string' ? 'string' : t === 'number' ? 'number' : 'boolean';
      node.value = currentValue;
    } else {
      node.type = 'string';
      node.value = String(currentValue ?? '');
    }
  }
  const bound = getNodeAtPath(root, path); // may have been replaced
  bound.meta = bound.meta || {};
  bound.meta.ref = { sourceNodeId, propName };
  return bound;
}

function unbindUserProp(root, path) {
  const node = getNodeAtPath(root, path);
  if (node && node.meta && node.meta.ref) {
    delete node.meta.ref;
  }
}

function traverseAndSyncReferences(root, getPropValue) {
  let changed = false;
  function visit(node, currentPath) {
    if (!node) return;
    if (node.meta && node.meta.ref) {
      const { sourceNodeId, propName } = node.meta.ref;
      const v = getPropValue(sourceNodeId, propName);
      if (v !== undefined) {
        // compare serialized representation to avoid deep clone overhead if same
        if (node.type === 'object' || node.type === 'array') {
          const serializedOld = JSON.stringify(nodeToJs(node));
          const serializedNew = JSON.stringify(v);
            if (serializedOld !== serializedNew) {
              updateNodeFromJsValue(root, currentPath, v, true);
              const updated = getNodeAtPath(root, currentPath);
              updated.meta.ref = { sourceNodeId, propName }; // ensure ref persists
              changed = true;
            }
        } else {
          let primitiveNew = v;
          if (typeof v === 'object') {
            // convert to JSON string for primitive path fallback
            primitiveNew = JSON.stringify(v);
          }
          const oldSerialized = JSON.stringify(node.value);
          if (JSON.stringify(primitiveNew) !== oldSerialized) {
            if (typeof primitiveNew === 'number') {
              node.type = 'number'; node.value = primitiveNew;
            } else if (typeof primitiveNew === 'boolean') {
              node.type = 'boolean'; node.value = primitiveNew;
            } else {
              node.type = 'string'; node.value = String(primitiveNew);
            }
            changed = true;
          }
        }
      }
    }
    if (node.type === 'object') {
      Object.entries(node.children || {}).forEach(([k, child]) => visit(child, currentPath ? currentPath + '.' + k : k));
    } else if (node.type === 'array') {
      (node.items || []).forEach((child, idx) => visit(child, currentPath + '.' + idx));
    }
  }
  visit(root, '');
  return changed;
}

// ---- Expressions (computed) with dependency ordering ----
// meta.expression: JS snippet; may call get('path') to reference other props.
function extractExpressionDeps(code) {
  const deps = new Set();
  if (typeof code !== 'string') return deps;
  const regex = /get\(['"]([^'"\)]+)['"]\)/g;
  let m; while ((m = regex.exec(code)) !== null) { if (m[1]) deps.add(m[1]); }
  return deps;
}

function gatherExpressionNodes(root) {
  const nodes = {}; // path -> { node, expr, deps }
  function walk(n, p) {
    if (!n) return;
    if (n.meta && n.meta.expression && !n.meta.ref && isPrimitive(n)) {
      const expr = n.meta.expression;
      nodes[p] = { node: n, expr, deps: Array.from(extractExpressionDeps(expr)) };
    }
    if (n.type === 'object') Object.entries(n.children||{}).forEach(([k,c])=>walk(c,p? p+'.'+k : k));
    else if (n.type === 'array') (n.items||[]).forEach((c,i)=>walk(c,p? p+'.'+i : String(i)));
  }
  walk(root,'');
  return nodes;
}

// Build dependency graph: nodes with expressions only; edges from dependency -> dependent
function buildExpressionDependencyGraph(root){
  const exprMap = gatherExpressionNodes(root);
  // include both expression nodes and their dependencies (even if not expressions) as nodes in the graph
  const nodeIds = new Set(Object.keys(exprMap));
  Object.values(exprMap).forEach(info => info.deps.forEach(d => nodeIds.add(d)));
  const nodes = Array.from(nodeIds).map(p=>({ id:p, hasError: !!(exprMap[p] && exprMap[p].node.meta && exprMap[p].node.meta.expressionError) }));
  const edges = [];
  Object.entries(exprMap).forEach(([p, info])=>{
    info.deps.forEach(dep=>{ edges.push({ from: dep, to: p }); });
  });
  // indegree for layering
  const indeg = {}; nodes.forEach(n=> indeg[n.id]=0);
  edges.forEach(e=>{ if (indeg[e.to] !== undefined) indeg[e.to]++; });
  // Kahn layering
  const queue = []; Object.entries(indeg).forEach(([id,d])=>{ if(d===0) queue.push(id); });
  const order=[]; const adj={}; nodes.forEach(n=>adj[n.id]=[]); edges.forEach(e=>adj[e.from].push(e.to));
  while(queue.length){ const cur=queue.shift(); order.push(cur); adj[cur].forEach(nxt=>{ indeg[nxt]--; if(indeg[nxt]===0) queue.push(nxt); }); }
  const hasCycle = order.length !== nodes.length;
  // Levels by longest distance from sources
  const level={}; order.forEach(id=> level[id]=0);
  order.forEach(id=>{ adj[id].forEach(nxt=>{ level[nxt] = Math.max(level[nxt]||0, (level[id]||0)+1); }); });
  // For nodes not in order due to cycle, assign last level
  if(hasCycle){ nodes.forEach(n=>{ if(level[n.id]===undefined) level[n.id]=(order.length? Math.max(...Object.values(level))+1:0); }); }
  nodes.forEach(n=> n.level = level[n.id] || 0);
  return { nodes, edges, hasCycle };
}

function topoOrderExpressionPaths(nodes) {
  // nodes: path -> { deps }
  const indeg = {}; const adj = {}; Object.keys(nodes).forEach(p=>{ indeg[p]=0; adj[p]=[]; });
  Object.entries(nodes).forEach(([p,info]) => {
    info.deps.forEach(d => { if (nodes[d]) { indeg[p]++; adj[d].push(p); } });
  });
  const queue = []; Object.entries(indeg).forEach(([p,v])=>{ if (v===0) queue.push(p); });
  const ordered = []; let idx=0;
  while (idx < queue.length) { const cur = queue[idx++]; ordered.push(cur); adj[cur].forEach(n=>{ indeg[n]--; if (indeg[n]===0) queue.push(n); }); }
  // If cycle: append remaining unsorted nodes (they will evaluate in arbitrary order)
  if (ordered.length !== Object.keys(nodes).length) {
    Object.keys(nodes).forEach(p=>{ if (!ordered.includes(p)) ordered.push(p); });
  }
  return ordered;
}

async function evaluateExpressions(root) {
  const exprNodes = gatherExpressionNodes(root);
  const order = topoOrderExpressionPaths(exprNodes);
  const changes = [];
  function getValueByPath(p) {
    if (!p) return undefined;
    const n = getNodeAtPath(root, p);
    if (!n) return undefined;
    if (n.type === 'object' || n.type === 'array') return nodeToJs(n);
    return n.value;
  }
  for (const path of order) {
    const info = exprNodes[path]; if (!info) continue; // continue instead of returning prematurely
    const { node, expr } = info;
    try {
      const result = await safeEvalSnippet(['get','path','root'], [getValueByPath, path, root], expr, 'expression', path);
      const oldSerialized = JSON.stringify(node.value);
      if (JSON.stringify(result) !== oldSerialized) {
        if (typeof result === 'number') { node.type='number'; node.value=result; }
        else if (typeof result === 'boolean') { node.type='boolean'; node.value=result; }
        else { node.type='string'; node.value= String(result); }
        changes.push(path);
      }
      if (node.meta) delete node.meta.expressionError;
      __userPropsTelemetry.expressionsEvaluated++;
    } catch(e) {
      if (node.meta) node.meta.expressionError = e && e.message ? e.message : 'Expression error';
      __userPropsTelemetry.expressionErrors++;
    }
  }
  return changes;
}

// ---- Validation ----
// meta.validation: { required?, min?, max?, pattern?, custom? (fn string) }
function validateTree(root) {
  const errors = {}; // path -> [messages]
  function getValue(node) {
    if (!node) return undefined;
    if (isPrimitive(node)) return node.value;
    return nodeToJs(node);
  }
  function visit(node, currentPath) {
    if (!node) return;
    if (node.meta && node.meta.validation) {
      const v = node.meta.validation;
      const val = getValue(node);
      const pathErrs = [];
      if (v.required && (val === undefined || val === '' || val === null)) pathErrs.push('Required');
      if (typeof val === 'number') {
        if (v.min !== undefined && val < v.min) pathErrs.push('Min '+v.min);
        if (v.max !== undefined && val > v.max) pathErrs.push('Max '+v.max);
      }
      if (v.pattern && typeof val === 'string') {
        try { const re = new RegExp(v.pattern); if (!re.test(val)) pathErrs.push('Pattern mismatch'); } catch { /* ignore */ }
      }
      if (v.custom) {
        try { const fn = new Function('value','path','root', v.custom); const res = fn(val,currentPath,root); if (res === false) pathErrs.push('Custom validation failed'); if (typeof res === 'string') pathErrs.push(res); } catch { pathErrs.push('Custom validation error'); }
      }
      if (pathErrs.length) errors[currentPath] = pathErrs;
    }
    if (node.type === 'object') Object.entries(node.children||{}).forEach(([k,c])=>visit(c,currentPath?currentPath+'.'+k:k));
    else if (node.type==='array') (node.items||[]).forEach((c,i)=>visit(c,currentPath?currentPath+'.'+i:String(i)));
  }
  visit(root,'');
  return errors;
}

// ---- Watchers ----
// meta.watchers: array of { script }
async function runWatchers(root, previousSnapshot) {
  const triggered = [];
  const logs = [];
  function getValue(node){ if(!node) return undefined; return isPrimitive(node)? node.value : nodeToJs(node);}  
  function getPrev(path){ return previousSnapshot ? previousSnapshot[path] : undefined; }
  function recordSnapshot(node, path, acc){ acc[path]=getValue(node); if (node.type==='object') Object.entries(node.children||{}).forEach(([k,c])=>recordSnapshot(c,path?path+'.'+k:k,acc)); else if (node.type==='array')(node.items||[]).forEach((c,i)=>recordSnapshot(c,path?path+'.'+i:String(i),acc)); }
  // Build current snapshot once
  const currentSnap = {}; recordSnapshot(root,'',currentSnap);
  async function visit(node,path){
    if(!node) return;
    if (node.meta && Array.isArray(node.meta.watchers) && node.meta.watchers.length){
      const prev = previousSnapshot?previousSnapshot[path]:undefined;
      const curr = currentSnap[path];
      const firstRun = !previousSnapshot; // treat as changed on first run to prime watchers
      if (firstRun || JSON.stringify(prev)!==JSON.stringify(curr)){
        for (const w of node.meta.watchers){
          try {
            const start = (typeof performance!=='undefined' && performance.now)? performance.now(): Date.now();
            await safeEvalSnippet(['value','path','root','previous'], [curr,path,root,prev], w.script, 'watcher', path);
            triggered.push(path); __userPropsTelemetry.watchersRun++;
            const end = (typeof performance!=='undefined' && performance.now)? performance.now(): Date.now();
            logs.push({ path, ts: Date.now(), durationMs: +(end-start).toFixed(2), error: null });
          } catch(e){ __userPropsTelemetry.watcherErrors++; logs.push({ path, ts: Date.now(), durationMs: 0, error: e && e.message ? e.message : 'error' }); }
        }
      }
    }
    if (node.type==='object') { for (const [k,c] of Object.entries(node.children||{})) await visit(c,path?path+'.'+k:k); }
    else if (node.type==='array'){ let idx=0; for (const c of (node.items||[])) { await visit(c,path?path+'.'+idx: String(idx)); idx++; } }
  }
  await visit(root,'');
  return { triggered, snapshot: currentSnap, logs };
}

// ---- Unified evaluation pipeline (expressions -> validation -> watchers) with metrics ----
async function evaluatePipeline(root, previousWatcherSnapshot) {
  const start = (typeof performance!=='undefined' && performance.now)? performance.now(): Date.now();
  const exprChanges = await evaluateExpressions(root);
  const validationErrors = validateTree(root);
  const watcherResult = await runWatchers(root, previousWatcherSnapshot);
  const end = (typeof performance!=='undefined' && performance.now)? performance.now(): Date.now();
  const tookMs = +(end-start).toFixed(2);
  __userPropsTelemetry.pipelines++; __userPropsTelemetry.totalMs += tookMs;
  const result = {
    exprChanges,
    validationErrors,
    watcherResult,
    metrics: {
      tookMs,
      expressionEvaluations: exprChanges.length,
      watchersTriggered: watcherResult.triggered.length,
      cumulativeTelemetry: getUserPropsTelemetry()
    }
  };
  try { emitUserPropsEvent('pipelineComplete', { durationMs: tookMs, exprChanges: exprChanges.slice(), watchersTriggered: watcherResult.triggered.slice(), validationErrorCount: Object.keys(validationErrors).length }); } catch {/* ignore */}
  return result;
}

// Line diff utility (used for testing / potential external consumption)
function generateLineDiff(prevVal, currVal){
  const prevJson = JSON.stringify(prevVal, null, 2).split('\n');
  const currJson = JSON.stringify(currVal, null, 2).split('\n');
  const m = prevJson.length, n2 = currJson.length;
  const dp = Array.from({length:m+1},()=>Array(n2+1).fill(0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n2;j++) dp[i][j] = prevJson[i-1]===currJson[j-1]? dp[i-1][j-1]+1: Math.max(dp[i-1][j], dp[i][j-1]);
  const diff=[]; let i=m,j=n2; while(i>0 && j>0){ if(prevJson[i-1]===currJson[j-1]){ diff.push({type:'unchanged', line:prevJson[i-1]}); i--; j--; } else if(dp[i-1][j]>=dp[i][j-1]){ diff.push({type:'removed', line:prevJson[i-1]}); i--; } else { diff.push({type:'added', line:currJson[j-1]}); j--; } }
  while(i>0){ diff.push({type:'removed', line:prevJson[i-1]}); i--; }
  while(j>0){ diff.push({type:'added', line:currJson[j-1]}); j--; }
  return diff.reverse();
}

// Optional worker-based evaluation placeholder (non-worker fallback for CJS/Jest)
function evaluatePipelineWithWorker(root, previousWatcherSnapshot){
  return evaluatePipeline(root, previousWatcherSnapshot);
}

// ---- Flatten snapshot (for undo / diffing) ----
function flattenSnapshot(root){
  const flat = {};
  function walk(node, path){ if(!node) return; if (isPrimitive(node)) flat[path]=node.value; if (node.type==='object') Object.entries(node.children||{}).forEach(([k,c])=>walk(c,path?path+'.'+k:k)); else if (node.type==='array')(node.items||[]).forEach((c,i)=>walk(c,path?path+'.'+i:String(i))); }
  walk(root,'');
  return flat;
}

// ---- Validation Helpers (UI) ----
function clearValidationAtPath(root, path){
  const node = getNodeAtPath(root, path);
  if (node && node.meta && node.meta.validation) delete node.meta.validation;
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
  if (typeof props.userPropsWatcherSnapshot === 'undefined') {
    props.userPropsWatcherSnapshot = null;
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

// Reorder an item within an array node
function reorderArrayItem(root, path, fromIndex, toIndex) {
  const parent = getNodeAtPath(root, path);
  if (!parent || parent.type !== 'array') throw new Error('Path is not an array node');
  const items = parent.items || [];
  const len = items.length;
  if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) return false;
  if (fromIndex === toIndex) return false;
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  parent.items = items;
  return true;
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
  reorderArrayItem,
  setGlobalFlag,
  isPrimitive,
  isContainer,
  inferTypeFromString,
  coerceToType,
  setPrimitiveSmart,
  setExpressionAtPath,
  clearExpressionAtPath,
  setReferenceAtPath,
  clearReferenceAtPath,
  snapshotTree,
  exportTree,
  importTree,
  searchPaths,
  updateNodeFromJsValue,
  bindUserPropToComponentProp,
  unbindUserProp,
  traverseAndSyncReferences,
  evaluateExpressions,
  validateTree,
  runWatchers,
  extractExpressionDeps,
  clearValidationAtPath,
  evaluatePipeline,
  flattenSnapshot,
  USER_PROPS_EXECUTION_LIMIT_MS,
  FORBIDDEN_TOKENS,
  generateLineDiff,
  evaluatePipelineWithWorker,
  buildExpressionDependencyGraph,
  gatherExpressionNodes
  ,USER_PROPS_SCHEMA_VERSION
  ,USER_PROPS_MAX_STEPS
  ,getUserPropsTelemetry
  ,resetUserPropsTelemetry
  ,onUserPropsEvent
  ,emitUserPropsEvent
};
