// Minimal helpers used by legacy admin UI
'use client'

export function createArray(n = 0) {
  return Array.from({ length: Math.max(0, Number(n) || 0) }, (_, i) => i);
}

export function filterNullFromArray(arr = []) {
  return (arr || []).filter(Boolean);
}

export function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

export function isDev() {
  if (typeof window === 'undefined') return process.env.NODE_ENV !== 'production';
  return !!(window && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
}
