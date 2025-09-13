// Firestore-backed Global User Props & Alias Support (Phase 1)
// Provides a separate global tree (site scope) plus helpers to create/promote
// and alias global nodes inside per-page local userProps trees.

'use client';

import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  createNode,
  getNodeAtPath,
  setNodeAtPath,
  listPaths,
  ensureTree as _ensureTree // not used directly but kept for parity
} from './userPropsEngine';

// ---- Module level cache (per site) ----
let __globalRoot = null; // global user props tree root (object node)
let __globalMeta = { userId: null, siteId: null, loaded: false, dirty: false };
let __unsubscribeRT = null;
const __subscribers = new Set(); // functions called on remote/global updates
let __saveTimer = null;
let __undoStack = [];
let __redoStack = [];
// Track last local write and last server snapshot times to prevent stale snapshot overwrites
let __lastLocalWriteAt = 0; // ms epoch
let __lastServerSeenAt = 0; // ms epoch
// Simple monotonic generation to avoid stale snapshot resurrection across writers
let __localGeneration = 0;
let __serverGeneration = 0;

const GLOBAL_DOC_ID = 'globalUserProps';
const GLOBAL_SCHEMA_VERSION = 1; // bump when we change stored shape

// Utility: generate lightweight unique id (avoid pulling full uuid lib for now)
function genId() { return 'g_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36); }

// Assign stable globalId to every node lacking one (recursive)
function ensureGlobalIds(node) {
  if (!node || typeof node !== 'object') return;
  node.meta = node.meta || {};
  if (!node.meta.globalId) node.meta.globalId = genId();
  if (node.type === 'object') {
    Object.values(node.children || {}).forEach(ch => ensureGlobalIds(ch));
  } else if (node.type === 'array') {
    (node.items || []).forEach(ch => ensureGlobalIds(ch));
  }
}

function traverse(node, cb, path='') {
  if (!node) return;
  cb(node, path);
  if (node.type === 'object') {
    Object.entries(node.children || {}).forEach(([k,child]) => traverse(child, cb, path? path+'.'+k : k));
  } else if (node.type === 'array') {
    (node.items || []).forEach((child,i) => traverse(child, cb, path? path+'.'+i : String(i)));
  }
}

// Snapshot helpers for undo/redo
function pushUndoSnapshot() {
  try {
    if (!__globalRoot) return;
    __undoStack = __undoStack.slice(-19);
    __undoStack.push(JSON.stringify(__globalRoot));
    __redoStack = [];
  } catch {/* ignore */}
}

function restoreSnapshot(serialized) {
  try { __globalRoot = JSON.parse(serialized); return true; } catch { return false; }
}

// Build map: globalId -> { node, path }
function buildIdMap(root) {
  const map = new Map();
  traverse(root, (n,p) => { if (n.meta && n.meta.globalId) map.set(n.meta.globalId, { node: n, path: p }); });
  return map;
}

// Debounced save
function scheduleSave() {
  if (!__globalRoot || !__globalMeta.userId || !__globalMeta.siteId) return;
  __globalMeta.dirty = true;
  if (__saveTimer) clearTimeout(__saveTimer);
  __saveTimer = setTimeout(async () => {
    try {
      const ref = doc(db, 'users', __globalMeta.userId, 'sites', __globalMeta.siteId, 'data', GLOBAL_DOC_ID);
      // Overwrite entire document to ensure removed globals don't reappear via field merges
      const nextGeneration = Math.max(__localGeneration || 0, __serverGeneration || 0) + 1;
      await setDoc(ref, {
        version: GLOBAL_SCHEMA_VERSION,
        updatedAt: serverTimestamp(),
        generation: nextGeneration,
        tree: __globalRoot
      }, { merge: false });
  // mark last successful local write time so we can ignore older snapshots
  __lastLocalWriteAt = Date.now();
      __localGeneration = nextGeneration;
      __globalMeta.dirty = false;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[globalUserPropsStore] save failed', e);
    }
  }, 400); // batch writes within 400ms window
}

export async function loadGlobalUserProps(userId, siteId) {
  if (!userId || !siteId) throw new Error('userId & siteId required');
  const docRef = doc(db, 'users', userId, 'sites', siteId, 'data', GLOBAL_DOC_ID);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      __globalRoot = data.tree && data.tree.type ? data.tree : createNode('object');
      try {
        const ts = data.updatedAt && typeof data.updatedAt.toMillis === 'function' ? data.updatedAt.toMillis() : 0;
        if (ts) __lastServerSeenAt = ts;
      } catch {/* ignore timestamp parse */}
  try { __serverGeneration = (typeof data.generation === 'number') ? data.generation : 0; } catch { __serverGeneration = 0; }
    } else {
      __globalRoot = createNode('object');
      scheduleSave(); // save initial
    }
  } catch (e) {
    __globalRoot = createNode('object');
  }
  // Only persist if assigning ids actually mutated the tree
  const beforeIds = JSON.stringify(__globalRoot);
  ensureGlobalIds(__globalRoot);
  const afterIds = JSON.stringify(__globalRoot);
  __globalMeta = { userId, siteId, loaded: true, dirty: false };
  if (beforeIds !== afterIds) scheduleSave();
  pushUndoSnapshot();
  // Attach real-time listener once
  if (!__unsubscribeRT) {
    __unsubscribeRT = onSnapshot(docRef, (snapshot) => {
      try {
        if (!snapshot.exists()) return;
        // If pending local writes we already have state; skip to avoid flicker
        if (snapshot.metadata.hasPendingWrites) return;
        const data = snapshot.data();
        if (!data) return;
        const snapMs = (data.updatedAt && typeof data.updatedAt.toMillis === 'function') ? data.updatedAt.toMillis() : 0;
        // Ignore snapshots older than our last seen server state or our last local write
        const floor = Math.max(__lastServerSeenAt || 0, __lastLocalWriteAt || 0);
        if (snapMs && snapMs <= floor) return;
  // Generation gating: ignore remote generations behind our local
  const snapGen = (typeof data.generation === 'number') ? data.generation : 0;
  if (snapGen < (__localGeneration || 0)) return;
        const incoming = data.tree && data.tree.type ? data.tree : createNode('object');
        ensureGlobalIds(incoming);
        const before = JSON.stringify(__globalRoot);
        __globalRoot = incoming;
        const after = JSON.stringify(__globalRoot);
        if (snapMs) __lastServerSeenAt = Math.max(__lastServerSeenAt, snapMs);
  __serverGeneration = Math.max(__serverGeneration || 0, snapGen || 0);
        if (before !== after) { pushUndoSnapshot(); __subscribers.forEach(fn => { try { fn({ type: 'remote-update' }); } catch {/* ignore */} }); }
      } catch (e) { /* eslint-disable-next-line no-console */ console.warn('[globalUserPropsStore] snapshot err', e); }
    });
  }
  return __globalRoot;
}

