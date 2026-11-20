import React from 'react';
import { Link } from 'react-router-dom';
import {
  Headset,
  Home,
  Search,
  ShoppingBag,
  Download,
  Rocket,
  ArrowRight,
  CircleAlert,
  IdCard,
  MessageCircle,
  Send,
  Instagram,
  Copy,
  Check,
} from 'lucide-react';
import { accountStoreRequest } from '../utils/accountStore.js';
import './find-id.css';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/HkdfnrdcGG37YXKA0lkvvN';

function savedOrder() {
  try {
    return JSON.parse(localStorage.getItem('aslam-last-order') || 'null');
  } catch {
    return null;
  }
}

export default function FindId() {
  const [orderId, setOrderId] = React.useState(() => savedOrder()?.id ?? '');
  const [accessCode, setAccessCode] = React.useState(() => savedOrder()?.accessCode ?? '');
  const [message, setMessage] = React.useState('Enter your order ID and access code to check your order.');
  const [accounts, setAccounts] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState('');

  async function fetchProduct(event) {
    event.preventDefault();
    setBusy(true);
    setAccounts([]);
    setMessage('Checking your order…');
    try {
      const result = await accountStoreRequest({ action: 'lookupOrder', orderId: orderId.trim(), accessCode: accessCode.trim() });
      setAccounts(result.accounts ?? []);
      setMessage(result.order.status === 'fulfilled'
        ? 'Payment confirmed. Your account credentials are ready below.'
        : 'Order received. Credentials will be available after the admin confirms your payment.');
    } catch (lookupError) {
      setMessage(lookupError.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyValue(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setMessage('Clipboard unavailable. Select the username and password to copy them.');
    }
  }

  return (
    <div className="find-page">
      <header className="find-header">
        <Link className="find-brand" to="/">
          <span className="find-logo"><IdCard size={25} /></span>
          <span><b>AHMAD BHAI</b><small>PREMIUM ID STORE</small></span>
        </Link>
        <nav className="find-nav">
          <Link to="/"><Home size={17} fill="currentColor" />Home</Link>
          <Link className="selected" to="/find-id"><Search size={17} />Find Product</Link>
          <a href="/#products"><ShoppingBag size={16} fill="currentColor" />Products</a>
          <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"><Headset size={17} />Support</a>
        </nav>
      </header>

      <main className="find-main">
        <div className="find-card" id="find-id">
          <div className="download-button"><Download size={15} strokeWidth={3} /> RETRIEVE YOUR ORDER</div>
          <form className="find-order-form" onSubmit={fetchProduct}>
            <label className="utr-label" htmlFor="order-id"><span>▤🔍</span> Enter Your Order ID</label>
            <input id="order-id" className="utr-input" value={orderId} onChange={event => setOrderId(event.target.value)} placeholder="Order ID" autoComplete="off" required />
            <label className="utr-label" htmlFor="access-code"><span>🔐</span> Enter Your Access Code</label>
            <input id="access-code" className="utr-input" value={accessCode} onChange={event => setAccessCode(event.target.value)} placeholder="64-character access code" autoComplete="off" required />
            <button className="fetch-button" type="submit" disabled={busy}><Rocket size={21} fill="white" /> {busy ? 'Checking…' : 'Fetch Product'} <ArrowRight size={23} strokeWidth={3} /></button>
          </form>
          <div className="find-message" role="status"><CircleAlert size={15} fill="white" />{message}</div>
          {accounts.length > 0 && <section className="find-results" aria-label="Purchased account credentials">
            <h2>Your account credentials</h2>
            {accounts.map((account, index) => <article className="find-credential" key={`${account.username}-${index}`}>
              <span className="credential-number">{index + 1}</span>
              <div><small>USERNAME</small><code>{account.username}</code></div>
              <div><small>PASSWORD</small><code>{account.password}</code></div>
              <button type="button" aria-label="Copy username and password" onClick={() => copyValue(String(index), `${account.username}\t${account.password}`)}>{copied === String(index) ? <Check size={16} /> : <Copy size={16} />}</button>
            </article>)}
          </section>}
        </div>
      </main>

      <footer className="find-footer">
        <div className="find-footer-brand"><span className="find-logo"><IdCard size={23} /></span><span><b>AHMAD BHAI OFFICIAL</b><small>Premium ID Provider</small></span></div>
        <div className="find-socials"><a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a><a href="#support" aria-label="Telegram"><Send /></a><a href="#support" aria-label="Instagram"><Instagram /></a></div>
        <p>© 2026 AHMAD BHAI OFFICIAL<br /><small>All Rights Reserved.</small></p>
      </footer>
      <a className="find-chat" href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp support"><MessageCircle size={27} /></a>
    </div>
  );
}
