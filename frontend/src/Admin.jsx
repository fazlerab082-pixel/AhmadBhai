import React from 'react';
import { Navigate } from 'react-router-dom';
import { Boxes, LogOut, PackagePlus, Save, ShieldCheck, Store } from 'lucide-react';
import { readCatalog, saveCatalog, useCatalog } from './catalog.js';
import './admin.css';

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'change-me';

export default function Admin() {
  const [authenticated, setAuthenticated] = React.useState(sessionStorage.getItem('aslam-admin') === 'yes' || sessionStorage.getItem('ahmad-admin') === 'yes');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [catalog, setCatalog] = React.useState(readCatalog);
  const liveCatalog = useCatalog();
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => setCatalog(liveCatalog), [liveCatalog]);

  function login(event) {
    event.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('aslam-admin', 'yes');
      sessionStorage.removeItem('ahmad-admin');
      setAuthenticated(true);
      setError('');
    } else setError('Username ya password sahi nahi hai.');
  }

  function updateProduct(id, key, value) {
    setCatalog(current => ({ ...current, products: current.products.map(product => product.id === id ? { ...product, [key]: key === 'name' || key === 'description' ? value : Math.max(0, Number(value) || 0) } : product) }));
    setSaved(false);
  }

  function addProduct() {
    const id = `item-${Date.now()}`;
    setCatalog(current => ({ ...current, products: [...current.products, { id, name: 'NEW PRODUCT', stock: 0, price: 35, description: 'Product description' }] }));
  }

  function persist() {
    saveCatalog(catalog);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  }

  if (!authenticated) return <main className="admin-login-wrap"><form className="admin-login" onSubmit={login}>
    <div className="admin-login-icon"><ShieldCheck size={28} /></div><p className="admin-kicker">AHMAD BHAI STORE</p><h1>Admin login</h1><p className="admin-muted">Sign in to manage products and stock.</p>
    <label>Username<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /></label>
    <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="admin-primary">Open dashboard</button><a className="admin-back" href="/">← Back to store</a>
  </form></main>;

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span><Store /></span><b>AHMAD BHAI<small>STORE ADMIN</small></b></div><div className="admin-side-active"><Boxes size={18} /> Products</div><a className="admin-side-link" href="/">↗ View storefront</a><button className="admin-logout" onClick={() => { sessionStorage.removeItem('aslam-admin'); sessionStorage.removeItem('ahmad-admin'); setAuthenticated(false); }}> <LogOut size={16} /> Sign out</button></aside>
    <main className="admin-main"><header className="admin-header"><div><p className="admin-kicker">STORE MANAGEMENT</p><h1>Products</h1><p className="admin-muted">Manage what customers see in your storefront.</p></div><button className="admin-primary save-catalog" onClick={persist}><Save size={17} /> {saved ? 'Saved' : 'Save changes'}</button></header>
      <section className="admin-stats"><article><span>Catalog items</span><strong>{catalog.products.length}</strong></article><article><span>Total stock</span><strong>{catalog.products.reduce((n, p) => n + Number(p.stock), 0)}</strong></article><article><span>Store status</span><strong className="store-live">● Live</strong></article></section>
      <div className="admin-section-title"><div><h2>Product catalog</h2><p>Aadhaar available count is read from Supabase and updated from its Table Editor.</p></div><button className="admin-add" onClick={addProduct}><PackagePlus size={17} /> Add product</button></div>
      <section className="admin-products">{catalog.products.map((product, index) => <article className="admin-product" key={product.id}><div className="admin-product-top"><div className="admin-product-number">{String(index + 1).padStart(2, '0')}</div><div><h3>{product.name || 'Untitled product'}</h3><span className={product.stock > 0 ? 'stock-badge in-stock' : 'stock-badge out-stock'}>{product.stock > 0 ? 'In stock' : 'Out of stock'}</span></div></div><div className="admin-fields"><label>Product name<input value={product.name} onChange={e => updateProduct(product.id, 'name', e.target.value)} /></label><label>Price per ID (₹)<input type="number" min="0" value={product.price} onChange={e => updateProduct(product.id, 'price', e.target.value)} /></label><label>Stock quantity<input type="number" min="0" value={product.stock} disabled={product.id === 'aadhaar'} onChange={e => updateProduct(product.id, 'stock', e.target.value)} /></label><label className="field-wide">Description<input value={product.description} onChange={e => updateProduct(product.id, 'description', e.target.value)} /></label></div></article>)}</section>
      <p className="admin-footnote"><ShieldCheck size={15} /> Admin route is hidden from storefront navigation. Configure credentials with VITE_ADMIN_USER and VITE_ADMIN_PASSWORD.</p>
    </main></div>;
}