export function getGlobalRoot() { return __globalRoot; }
export function isGlobalLoaded() { return !!(__globalMeta && __globalMeta.loaded); }

// List global paths using existing listPaths util
export function listGlobalPropPaths(options = {}) {
  if (!__globalRoot) return [];
  return listPaths(__globalRoot, options);
}

// Retrieve global node by id/path
export function getGlobalNodeById(globalId) {
  if (!__globalRoot) return null;
  let found = null;
  traverse(__globalRoot, (n) => { if (!found && n.meta && n.meta.globalId === globalId) found = n; });
  return found;
}

export function getGlobalNodeByPath(path) {
  if (!__globalRoot) return null;
  return getNodeAtPath(__globalRoot, path);
}

// Create or overwrite a primitive global node at path
export function createOrSetGlobalPrimitive(path, type, value) {
  if (!__globalRoot) throw new Error('Global root not loaded');
  if (!path) throw new Error('Path required');
  const allowed = ['string','number','boolean'];
  if (!allowed.includes(type)) throw new Error('Primitive type only');
  pushUndoSnapshot();
  const existing = getNodeAtPath(__globalRoot, path);
  if (existing) {
    existing.type = type; existing.value = value; // preserve meta/globalId
  } else {
    const node = createNode(type, { value });
    ensureGlobalIds(node); // assign id to this subtree
    setNodeAtPath(__globalRoot, path, node);
  }
  ensureGlobalIds(__globalRoot); // fill any missing ids created along intermediate objects
  scheduleSave();
  // Immediately notify subscribers so UI (aliases, managers) refresh without waiting for RT snapshot
  __subscribers.forEach(fn => { try { fn({ type: 'remote-update', path }); } catch {/* ignore */} });
}

