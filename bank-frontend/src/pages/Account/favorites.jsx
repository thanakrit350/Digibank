import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";

export default function ManageFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [form, setForm] = useState({
    name: "",
    accountNo: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const normalizeAccount = (v) => String(v || "").replaceAll("-", "").trim();

  useEffect(() => {
    const storedFavs = localStorage.getItem("favoriteAccounts");
    if (storedFavs) {
      try {
        const parsed = JSON.parse(storedFavs);
        const normalized = parsed.map((fav) => ({
          ...fav,
          accountNo: normalizeAccount(fav.accountNo),
        }));
        setFavorites(normalized);
      } catch {
        setFavorites([]);
      }
    } else {
      setFavorites([]);
    }
  }, []);

  const saveFavorites = (newFavs) => {
    setFavorites(newFavs);
    localStorage.setItem("favoriteAccounts", JSON.stringify(newFavs));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const accountNoRaw = form.accountNo.trim();
    const accountNo = normalizeAccount(accountNoRaw);

    if (!name || !accountNo) {
      setError("กรุณากรอกทั้งชื่อรายการโปรดและเลขที่บัญชี");
      return;
    }

    if (!/^\d{6,20}$/.test(accountNo)) {
      setError("เลขที่บัญชีต้องเป็นตัวเลข 6–20 หลัก");
      return;
    }

    const exist = favorites.some(
      (f) => normalizeAccount(f.accountNo) === accountNo
    );
    if (exist) {
      setError("บัญชีนี้ถูกเพิ่มเป็นบัญชีโปรดแล้ว");
      return;
    }

    const newFav = {
      id: accountNo,
      name,
      accountNo,
      bank: "Digibank",
    };

    const updated = [...favorites, newFav];
    saveFavorites(updated);
    setForm({ name: "", accountNo: "" });
    setError("");
  };

  const handleRemoveFavorite = (accountNo) => {
    const normalizedTarget = normalizeAccount(accountNo);
    const updated = favorites.filter(
      (f) => normalizeAccount(f.accountNo) !== normalizedTarget
    );
    saveFavorites(updated);
  };

  return (
    <div className="dashboard-container manage-fav-container">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2 className="section-title">จัดการบัญชีโปรด</h2>
        <button
          className="fav-header-back-btn"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← กลับ
        </button>
      </div>

      <div className="dashboard-section" style={{ marginBottom: 24 }}>
        <h3 className="section-title">เพิ่มบัญชีโปรดใหม่</h3>
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
            <label
              htmlFor="favorite-name"
              style={{ fontSize: 14, display: "block", marginBottom: 4 }}
            >
              ชื่อรายการโปรด
            </label>
            <input
              id="favorite-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="modal-input"
              placeholder="เช่น เพื่อน, แม่, บริษัท ฯลฯ"
            />
          </div>

          <div style={{ marginBottom: 12, textAlign: "left" }}>
            <label
              htmlFor="favorite-accountNo"
              style={{ fontSize: 14, display: "block", marginBottom: 4 }}
            >
              เลขที่บัญชี
            </label>
            <input
              id="favorite-accountNo"
              type="text"
              name="accountNo"
              value={form.accountNo}
              onChange={handleChange}
              className="modal-input"
              placeholder="กรอกเลขที่บัญชี (ตัวเลข 6–20 หลัก)"
            />
          </div>

          {error && (
            <p
              style={{
                color: "#e63946",
                fontSize: 13,
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              {error}
            </p>
          )}

          <button type="submit" className="next-btn">
            เพิ่มบัญชีโปรด
          </button>
        </form>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h3 className="section-title">บัญชีโปรดของคุณ</h3>
        </div>

        {favorites.length === 0 ? (
          <div className="empty-state">
            <p>ยังไม่มีบัญชีโปรด</p>
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
                <button
                  type="button"
                  className="fav-delete-btn"
                  onClick={() => handleRemoveFavorite(fav.accountNo)}
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}