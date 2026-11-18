import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Mail, MessageCircle, ShieldCheck, Zap, Headphones, ClipboardCheck, Check, ChartNoAxesCombined, Clock3, UsersRound, Instagram, Send, ExternalLink, Sparkles, X, ArrowLeft, CircleCheck } from 'lucide-react';
import paymentQr from './payment-qr.png';
import './styles.css';
import { useCatalog } from './catalog.js';

const plans = [
  { count: 1, price: 35 }, { count: 2, price: 70 }, { count: 5, price: 175 },
  { count: 10, price: 350 }, { count: 20, price: 700 },
];

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
  const total = customActive ? Math.max(0, Number(custom) || 0) * product.price : (plans.find(count => count === selected) ?? 1) * product.price;
  return <article className="product-card buy-card">
    <div className="stock-pill"><Zap size={12} fill="currentColor" /> LIMITED STOCK</div>
    <h2 className="product-title"><span>🔥</span> {product.name} <span className="verified">✓</span></h2>
    <div className="product-subtitle">{product.description} <span>✓</span></div>
    <div className="stock-line"><span>STOCK AVAILABLE</span><b>{product.stock} LEFT</b></div><div className="progress"><span style={{ width: `${Math.min(100, product.stock)}%` }} /></div>
    <div className="choose-label">SELECT A PACKAGE</div>
    <div className="plans">{plans.map(count => <button key={count} className={`plan ${selected === count && !customActive ? 'active' : ''}`} onClick={() => { setSelected(count); setCustomActive(false); }}><strong>{count} ID{count > 1 ? 's' : ''}</strong><small>₹{count * product.price}</small></button>)}
      <button className={`plan custom-plan ${customActive ? 'active' : ''}`} onClick={() => { setCustomActive(true); }}><strong>{customActive ? <input aria-label="Custom ID quantity" type="number" min="1" autoFocus value={custom} onChange={e => setCustom(e.target.value)} onClick={e => e.stopPropagation()} placeholder="Qty" /> : 'Custom'}</strong><small>{customActive ? 'Enter Qty' : 'Enter Qty'}</small></button>
    </div>
    <div className="total"><small>TOTAL</small><strong><span>₹</span>{total.toFixed(2)}</strong></div>
    <button className="buy-button" onClick={() => onBuy(total)}><Zap size={15} fill="currentColor" /> Buy Now -₹{total.toFixed(2)}</button>
    <Perks />
  </article>;
}

const instructions = ['Do not change the ID password through software', 'Do not sync the ID through software', 'Avoid changing multiple IDs from same IP', 'If pending, contact us on support'];
const metrics = [{ icon: ChartNoAxesCombined, value: '100%', label: 'Success Rate', color: 'mint' }, { icon: Clock3, value: '24/7', label: 'Support', color: 'blue' }, { icon: UsersRound, value: '1000+', label: 'Happy Customers', color: 'pink' }];

function PaymentModal({ amount, onClose }) {
  const [secondsLeft, setSecondsLeft] = React.useState(10 * 60);
  React.useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return <div className="payment-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div className="payment-inner">
        <div className="payment-heading"><button className="payment-back" onClick={onClose} aria-label="Go back"><ArrowLeft size={21} /></button><h2 id="payment-title">AHMAD BHAI PAY</h2><span /></div>
        <div className="payment-summary"><strong>AHMAD BHAI Pay</strong><b>Pay ₹{amount.toFixed(2)}</b></div>
        <div className="payment-method"><div className="payment-method-info"><strong>Scan with any UPI app</strong><div className="upi-brands"><b className="paytm">paytm</b><span className="gpay">▶</span><span className="phonepe">●</span><span className="bhim">●</span></div><small>&amp; more</small></div><img className="qr-placeholder" src={paymentQr} alt="UPI payment QR code" /></div>
        <div className="payment-waiting">Waiting for payment...</div>
        <div className="payment-secure"><CircleCheck size={12} fill="#19ba83" color="#19ba83" /><span>100% Secure Payments Powered by</span><b>AHMAD BHAI</b></div>
        <div className="payment-timeout"><Clock3 size={12} /><span>This page will timeout in <b>{String(minutes).padStart(2,'0')} min : {String(seconds).padStart(2,'0')} sec</b></span></div>
      </div>
    </section>
  </div>;
}

export default function HomePage() {
  const [paymentAmount, setPaymentAmount] = React.useState(null);
  const catalog = useCatalog();
  const aadhaar = catalog.products.find(product => product.id === 'aadhaar') || catalog.products[0];
  const normal = catalog.products.find(product => product.id === 'normal') || catalog.products[1] || catalog.products[0];
  return <div className="app-shell">
    <header className="topbar"><Brand /><nav className="nav-links"><a className="nav-btn home" href="#home"><Home />Home</a><Link className="nav-btn find-id" to="/find-id"><Search />Find ID</Link><a className="nav-btn find-mail" href="#products"><Mail />Find Mail</a><a className="nav-btn support-nav" href="#support"><MessageCircle />Support</a><a className="nav-btn contact" href="#support"><Mail />Contact</a></nav></header>
    <main id="home" className="main-area"><div className="content-grid">
      <section className="products-area" id="products"><div className="products-row">{aadhaar && <StockCard product={aadhaar} />}{normal && <BuyCard product={normal} plans={catalog.plans} onBuy={setPaymentAmount} />}</div><a className="whatsapp-link" href="#support"><MessageCircle size={20} /><span>Join WhatsApp Group</span><ExternalLink size={13} /></a></section>
      <aside className="info-area"><section className="instructions panel"><h2><span className="clipboard"><ClipboardCheck size={21} /></span><span>Important<br />Instructions</span></h2><ul>{instructions.map(text => <li key={text}><span className="check"><Check size={16} strokeWidth={3.5} /></span><b>{text}</b></li>)}</ul></section>
        <section className="why"><h2>Why Choose Our <span>IDs?</span></h2><div className="metrics">{metrics.map(({ icon: Icon, value, label, color }) => <article className="metric-card" key={label}><div className={`metric-icon ${color}`}><Icon /></div><strong>{value}</strong><small>{label}</small></article>)}</div></section>
      </aside>
    </div></main>
    <footer className="footer"><Brand footer /><div className="socials"><a href="#support" aria-label="WhatsApp"><MessageCircle /></a><a href="#support" aria-label="Telegram"><Send /></a><a href="#support" aria-label="Instagram"><Instagram /></a></div><p>Copyright © 2026 AHMAD BHAI OFFICIAL<br />All Rights Reserved</p></footer>
    <a className="chat-float" href="#support" aria-label="Chat with support"><MessageCircle size={23} fill="white" /></a>
    {paymentAmount !== null && <PaymentModal amount={paymentAmount} onClose={() => setPaymentAmount(null)} />}
  </div>;
}
