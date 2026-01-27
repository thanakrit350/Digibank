import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import { useTranslation } from "react-i18next";

export default function Navbar() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleAccountAction = (value) => {
    if (value === "profile") navigate("/profile");
    if (value === "logout") setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("member");
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <>
      <nav className="nav-wrap">
        <div className="nav-left">
          <span className="nav-logo">Digibank</span>
        </div>

        <div className="nav-center">
          <NavLink to="/dashboard" className="nav-item">
            {t("nav.home")}
          </NavLink>
          <NavLink to="/transactions" className="nav-item">
            {t("nav.transactions")}
          </NavLink>
        </div>

        <div className="nav-right">
          <select
            className="account-select"
            defaultValue=""
            onChange={(e) => {
              handleAccountAction(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              {t("nav.account")}
            </option>
            <option value="profile">{t("nav.profile")}</option>
            <option value="logout">{t("nav.logout")}</option>
          </select>

          <select
            className="language-select"
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
          >
            <option value="th">{t("lang.th")}</option>
            <option value="en">{t("lang.en")}</option>
          </select>
        </div>
      </nav>

      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="error-icon">⚠️</div>
            <h2>{t("logout.title")}</h2>
            <p>{t("logout.confirm")}</p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button className="next-btn" onClick={handleConfirmLogout} style={{ flex: 1 }}>
                {t("logout.ok")}
              </button>
              <button
                className="modal-cancel-btn"
                onClick={() => setShowLogoutModal(false)}
                style={{ flex: 1 }}
              >
                {t("logout.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
