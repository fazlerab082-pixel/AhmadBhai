import React from 'react';
import { Boxes, Check, ClipboardList, KeyRound, LogOut, PackagePlus, Save, ShieldCheck, Store, Trash2 } from 'lucide-react';
import { readCatalog, saveCatalog, useCatalog } from './catalog.js';
import { accountStoreRequest } from '../utils/accountStore.js';
import { supabase } from '../utils/supabase';
import './admin.css';
import './admin-accounts.css';

function isStoreAdmin(user) {
  return user?.app_metadata?.store_admin === true;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function Admin() {
  const [authenticated, setAuthenticated] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [catalog, setCatalog] = React.useState(readCatalog);
  const liveCatalog = useCatalog();
  const [saved, setSaved] = React.useState(false);
  const [section, setSection] = React.useState('products');
  const [accounts, setAccounts] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [accountUsername, setAccountUsername] = React.useState('');
  const [accountPassword, setAccountPassword] = React.useState('');
  const [accountAadhaarVerified, setAccountAadhaarVerified] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState('');

  React.useEffect(() => setCatalog(liveCatalog), [liveCatalog]);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setAuthenticated(isStoreAdmin(session?.user));
      setAuthLoading(false);
    }).catch(() => {
      if (active) setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthenticated(isStoreAdmin(session?.user));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadAccounts() {
    const data = await accountStoreRequest({ action: 'listAccounts' });
    setAccounts(data.accounts ?? []);
  }

  async function loadOrders() {
    const data = await accountStoreRequest({ action: 'listOrders' });
    setOrders(data.orders ?? []);
  }

  React.useEffect(() => {
    if (!authenticated) return;
    Promise.all([loadAccounts(), loadOrders()]).catch((loadError) => setError(loadError.message));
  }, [authenticated]);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password,
      });
      if (loginError || !isStoreAdmin(data?.user)) {
        if (!loginError && data?.user) await supabase.auth.signOut();
        setError(loginError?.message || 'This Supabase Auth user does not have admin access.');
        return;
      }
      setAuthenticated(true);
      setPassword('');
    } catch (loginError) {
      setError(loginError.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setSection('products');
  }

  function updateProduct(id, key, value) {
    setCatalog(current => ({
      ...current,
      products: current.products.map(product => product.id === id
        ? { ...product, [key]: key === 'name' || key === 'description' ? value : Math.max(0, Number(value) || 0) }
        : product),
    }));
    setSaved(false);
  }

  function addProduct() {
    const id = `item-${Date.now()}`;
    setCatalog(current => ({
      ...current,
      products: [...current.products, { id, name: 'NEW PRODUCT', stock: 0, price: 35, description: 'Product description' }],
    }));
    setSaved(false);
  }

  async function persist() {
    setBusy(true);
    setError('');
    try {
      for (const product of catalog.products.filter(item => item.id === 'normal' || item.id === 'aadhaar')) {
        await accountStoreRequest({ action: 'setPrice', accountType: product.id, price: product.price });
      }
      saveCatalog(catalog);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
      setNotice('Product settings saved.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function addAccount(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await accountStoreRequest({ action: 'addAccount', username: accountUsername, password: accountPassword, aadhaarVerified: accountAadhaarVerified });
      setAccountUsername('');
      setAccountPassword('');
      setAccountAadhaarVerified(false);
      await loadAccounts();
      window.dispatchEvent(new Event('catalog-updated'));
      setNotice('Account added to available inventory.');
    } catch (addError) {
      setError(addError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(account) {
    if (!window.confirm(`Remove ${account.username} from available inventory?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await accountStoreRequest({ action: 'deleteAccount', id: account.id });
      await loadAccounts();
      window.dispatchEvent(new Event('catalog-updated'));
      setNotice('Account removed from available inventory.');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy(false);
    }
  }

  async function approveOrder(order) {
    const message = `Confirm the payment for UTR/RRN ${order.utr} (₹${Number(order.amount).toFixed(2)}) in your UPI records before releasing ${order.quantity} account(s).`;
    if (!window.confirm(message)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await accountStoreRequest({ action: 'approveOrder', orderId: order.id });
      await Promise.all([loadAccounts(), loadOrders()]);
      window.dispatchEvent(new Event('catalog-updated'));
      setNotice('Payment approved and account credentials released to the order.');
    } catch (approveError) {
      setError(approveError.message);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <main className="admin-login-wrap"><p className="admin-muted">Checking admin session…</p></main>;

  if (!authenticated) return <main className="admin-login-wrap"><form className="admin-login" onSubmit={login}>
    <div className="admin-login-icon"><ShieldCheck size={28} /></div><p className="admin-kicker">AHMAD BHAI STORE</p><h1>Admin login</h1><p className="admin-muted">Sign in with your authorized Supabase admin account.</p>
    <label>Email<input type="email" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /></label>
    <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="admin-primary" disabled={busy}>Open dashboard</button><a className="admin-back" href="/">← Back to store</a>
  </form></main>;

  const pendingOrders = orders.filter(order => order.status === 'pending_review');
  const availableAccounts = accounts.filter(account => account.status === 'available').length;
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span><Store /></span><b>AHMAD BHAI<small>STORE ADMIN</small></b></div>
      <button className={`admin-side-button ${section === 'products' ? 'selected' : ''}`} onClick={() => setSection('products')}><Boxes size={18} /> Products</button>
      <button className={`admin-side-button ${section === 'accounts' ? 'selected' : ''}`} onClick={() => setSection('accounts')}><KeyRound size={17} /> Account inventory</button>
      <button className={`admin-side-button ${section === 'orders' ? 'selected' : ''}`} onClick={() => setSection('orders')}><ClipboardList size={17} /> Orders {pendingOrders.length > 0 && <span className="admin-nav-count">{pendingOrders.length}</span>}</button>
      <a className="admin-side-link" href="/">↗ View storefront</a>
      <button className="admin-logout" onClick={signOut}><LogOut size={16} /> Sign out</button>
    </aside>

    <main className="admin-main">
      <header className="admin-header"><div><p className="admin-kicker">STORE MANAGEMENT</p><h1>{section === 'products' ? 'Products' : section === 'accounts' ? 'Account inventory' : 'Orders'}</h1><p className="admin-muted">{section === 'products' ? 'Manage storefront products and account pricing.' : section === 'accounts' ? 'Add the accounts available for customers to buy.' : 'Review UTR/RRN payments and release fulfilled orders.'}</p></div>
        {section === 'products' && <button className="admin-primary save-catalog" onClick={persist} disabled={busy}><Save size={17} /> {saved ? 'Saved' : 'Save changes'}</button>}
      </header>

      <section className="admin-stats"><article><span>Catalog items</span><strong>{catalog.products.length}</strong></article><article><span>Available accounts</span><strong>{availableAccounts}</strong></article><article><span>Pending payments</span><strong>{pendingOrders.length}</strong></article></section>

      {error && <p className="admin-banner error" role="alert">{error}</p>}
      {notice && <p className="admin-banner success" role="status"><Check size={16} /> {notice}</p>}

      {section === 'products' && <>
        <div className="admin-section-title"><div><h2>Product catalog</h2><p>Normal and Aadhaar ID prices and stock are shared through Supabase.</p></div><button className="admin-add" onClick={addProduct}><PackagePlus size={17} /> Add product</button></div>
        <section className="admin-products">{catalog.products.map((product, index) => <article className="admin-product" key={product.id}><div className="admin-product-top"><div className="admin-product-number">{String(index + 1).padStart(2, '0')}</div><div><h3>{product.name || 'Untitled product'}</h3><span className={product.stock > 0 ? 'stock-badge in-stock' : 'stock-badge out-stock'}>{product.stock > 0 ? 'In stock' : 'Out of stock'}</span></div></div><div className="admin-fields"><label>Product name<input value={product.name} onChange={e => updateProduct(product.id, 'name', e.target.value)} /></label><label>Price per ID (₹)<input type="number" min="0" step="0.01" value={product.price} disabled={product.id !== 'normal' && product.id !== 'aadhaar'} onChange={e => updateProduct(product.id, 'price', e.target.value)} /></label><label>Stock quantity<input type="number" min="0" value={product.stock} disabled={product.id === 'aadhaar' || product.id === 'normal'} onChange={e => updateProduct(product.id, 'stock', e.target.value)} /></label><label className="field-wide">Description<input value={product.description} onChange={e => updateProduct(product.id, 'description', e.target.value)} /></label></div></article>)}</section>
        <p className="admin-footnote"><ShieldCheck size={15} /> Product settings save locally in this browser; account price and stock are shared in Supabase.</p>
      </>}

      {section === 'accounts' && <>
        <section className="admin-account-panel"><div className="admin-section-title"><div><h2>Add an account</h2><p>The password is encrypted before it is saved.</p></div></div>
          <form className="admin-account-form" onSubmit={addAccount}><label>Username<input value={accountUsername} onChange={e => setAccountUsername(e.target.value)} maxLength={160} autoComplete="off" required /></label><label>Password<input type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} maxLength={1024} autoComplete="new-password" required /></label><label className="aadhaar-verified-toggle"><input type="checkbox" checked={accountAadhaarVerified} onChange={e => setAccountAadhaarVerified(e.target.checked)} /> Aadhaar verified</label><button className="admin-primary" disabled={busy}><KeyRound size={16} /> Add account</button></form>
        </section>
        <div className="admin-section-title admin-table-heading"><div><h2>Inventory ({accounts.length})</h2><p>Sold accounts stay in order history and cannot be removed here.</p></div><button className="admin-add" onClick={() => loadAccounts().catch(loadError => setError(loadError.message))} disabled={busy}>Refresh</button></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Username</th><th>Type</th><th>Status</th><th>Added</th><th></th></tr></thead><tbody>{accounts.map(account => <tr key={account.id}><td>{account.username}</td><td><span className={`stock-badge ${account.aadhaar_verified ? 'pending-badge' : 'in-stock'}`}>{account.aadhaar_verified ? 'Aadhaar verified' : 'Normal'}</span></td><td><span className={`stock-badge ${account.status === 'available' ? 'in-stock' : 'out-stock'}`}>{account.status}</span></td><td>{formatDate(account.created_at)}</td><td>{account.status === 'available' && <button className="admin-icon-button" aria-label={`Remove ${account.username}`} onClick={() => deleteAccount(account)} disabled={busy}><Trash2 size={16} /></button>}</td></tr>)}{accounts.length === 0 && <tr><td colSpan="5" className="admin-empty">No accounts in inventory yet.</td></tr>}</tbody></table></div>
      </>}

      {section === 'orders' && <>
        <div className="admin-section-title"><div><h2>Submitted orders</h2><p>Verify payment in your UPI records before releasing credentials.</p></div><button className="admin-add" onClick={() => loadOrders().catch(loadError => setError(loadError.message))} disabled={busy}>Refresh</button></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>UTR/RRN</th><th>Order</th><th>Type</th><th>Qty</th><th>Amount</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td className="admin-utr">{order.utr}</td><td className="admin-order-id">{order.id}</td><td>{order.account_type === 'aadhaar' ? 'Aadhaar verified' : 'Normal'}</td><td>{order.quantity}</td><td>₹{Number(order.amount).toFixed(2)}</td><td><span className={`stock-badge ${order.status === 'fulfilled' ? 'in-stock' : 'pending-badge'}`}>{order.status === 'fulfilled' ? 'Fulfilled' : 'Pending review'}</span></td><td>{formatDate(order.created_at)}</td><td>{order.status === 'pending_review' && <button className="admin-approve" onClick={() => approveOrder(order)} disabled={busy}>Verify payment &amp; release</button>}</td></tr>)}{orders.length === 0 && <tr><td colSpan="8" className="admin-empty">No orders submitted yet.</td></tr>}</tbody></table></div>
      </>}

      <p className="admin-footnote"><ShieldCheck size={15} /> Admin access is checked by Supabase Auth app metadata and the account-store Edge Function.</p>
    </main>
  </div>;
}