// Recursively ensure object parents exist when setting nodes via setNodeAtPath
// (setNodeAtPath already creates object nodes as needed via createNode('object')).

// Promote a local node subtree to global and replace local with alias meta
export function promoteLocalNodeToGlobal(localTree, localPath, desiredGlobalPath) {
  if (!__globalRoot) throw new Error('Global root not loaded');
  if (!localTree) throw new Error('Local tree required');
  const localNode = getNodeAtPath(localTree, localPath);
  if (!localNode) throw new Error('Local path not found');
  if (localNode.meta && localNode.meta.aliasGlobalId) throw new Error('Already an alias');
  // Deep clone local subtree (JSON) then insert into global path
  pushUndoSnapshot();
  const cloned = JSON.parse(JSON.stringify(localNode));
  // Remove any existing alias markers inside subtree (should not exist) & assign new ids
  traverse(cloned, (n) => {
    if (n.meta) {
      delete n.meta.aliasGlobalId; 
      delete n.meta.aliasGlobalPath; 
      // Remove ref binding meta so global value becomes a snapshot, not live ref
      if (n.meta.ref) delete n.meta.ref;
    }
  });
  ensureGlobalIds(cloned);
  setNodeAtPath(__globalRoot, desiredGlobalPath, cloned);
  // Build alias on local node: keep meta (watchers etc.) but mark alias
  localNode.meta = localNode.meta || {};
  localNode.meta.aliasGlobalId = cloned.meta.globalId;
  localNode.meta.aliasGlobalPath = desiredGlobalPath;
  // We'll allow local watchers/validation to remain – value sync will overwrite structure nodes
  scheduleSave();
  __subscribers.forEach(fn => { try { fn({ type: 'remote-update', path: desiredGlobalPath }); } catch {/* ignore */} });
  return { globalId: cloned.meta.globalId, globalPath: desiredGlobalPath };
}

// Create alias referencing existing global node
export function createAliasToGlobal(localTree, localPath, globalPathOrId) {
  if (!__globalRoot) throw new Error('Global root not loaded');
  const byId = getGlobalNodeById(globalPathOrId);
  const globalNode = byId || getGlobalNodeByPath(globalPathOrId);
  if (!globalNode) throw new Error('Global target not found');
  const localNode = getNodeAtPath(localTree, localPath);
  if (!localNode) throw new Error('Local path not found');
  localNode.meta = localNode.meta || {};
  localNode.meta.aliasGlobalId = globalNode.meta.globalId;
  localNode.meta.aliasGlobalPath = byId ? (buildIdMap(__globalRoot).get(globalNode.meta.globalId)?.path || '') : globalPathOrId;
  return { globalId: globalNode.meta.globalId, globalPath: localNode.meta.aliasGlobalPath };
}

// Sync alias nodes in local tree to reflect current global values (structure & primitive value)
export function syncAliasNodes(localRoot) {
  if (!localRoot || !__globalRoot) return false;
  const idMap = buildIdMap(__globalRoot);
  let changed = false;
  function overwriteFromGlobal(localNode, globalNode) {
    if (!globalNode) return;
    // Preserve local meta fields except structural ones we rebuild
    const preservedMeta = { ...(localNode.meta || {}) };
    // Keep alias markers, watchers, validation, expression
    const aliasGlobalId = preservedMeta.aliasGlobalId;
    const aliasGlobalPath = preservedMeta.aliasGlobalPath;
    const watchers = preservedMeta.watchers;
    const validation = preservedMeta.validation;
    const expression = preservedMeta.expression;
    // Rebuild structural fields
    localNode.type = globalNode.type;
    if (globalNode.type === 'object') {
      localNode.children = JSON.parse(JSON.stringify(globalNode.children || {}));
      delete localNode.items;
      delete localNode.value;
    } else if (globalNode.type === 'array') {
      localNode.items = JSON.parse(JSON.stringify(globalNode.items || []));
      delete localNode.children;
      delete localNode.value;
    } else { // primitive
      localNode.value = globalNode.value;
      delete localNode.children;
      delete localNode.items;
    }
    localNode.meta = { ...globalNode.meta, watchers, validation, expression, aliasGlobalId, aliasGlobalPath };
  }
  traverse(localRoot, (n) => {
    if (n.meta && n.meta.aliasGlobalId) {
      const ref = idMap.get(n.meta.aliasGlobalId);
      if (ref && ref.node) {
        const before = JSON.stringify({ t:n.type, v:n.value, c:n.children, i:n.items });
        overwriteFromGlobal(n, ref.node);
        const after = JSON.stringify({ t:n.type, v:n.value, c:n.children, i:n.items });
        if (before !== after) changed = true;
      } else {
        // Global target no longer exists: detach alias to prevent ghost re-creates and mark for UX
        const meta = n.meta || {};
        delete meta.aliasGlobalId;
        delete meta.aliasGlobalPath;
        meta.detachedDueToDelete = Date.now();
        n.meta = meta;
        changed = true;
      }
    }
  });
  return changed;
}

