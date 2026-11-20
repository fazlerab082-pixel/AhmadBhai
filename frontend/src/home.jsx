import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Mail, MessageCircle, ShieldCheck, Zap, Headphones, ClipboardCheck, Check, ChartNoAxesCombined, Clock3, UsersRound, Instagram, Send, ExternalLink, Sparkles, X, ArrowLeft, CircleCheck } from 'lucide-react';
import paymentQr from './payment-qr.png';
import './styles.css';
import { useCatalog } from './catalog.js';
import { accountStoreRequest } from '../utils/accountStore.js';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/HkdfnrdcGG37YXKA0lkvvN';

function Brand({ footer = false }) {
  return footer ? <div className="footer-brand"><span className="footer-spark"><Sparkles size={20} fill="white" /></span><span><b>AHMAD BHAI OFFICIAL</b><small>PREMIUM ID PROVIDER</small></span></div> : <div className="brand"><div className="brand-mark"><span>AB</span></div><div className="brand-word"><b><i>AHMAD</i><em>_BHAI</em></b><small>PREMIUM STORE</small></div></div>;
}

function Perks() {
  return <div className="perks"><div><span className="perk-icon secure"><ShieldCheck /></span><small>100% Secure</small></div><div><span className="perk-icon instant"><Zap /></span><small>Instant</small></div><div><span className="perk-icon support"><Headphones /></span><small>24/7 Support</small></div></div>;
}

function StockCard({ product }) {
  const available = product.stock > 0;
  return <article className="product-card empty-card">
    <div className="stock-pill"><Zap size={12} fill="currentColor" /> LIMITED STOCK</div>
    <h2 className="product-title"><span>🔥</span> {product.name} <span className="verified">✓</span><span className="stock-zero">: {product.stock}</span></h2>
    <div className="empty-state"><span className="empty-x">{available ? <Zap size={34} /> : <X size={34} strokeWidth={4} />}</span><h3>{available ? 'Available Now' : 'Out of Stock'}</h3><p>{available ? `₹${product.price} per ID` : "We'll be back with more IDs soon!"}</p></div>
    <Perks />
  </article>;
}

function BuyCard({ onBuy, product, plans }) {
  const [selected, setSelected] = React.useState(1);
  const [custom, setCustom] = React.useState('');
  const [customActive, setCustomActive] = React.useState(false);
  const quantity = customActive ? Math.max(0, Number(custom) || 0) : (plans.find(count => count === selected) ?? 1);
  const total = quantity * product.price;
  const canBuy = quantity >= 1 && quantity <= product.stock;
  return <article className="product-card buy-card">
    <div className="stock-pill"><Zap size={12} fill="currentColor" /> LIMITED STOCK</div>
    <h2 className="product-title"><span>🔥</span> {product.name} <span className="verified">✓</span></h2>
    <div className="product-subtitle">{product.description} <span>✓</span></div>
    <div className="stock-line"><span>STOCK AVAILABLE</span><b>{product.stock} LEFT</b></div><div className="progress"><span style={{ width: `${Math.min(100, product.stock)}%` }} /></div>
    <div className="choose-label">SELECT A PACKAGE</div>
    <div className="plans">{plans.map(count => <button key={count} disabled={count > product.stock} className={`plan ${selected === count && !customActive ? 'active' : ''}`} onClick={() => { setSelected(count); setCustomActive(false); }}><strong>{count} ID{count > 1 ? 's' : ''}</strong><small>₹{count * product.price}</small></button>)}
      <button className={`plan custom-plan ${customActive ? 'active' : ''}`} onClick={() => { setCustomActive(true); }}><strong>{customActive ? <input aria-label="Custom ID quantity" type="number" min="1" max={product.stock} autoFocus value={custom} onChange={e => setCustom(e.target.value)} onClick={e => e.stopPropagation()} placeholder="Qty" /> : 'Custom'}</strong><small>Enter Qty</small></button>
    </div>
    <div className="total"><small>TOTAL</small><strong><span>₹</span>{total.toFixed(2)}</strong></div>
    {!canBuy && product.stock > 0 && <p className="stock-warning">Select a quantity within available stock.</p>}
    <button className="buy-button" disabled={!canBuy} onClick={() => onBuy(total, quantity)}><Zap size={15} fill="currentColor" /> Buy Now -₹{total.toFixed(2)}</button>
    <Perks />
  </article>;
}

const instructions = ['Do not change the ID password through software', 'Do not sync the ID through software', 'Avoid changing multiple IDs from same IP', 'If pending, contact us on support'];
const metrics = [{ icon: ChartNoAxesCombined, value: '100%', label: 'Success Rate', color: 'mint' }, { icon: Clock3, value: '24/7', label: 'Support', color: 'blue' }, { icon: UsersRound, value: '1000+', label: 'Happy Customers', color: 'pink' }];

function makeAccessCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function PaymentModal({ amount, quantity, onClose }) {
  const [secondsLeft, setSecondsLeft] = React.useState(10 * 60);
  const [utr, setUtr] = React.useState('');
  const [order, setOrder] = React.useState(null);
  const [accessCode] = React.useState(makeAccessCode);
  const [copied, setCopied] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  async function submitOrder(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await accountStoreRequest({ action: 'submitOrder', amount, quantity, utr, accessCode });
      const savedOrder = { ...result.order, accessCode };
      localStorage.setItem('aslam-last-order', JSON.stringify(savedOrder));
      setOrder(result.order);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }
  async function copyOrderValue(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Select and copy the order details manually.');
    }
  }
  return <div className="payment-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div className="payment-inner">
        <div className="payment-heading"><button className="payment-back" onClick={onClose} aria-label="Go back"><ArrowLeft size={21} /></button><h2 id="payment-title">AHMAD BHAI PAY</h2><span /></div>
        <div className="payment-summary"><strong>AHMAD BHAI Pay · {quantity} account{quantity > 1 ? 's' : ''}</strong><b>Pay ₹{amount.toFixed(2)}</b></div>
        <div className="payment-method"><div className="payment-method-info"><strong>Scan with any UPI app</strong><div className="upi-brands"><b className="paytm">paytm</b><span className="gpay">▶</span><span className="phonepe">●</span><span className="bhim">●</span></div><small>&amp; more</small></div><img className="qr-placeholder" src={paymentQr} alt="UPI payment QR code" /></div>
        {!order ? <form className="payment-order-form" onSubmit={submitOrder}>
          <p>After paying ₹{amount.toFixed(2)}, enter the UTR/RRN shown in your UPI app.</p>
          <label htmlFor="payment-utr">UPI UTR/RRN</label>
          <input id="payment-utr" value={utr} onChange={event => setUtr(event.target.value)} maxLength={40} autoComplete="off" required placeholder="Enter payment reference" />
          {error && <p className="payment-error" role="alert">{error}</p>}
          <button className="payment-submit" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'I have paid · Submit order'}</button>
        </form> : <div className="payment-order-success">
          <div className="payment-waiting">Order submitted · payment review pending</div>
          <p>Keep these details. Your credentials will appear after the admin confirms the payment.</p>
          <label>Order ID</label><div className="payment-code"><code>{order.id}</code><button type="button" onClick={() => copyOrderValue('order', order.id)}>{copied === 'order' ? 'Copied' : 'Copy'}</button></div>
          <label>Access code</label><div className="payment-code"><code>{accessCode}</code><button type="button" onClick={() => copyOrderValue('code', accessCode)}>{copied === 'code' ? 'Copied' : 'Copy'}</button></div>
          <Link className="payment-find-link" to="/find-id" onClick={onClose}>Find my order <ArrowLeft size={14} /></Link>
        </div>}
        <div className="payment-secure"><CircleCheck size={12} fill="#19ba83" color="#19ba83" /><span>100% Secure Payments Powered by</span><b>AHMAD BHAI</b></div>
        {!order && <div className="payment-timeout"><Clock3 size={12} /><span>This page will timeout in <b>{String(minutes).padStart(2,'0')} min : {String(seconds).padStart(2,'0')} sec</b></span></div>}
      </div>
    </section>
  </div>;
}

export default function HomePage() {
  const [checkout, setCheckout] = React.useState(null);
  const catalog = useCatalog();
  const aadhaar = catalog.products.find(product => product.id === 'aadhaar') || catalog.products[0];
  const normal = catalog.products.find(product => product.id === 'normal') || catalog.products[1] || catalog.products[0];
  return <div className="app-shell">
    <header className="topbar"><Brand /><nav className="nav-links"><a className="nav-btn home" href="#home"><Home />Home</a><Link className="nav-btn find-id" to="/find-id"><Search />Find ID</Link><a className="nav-btn find-mail" href="#products"><Mail />Find Mail</a><a className="nav-btn support-nav" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"><MessageCircle />Support</a><a className="nav-btn contact" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"><Mail />Contact</a></nav></header>
    <main id="home" className="main-area"><div className="content-grid">
      <section className="products-area" id="products"><div className="products-row">{aadhaar && <StockCard product={aadhaar} />}{normal && <BuyCard product={normal} plans={catalog.plans} onBuy={(amount, quantity) => setCheckout({ amount, quantity })} />}</div><a className="whatsapp-link" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} /><span>Join WhatsApp Group</span><ExternalLink size={13} /></a></section>
      <aside className="info-area"><section className="instructions panel"><h2><span className="clipboard"><ClipboardCheck size={21} /></span><span>Important<br />Instructions</span></h2><ul>{instructions.map(text => <li key={text}><span className="check"><Check size={16} strokeWidth={3.5} /></span><b>{text}</b></li>)}</ul></section>
        <section className="why"><h2>Why Choose Our <span>IDs?</span></h2><div className="metrics">{metrics.map(({ icon: Icon, value, label, color }) => <article className="metric-card" key={label}><div className={`metric-icon ${color}`}><Icon /></div><strong>{value}</strong><small>{label}</small></article>)}</div></section>
      </aside>
    </div></main>
    <footer className="footer"><Brand footer /><div className="socials"><a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a><a href="#support" aria-label="Telegram"><Send /></a><a href="#support" aria-label="Instagram"><Instagram /></a></div><p>Copyright © 2026 AHMAD BHAI OFFICIAL<br />All Rights Reserved</p></footer>
    <a className="chat-float" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with support"><MessageCircle size={23} fill="white" /></a>
    {checkout !== null && <PaymentModal amount={checkout.amount} quantity={checkout.quantity} onClose={() => setCheckout(null)} />}
  </div>;
}
