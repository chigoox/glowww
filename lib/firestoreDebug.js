// Temporary debug wrapper for Firestore getDocs/getDoc misuse.
// Wraps firebase/firestore exports to log when getDocs is called with a DocumentReference
// (which triggers: Expected type 'Query', but it was: a custom DocumentReference object)

// NOTE: next.config alias points 'firebase/firestore' -> this file. To avoid
// infinite self-import, we resolve the real module path once using a dynamic
// require that bypasses webpack's alias (Node resolution still hits alias, so
// we expose a global escape hatch). If alias causes recursion, we fall back
// to the already loaded cached module keyed by a symbol.
// In practice for Next.js the simple import * as fs is fine because the alias
// is applied only to the specifier string; still we keep a safety check.
import * as fs from 'firebase/firestore';
export * from 'firebase/firestore';

// Heuristics to identify a Query vs DocumentReference vs CollectionReference.
function classify(arg) {
  if (!arg || typeof arg !== 'object') return typeof arg;
  // Firestore SDK symbols expose _query or type metadata but are not public API; use cautiously.
  if ('type' in arg && arg.type === 'query') return 'Query';
  if ('_query' in arg) return 'QueryLike';
  if ('_path' in arg) {
    const path = arg._path;
    if (path && typeof path.length === 'number') {
      // Firestore paths: even length => document, odd => collection
      if (path.length % 2 === 0) return 'DocumentReferenceLike';
      return 'CollectionReferenceLike';
    }
  }
  if (arg.constructor && arg.constructor.name) return arg.constructor.name;
  return 'UnknownObject';
}

let warnedSet = new WeakSet();
let callCount = 0;
export const getDocs = async (maybeQuery, ...rest) => {
  const kind = classify(maybeQuery);
  const isBad = kind.startsWith('DocumentReference') || kind === 'DocumentReferenceLike';
  const isSuspicious = !isBad && kind !== 'Query' && kind !== 'QueryLike' && kind !== 'CollectionReferenceLike';
  // Always log first 15 calls for full visibility; thereafter only log problematic ones.
  if ((callCount < 15 || isBad || isSuspicious) && maybeQuery && typeof maybeQuery === 'object' && !warnedSet.has(maybeQuery)) {
    warnedSet.add(maybeQuery);
    const info = {
      kind,
      call: ++callCount,
      keys: Object.keys(maybeQuery).slice(0,10),
      stack: new Error().stack?.split('\n').slice(0,12).join('\n')
    };
    // eslint-disable-next-line no-console
    console.warn('[firestoreDebug] getDocs invoke', info);
    if (typeof window !== 'undefined') {
      try {
        window.__firestoreGetDocsLog = window.__firestoreGetDocsLog || [];
        if (window.__firestoreGetDocsLog.length > 50) window.__firestoreGetDocsLog.shift();
        window.__firestoreGetDocsLog.push(info);
      } catch {}
    }
  } else {
    callCount++;
  }
  return fs.getDocs(maybeQuery, ...rest);
};

export const getDoc = async (docRef, ...rest) => fs.getDoc(docRef, ...rest);

// Re-export commonly used helpers so we can swap import path quickly.
export const { doc, collection, query, where, limit, addDoc, serverTimestamp } = fs;

// Wrap onSnapshot to log first-arg classification mismatches too.
export function onSnapshotDebug(refOrQuery, ...rest) {
  const kind = classify(refOrQuery);
  const okKinds = ['Query', 'QueryLike', 'CollectionReferenceLike'];
  if (!okKinds.includes(kind)) {
    // DocumentReference is acceptable for onSnapshot, but if identity issues cause mismatch, still log.
    // eslint-disable-next-line no-console
    console.warn('[firestoreDebug] onSnapshot arg kind=', kind, {
      kind,
      keys: refOrQuery && typeof refOrQuery==='object' ? Object.keys(refOrQuery).slice(0,10): [],
      stack: new Error().stack?.split('\n').slice(0,8).join('\n')
    });
  }
  return fs.onSnapshot(refOrQuery, ...rest);
}

// Export under original name for convenience in already-swapped imports.
export { onSnapshotDebug as onSnapshot };

// Provide a helper to wrap a module's getDocs usage without mass refactors.
export function patchFirestoreModule(mod) {
  mod.getDocs = getDocs; // eslint-disable-line no-param-reassign
  return mod;
}
