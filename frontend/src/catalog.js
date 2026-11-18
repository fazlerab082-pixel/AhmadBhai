import React from 'react';
import { supabase } from '../utils/supabase';

export const DEFAULT_CATALOG = {
  products: [
    { id: 'aadhaar', name: 'AADHAAR VERIFIED ID', stock: 0, price: 35, description: 'Aadhaar verified IDs' },
    { id: 'normal', name: 'NORMAL ID', stock: 80, price: 35, description: 'FRESH NORMAL OLD ID GMAIL VERIFIED LONG TIME USE' },
  ],
  plans: [1, 2, 5, 10, 20],
};

const KEY = 'aslam-bhai-catalog-v1';
const LEGACY_KEY = 'ahmad-bhai-catalog-v1';

// Product details remain in localStorage; Aadhaar available quantity is read
// from Supabase so every storefront visitor sees the shared count.
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

export function useCatalog() {
  const [catalog, setCatalog] = React.useState(readCatalog);
  React.useEffect(() => {
    let active = true;
    const applyAadhaarCount = async (baseCatalog = readCatalog()) => {
      const { data, error } = await supabase
        .from('aadhaar_inventory')
        .select('available_count')
        .eq('product_key', 'aadhaar')
        .maybeSingle();

      if (error) {
        console.error('Could not load Aadhaar inventory from Supabase:', error.message);
        if (active) setCatalog(baseCatalog);
        return;
      }

      if (!active) return;
      if (data) {
        setCatalog({
          ...baseCatalog,
          products: baseCatalog.products.map(product => product.id === 'aadhaar'
            ? { ...product, stock: data.available_count }
            : product),
        });
      } else {
        setCatalog(baseCatalog);
      }
    };
    const refresh = () => { void applyAadhaarCount(readCatalog()); };
    void applyAadhaarCount();
    window.addEventListener('catalog-updated', refresh);
    window.addEventListener('storage', refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('catalog-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return catalog;
}
