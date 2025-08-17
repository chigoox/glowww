import { adminAuth } from '@/lib/firebaseAdmin';

function extractRoles(decoded){
  const roles = new Set();
  // Common custom claim patterns
  if(Array.isArray(decoded.roles)) decoded.roles.forEach(r=> roles.add(r));
  if(decoded.role) roles.add(decoded.role);
  if(decoded.isAdmin || decoded.admin) roles.add('admin');
  if(decoded.isSeller || decoded.seller) roles.add('seller');
  if(decoded.platformAdmin) roles.add('admin');
  return Array.from(roles);
}

export async function requireAuth(req) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if(!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { code: 'AUTH_REQUIRED', message: 'Missing bearer token' } };
  }
  const token = authHeader.slice(7).trim();
  if(!adminAuth) return { error: { code: 'AUTH_UNAVAILABLE', message: 'Auth not configured' } };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const roles = extractRoles(decoded);
    const sellerUserId = decoded.sellerUserId || decoded.seller_id || null;
    return { user: { uid: decoded.uid, email: decoded.email || null, roles, sellerUserId } };
  } catch (e) {
    return { error: { code: 'AUTH_INVALID', message: 'Invalid token' } };
  }
}

export function enforceUserMatch(user, providedUserId){
  if(!user) return { error: { code: 'AUTH_REQUIRED', message: 'No auth user' } };
  if(providedUserId && providedUserId !== user.uid) {
    return { error: { code: 'FORBIDDEN_MISMATCH_USER', message: 'User mismatch' } };
  }
  return { ok: true };
}

export function enforceSellerOwnership({ user, order, allowBuyer = false, action = 'mutate' }){
  if(!user) return { error:{ code:'AUTH_REQUIRED', message:'No auth user' } };
  const isAdmin = user.roles?.includes('admin');
  const isSeller = user.roles?.includes('seller');
  const isBuyer = order && order.userId === user.uid;
  if(isAdmin) return { ok:true, actor:'admin' };
  if(isSeller && order && order.sellerUserId === (user.sellerUserId || user.uid)) return { ok:true, actor:'seller' };
  if(allowBuyer && isBuyer) return { ok:true, actor:'buyer' };
  return { error:{ code:'FORBIDDEN_OWNERSHIP', message:`Not authorized to ${action} this order` } };
}
