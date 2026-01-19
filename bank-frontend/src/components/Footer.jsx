import React from "react";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer-wrap">
      <div className="footer-container">
        © {new Date().getFullYear()} <b>Digibank</b> · DBK
        <span className="dot">•</span>
        <span className="footer-email">thanakrit7578@gmail.com</span>
      </div>
    </footer>
  );
}
