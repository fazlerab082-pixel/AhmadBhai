import React from 'react';
import { supabase } from '../utils/supabase';

export const DEFAULT_CATALOG = {
  products: [
    { id: 'aadhaar', name: 'AADHAAR VERIFIED ID', stock: 0, price: 249, description: '11:30 BAJE AM TAK GUARANTEE' },
    { id: 'normal', name: 'NORMAL ID', stock: 80, price: 35, description: 'FRESH NORMAL OLD ID GMAIL VERIFIED LONG TIME USE' },
  ],
  plans: [1, 2, 5, 10, 20],
};

const KEY = 'aslam-bhai-catalog-v1';
const LEGACY_KEY = 'ahmad-bhai-catalog-v1';

// Product copy remains in localStorage. Shared inventory and account pricing
// are read from Supabase so the storefront and checkout use the same values.
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
    const applyStoreData = async (baseCatalog = readCatalog()) => {
      const [aadhaarResult, accountStoreResult] = await Promise.all([
        supabase.from('aadhaar_inventory').select('available_count').eq('product_key', 'aadhaar').maybeSingle(),
        supabase.from('account_store_settings').select('available_count, aadhaar_available_count, price_per_account, aadhaar_price_per_account').eq('id', true).maybeSingle(),
      ]);

      if (aadhaarResult.error) console.error('Could not load Aadhaar inventory from Supabase:', aadhaarResult.error.message);
      if (accountStoreResult.error) console.error('Could not load account store settings from Supabase:', accountStoreResult.error.message);
      if (!active) return;

      setCatalog({
        ...baseCatalog,
        products: baseCatalog.products.map(product => {
          if (product.id === 'aadhaar' && accountStoreResult.data) return { ...product, stock: accountStoreResult.data.aadhaar_available_count, price: Number(accountStoreResult.data.aadhaar_price_per_account) };
          if (product.id === 'aadhaar' && aadhaarResult.data) return { ...product, stock: aadhaarResult.data.available_count };
          if (product.id === 'normal' && accountStoreResult.data) {
            return {
              ...product,
              stock: accountStoreResult.data.available_count,
              price: Number(accountStoreResult.data.price_per_account),
            };
          }
          return product;
        }),
      });
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