export function exportGlobalTree() { return __globalRoot; }

// For testing/debugging
export function _resetGlobalCache() { __globalRoot = null; __globalMeta = { userId:null, siteId:null, loaded:false, dirty:false }; if (__saveTimer) clearTimeout(__saveTimer); }

// Subscription API for UI/hooks
export function subscribeGlobalUserProps(cb) {
  if (typeof cb !== 'function') return () => {};
  __subscribers.add(cb);
  return () => { __subscribers.delete(cb); };
}

// ---- Phase 2 Operations ----

export function renameGlobalPath(oldPath, newPath) {
  if (!__globalRoot) throw new Error('Global root not loaded');
  if (!oldPath || !newPath || oldPath === newPath) return false;
  const dest = getNodeAtPath(__globalRoot, newPath);
  if (dest) throw new Error('Destination exists');
  const node = getNodeAtPath(__globalRoot, oldPath);
  if (!node) throw new Error('Source not found');
  pushUndoSnapshot();
  const cloned = JSON.parse(JSON.stringify(node));
  setNodeAtPath(__globalRoot, newPath, cloned);
  // delete old
  const parts = oldPath.split('.'); const last = parts.pop(); const parentPath = parts.join('.');
  const parent = parentPath ? getNodeAtPath(__globalRoot, parentPath) : __globalRoot;
  if (parent && parent.type === 'object' && parent.children) delete parent.children[last];
  scheduleSave();
  __subscribers.forEach(fn => { try { fn({ type: 'rename', oldPath, newPath }); } catch {} });
  return true;
}

export function deleteGlobalPath(path) {
  if (!__globalRoot) throw new Error('Global root not loaded');
  if (!path) return false;
  const node = getNodeAtPath(__globalRoot, path); if (!node) return false;
  pushUndoSnapshot();
  const parts = path.split('.'); const last = parts.pop(); const parentPath = parts.join('.');
  const parent = parentPath ? getNodeAtPath(__globalRoot, parentPath) : __globalRoot;
  if (parent && parent.type === 'object' && parent.children && parent.children[last]) {
    delete parent.children[last];
    scheduleSave();
    __subscribers.forEach(fn => { try { fn({ type: 'delete', path }); } catch {} });
    return true;
  }
  return false;
}

export function countAliasesReferencing(globalId, localTree) {
  if (!globalId || !localTree) return 0;
  let count = 0;
  traverse(localTree, n => { if (n.meta && n.meta.aliasGlobalId === globalId) count++; });
  return count;
}

export function undoGlobalUserProps() {
  if (__undoStack.length < 2) return false; // current + previous needed
  const current = __undoStack.pop();
  __redoStack.push(current);
  const prev = __undoStack[__undoStack.length - 1];
  if (restoreSnapshot(prev)) { __subscribers.forEach(fn => { try { fn({ type: 'undo' }); } catch {} }); return true; }
  return false;
}

export function redoGlobalUserProps() {
  if (!__redoStack.length) return false;
  const next = __redoStack.pop();
  if (restoreSnapshot(next)) { __undoStack.push(next); __subscribers.forEach(fn => { try { fn({ type: 'redo' }); } catch {} }); return true; }
  return false;
}

// Detach alias: caller passes local node; here we just provide helper to strip alias meta (UI performs tree mutation)
export function detachAliasNode(localNode) {
  if (!localNode || !localNode.meta || !localNode.meta.aliasGlobalId) return false;
  delete localNode.meta.aliasGlobalId;
  delete localNode.meta.aliasGlobalPath;
  return true;
}
