import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

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
            หน้าแรก
          </NavLink>
          <NavLink to="/transactions" className="nav-item">
            ธุรกรรม
          </NavLink>
        </div>

        <div className="nav-right">
          <NavLink to="/profile" className="nav-item">
            โปรไฟล์
          </NavLink>

          <button
            type="button"
            className="nav-item nav-logout"
            onClick={() => setShowLogoutModal(true)}
          >
            ออกจากระบบ
          </button>
        </div>
      </nav>

      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="error-icon">⚠️</div>
            <h2>ยืนยันการออกจากระบบ</h2>
            <p>คุณต้องการออกจากระบบใช่หรือไม่?</p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className="next-btn"
                onClick={handleConfirmLogout}
                style={{ flex: 1 }}
              >
                ยืนยัน
              </button>
              <button
                className="modal-cancel-btn"
                onClick={() => setShowLogoutModal(false)}
                style={{ flex: 1 }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
