import React from 'react';
import { supabase } from '../utils/supabase';

export const DEFAULT_CATALOG = {
  products: [
    { id: 'aadhaar', name: 'AADHAAR VERIFIED ID', stock: 0, price: 249, description: '11:30 BAJE AM TAK GUARANTEE' },
    { id: 'normal', name: 'NORMAL ID', stock: 0, price: 35, description: 'FRESH NORMAL OLD ID GMAIL VERIFIED LONG TIME USE' },
  ],
  plans: [1, 2, 5, 10, 20],
};

const KEY = 'aslam-bhai-catalog-v1';
const LEGACY_KEY = 'ahmad-bhai-catalog-v1';

// Product copy remains in localStorage; stock and configured prices for the
// Normal/Aadhaar products come only from Supabase.
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
  const [catalog, setCatalog] = React.useState(() => withSupabaseStock(readCatalog()));
  React.useEffect(() => {
    let active = true;
    const applyStoreData = async (baseCatalog = readCatalog()) => {
      const { data, error } = await supabase
        .from('account_store_settings')
        .select('available_count, aadhaar_available_count, price_per_account, aadhaar_price_per_account')
        .eq('id', true)
        .maybeSingle();

      if (error) console.error('Could not load account inventory counts from Supabase:', error.message);
      if (!active) return;

      setCatalog(withSupabaseStock(baseCatalog, data));
    };
    const refresh = () => { void applyStoreData(readCatalog()); };
    void applyStoreData();
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

function withSupabaseStock(catalog, settings = null) {
  return {
    ...catalog,
    products: catalog.products.map(product => {
      if (product.id === 'aadhaar') return {
        ...product,
        stock: Number(settings?.aadhaar_available_count ?? 0),
        ...(settings && { price: Number(settings.aadhaar_price_per_account) }),
      };
      if (product.id === 'normal') return {
        ...product,
        stock: Number(settings?.available_count ?? 0),
        ...(settings && { price: Number(settings.price_per_account) }),
      };
      return product;
    }),
  };
}
