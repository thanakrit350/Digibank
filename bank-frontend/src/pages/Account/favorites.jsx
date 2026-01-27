import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";
import { useTranslation } from "react-i18next";

export default function ManageFavorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [form, setForm] = useState({ name: "", accountNo: "" });
  const [error, setError] = useState("");

  const normalizeAccount = (v) => String(v || "").replaceAll("-", "").trim();

  const member = useMemo(() => {
    try {
      const stored = localStorage.getItem("member");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const ownerKey = useMemo(() => {
    const id = member?.memberId || member?.id || member?.member?.memberId;
    const username = member?.username || member?.member?.username;
    return String(id || username || "").trim();
  }, [member]);

  const storageKey = useMemo(() => {
    return ownerKey ? `favoriteAccounts:${ownerKey}` : "favoriteAccounts:guest";
  }, [ownerKey]);

  const loadFavorites = () => {
    try {
      const storedFavs = localStorage.getItem(storageKey);
      if (!storedFavs) return [];
      const parsed = JSON.parse(storedFavs);
      const list = Array.isArray(parsed) ? parsed : [];
      return list.map((fav) => ({
        ...fav,
        accountNo: normalizeAccount(fav.accountNo),
      }));
    } catch {
      return [];
    }
  };

  const saveFavorites = (newFavs) => {
    setFavorites(newFavs);
    localStorage.setItem(storageKey, JSON.stringify(newFavs));
  };

  useEffect(() => {
    setFavorites(loadFavorites());
  }, [storageKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!ownerKey) {
      setError(t("favorites.err.noUser", { defaultValue: "ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่" }));
      return;
    }

    const name = form.name.trim();
    const accountNoRaw = form.accountNo.trim();
    const accountNo = normalizeAccount(accountNoRaw);

    if (!name || !accountNo) {
      setError(t("favorites.err.required", { defaultValue: "กรุณากรอกทั้งชื่อรายการโปรดและเลขที่บัญชี" }));
      return;
    }

    if (!/^\d{6,20}$/.test(accountNo)) {
      setError(t("favorites.err.accountFormat", { defaultValue: "เลขที่บัญชีต้องเป็นตัวเลข 6–20 หลัก" }));
      return;
    }

    const exist = favorites.some((f) => normalizeAccount(f.accountNo) === accountNo);
    if (exist) {
      setError(t("favorites.err.duplicate", { defaultValue: "บัญชีนี้ถูกเพิ่มเป็นบัญชีโปรดแล้ว" }));
      return;
    }

    const newFav = {
      id: accountNo,
      name,
      accountNo,
      bank: t("favorites.bankName", { defaultValue: "Digibank" }),
      ownerKey
    };

    const updated = [...favorites, newFav];
    saveFavorites(updated);
    setForm({ name: "", accountNo: "" });
    setError("");
  };

  const handleRemoveFavorite = (accountNo) => {
    const normalizedTarget = normalizeAccount(accountNo);
    const updated = favorites.filter((f) => normalizeAccount(f.accountNo) !== normalizedTarget);
    saveFavorites(updated);
  };

  if (!ownerKey) {
    return (
      <div className="dashboard-container manage-fav-container">
        <div className="empty-state">
          <p>{t("favorites.err.noUser", { defaultValue: "ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่" })}</p>
          <button className="next-btn" type="button" onClick={() => navigate("/")}>
            {t("modal.ok", { defaultValue: "ตกลง" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container manage-fav-container">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2 className="section-title">{t("favorites.title", { defaultValue: "จัดการบัญชีโปรด" })}</h2>
        <button className="fav-header-back-btn" type="button" onClick={() => navigate(-1)}>
          {t("favorites.back", { defaultValue: "← กลับ" })}
        </button>
      </div>

      <div className="dashboard-section" style={{ marginBottom: 24 }}>
        <h3 className="section-title">{t("favorites.addTitle", { defaultValue: "เพิ่มบัญชีโปรดใหม่" })}</h3>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0e0e0",
            maxWidth: 500,
          }}
        >
          <div style={{ marginBottom: 12, textAlign: "left" }}>
            <label htmlFor="favorite-name" style={{ fontSize: 14, display: "block", marginBottom: 4 }}>
              {t("favorites.form.nameLabel", { defaultValue: "ชื่อรายการโปรด" })}
            </label>
            <input
              id="favorite-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="modal-input"
              placeholder={t("favorites.form.namePlaceholder", { defaultValue: "เช่น เพื่อน, แม่, บริษัท ฯลฯ" })}
            />
          </div>

          <div style={{ marginBottom: 12, textAlign: "left" }}>
            <label htmlFor="favorite-accountNo" style={{ fontSize: 14, display: "block", marginBottom: 4 }}>
              {t("favorites.form.accountLabel", { defaultValue: "เลขที่บัญชี" })}
            </label>
            <input
              id="favorite-accountNo"
              type="text"
              name="accountNo"
              value={form.accountNo}
              onChange={handleChange}
              className="modal-input"
              placeholder={t("favorites.form.accountPlaceholder", { defaultValue: "กรอกเลขที่บัญชี (ตัวเลข 6–20 หลัก)" })}
            />
          </div>

          {error && <p style={{ color: "#e63946", fontSize: 13, marginBottom: 8, textAlign: "left" }}>{error}</p>}

          <button type="submit" className="next-btn">
            {t("favorites.addBtn", { defaultValue: "เพิ่มบัญชีโปรด" })}
          </button>
        </form>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h3 className="section-title">{t("favorites.listTitle", { defaultValue: "บัญชีโปรดของคุณ" })}</h3>
        </div>

        {favorites.length === 0 ? (
          <div className="empty-state">
            <p>{t("favorites.empty", { defaultValue: "ยังไม่มีบัญชีโปรด" })}</p>
          </div>
        ) : (
          <div className="favorites-list">
            {favorites.map((fav) => (
              <div key={fav.accountNo} className="favorite-item">
                <div className="favorite-info">
                  <p className="favorite-name">{fav.name}</p>
                  <p className="favorite-account">{fav.accountNo}</p>
                  <p className="favorite-bank">{fav.bank}</p>
                </div>
                <button type="button" className="fav-delete-btn" onClick={() => handleRemoveFavorite(fav.accountNo)}>
                  {t("favorites.removeBtn", { defaultValue: "ลบ" })}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
