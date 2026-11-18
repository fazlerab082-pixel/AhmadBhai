import React from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import "./find-id.css";

export default function FindId() {
  const [utr, setUtr] = React.useState("");
  const [message, setMessage] = React.useState(
    "Please complete UTR verification first.",
  );

  function fetchProduct(event) {
    event.preventDefault();
    setMessage(
      utr.trim()
        ? "UTR verification is not connected yet."
        : "Please enter your Bank UTR/RRN number first.",
    );
  }

  return (
    <div className="find-page">
      <header className="find-header">
        <Link className="find-brand" to="/">
          <span className="find-logo">
            <IdCard size={25} />
          </span>
          <span>
            <b>AHMAD BHAI</b>
            <small>PREMIUM ID STORE</small>
          </span>
        </Link>
        <nav className="find-nav">
          <Link to="/">
            <Home size={17} fill="currentColor" />
            Home
          </Link>
          <Link className="selected" to="/find-id">
            <Search size={17} />
            Find Product
          </Link>
          <a href="/#products">
            <ShoppingBag size={16} fill="currentColor" />
            Products
          </a>
          <a href="/#support">
            <Headset size={17} />
            Support
          </a>
        </nav>
      </header>
      <main className="find-main">
        <form className="find-card" onSubmit={fetchProduct}>
          <a className="download-button" href="#find-id">
            <Download size={15} strokeWidth={3} /> DOWNLOAD YOUR PRODUCT
          </a>
          <label className="utr-label" htmlFor="utr-input">
            <span>▤🔍</span> Enter Your Bank UTR/RRN Number
          </label>
          <input
            id="utr-input"
            className="utr-input"
            value={utr}
            onChange={(event) => setUtr(event.target.value)}
            placeholder="Enter UTR/RRN Number Here..."
          />
          <button className="fetch-button" type="submit">
            <Rocket size={21} fill="white" /> Fetch Product{" "}
            <ArrowRight size={23} strokeWidth={3} />
          </button>
          <div className="find-message" role="status">
            <CircleAlert size={15} fill="white" />
            {message}
          </div>
        </form>
      </main>
      <footer className="find-footer">
        <div className="find-footer-brand">
          <span className="find-logo">
            <IdCard size={23} />
          </span>
          <span>
            <b>AHMAD BHAI OFFICIAL</b>
            <small>Premium ID Provider</small>
          </span>
        </div>
        <div className="find-socials">
          <a href="#support" aria-label="WhatsApp">
            <MessageCircle />
          </a>
          <a href="#support" aria-label="Telegram">
            <Send />
          </a>
          <a href="#support" aria-label="Instagram">
            <Instagram />
          </a>
        </div>
        <p>
          © 2026 AHMAD BHAI OFFICIAL
          <br />
          <small>All Rights Reserved.</small>
        </p>
      </footer>
      <a className="find-chat" href="#support" aria-label="WhatsApp support">
        <MessageCircle size={27} />
      </a>
    </div>
  );
}
