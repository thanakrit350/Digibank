import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const storedMember = localStorage.getItem("member");
    if (storedMember) {
      setMember(JSON.parse(storedMember));
    }
  }, []);

  const birthValue = member?.birthdate || member?.birthDate;

  const handleConfirmLogout = () => {
    localStorage.removeItem("member");
    navigate("/");
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">โปรไฟล์ผู้ใช้</h1>

        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">
              {member?.firstNameTh?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="profile-name">
                {member?.firstNameTh} {member?.lastNameTh}
              </h2>
              <p className="profile-username">@{member?.username}</p>
            </div>
          </div>

          <div className="profile-info">
            <div className="info-item">
              <span className="info-label">อีเมล</span>
              <span className="info-value">{member?.email || "-"}</span>
            </div>

            <div className="info-item">
              <span className="info-label">เบอร์โทรศัพท์</span>
              <span className="info-value">{member?.phoneNumber || "-"}</span>
            </div>

            <div className="info-item">
              <span className="info-label">วันเกิด</span>
              <span className="info-value">
                {birthValue
                  ? new Date(birthValue).toLocaleDateString("th-TH")
                  : "-"}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">เลขบัตรประชาชน</span>
              <span className="info-value">{member?.memberId || "-"}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button
              className="edit-btn"
              onClick={() => navigate("/profile/edit")}
            >
              แก้ไขข้อมูล
            </button>

            <button
              className="logout-btn"
              onClick={() => setShowLogoutModal(true)}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
