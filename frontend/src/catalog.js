export const DEFAULT_CATALOG = {
  products: [
    { id: 'aadhaar', name: 'AADHAAR VERIFIED ID', stock: 0, price: 35, description: 'Aadhaar verified IDs' },
    { id: 'normal', name: 'NORMAL ID', stock: 80, price: 35, description: 'FRESH NORMAL OLD ID GMAIL VERIFIED LONG TIME USE' },
  ],
  plans: [1, 2, 5, 10, 20],
};

const KEY = 'aslam-bhai-catalog-v1';
const LEGACY_KEY = 'ahmad-bhai-catalog-v1';

// Catalog API boundary. The current adapter uses localStorage for development;
// it can be replaced with Supabase without changing the storefront/admin UI.
export function readCatalog() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY));
    if (stored?.products?.length) return stored;
  } catch { /* Use defaults when storage is empty or invalid. */ }
  return DEFAULT_CATALOG;
}

export function saveCatalog(catalog) {
  localStorage.setItem(KEY, JSON.stringify(catalog));
  localStorage.removeItem(LEGACY_KEY);
  window.dispatchEvent(new Event('catalog-updated'));
}

export function addAadhaarStock(quantity) {
  const amount = Math.floor(Number(quantity));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Quantity must be a positive whole number.');
  }

  const catalog = readCatalog();
  const product = catalog.products.find(item => item.id === 'aadhaar');
  if (!product) throw new Error('Aadhaar product was not found.');

  const updatedCatalog = {
    ...catalog,
    products: catalog.products.map(item => item.id === 'aadhaar'
      ? { ...item, stock: Number(item.stock || 0) + amount }
      : item),
  };
  saveCatalog(updatedCatalog);
  return updatedCatalog;
}

export function useCatalog() {
  const [catalog, setCatalog] = React.useState(readCatalog);
  React.useEffect(() => {
    const refresh = () => setCatalog(readCatalog());
    window.addEventListener('catalog-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('catalog-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return catalog;
}

import React from 'react';
