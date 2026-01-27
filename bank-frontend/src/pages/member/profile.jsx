import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/profile.css";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [member, setMember] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const storedMember = localStorage.getItem("member");
    if (storedMember) setMember(JSON.parse(storedMember));
  }, []);

  const birthValue = member?.birthdate || member?.birthDate;

  const handleConfirmLogout = () => {
    localStorage.removeItem("member");
    navigate("/");
  };

  const formatBirthDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);

    if (i18n.language === "en") {
      return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        calendar: "gregory",
      });
    }

    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      calendar: "buddhist",
    });
  };

  const displayFirstName =
    i18n.language === "en"
      ? member?.firstNameEn || member?.firstNameTh || member?.username || ""
      : member?.firstNameTh || member?.firstNameEn || member?.username || "";

  const displayLastName =
    i18n.language === "en"
      ? member?.lastNameEn || member?.lastNameTh || ""
      : member?.lastNameTh || member?.lastNameEn || "";
  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-topbar">
          <h1 className="profile-title">{t("profile.title", { defaultValue: "โปรไฟล์ผู้ใช้" })}</h1>

          <div className="lang-switch">
            <button
              type="button"
              className={`lang-btn ${i18n.language === "th" ? "active" : ""}`}
              onClick={() => i18n.changeLanguage("th")}
            >
              TH
            </button>
            <button
              type="button"
              className={`lang-btn ${i18n.language === "en" ? "active" : ""}`}
              onClick={() => i18n.changeLanguage("en")}
            >
              EN
            </button>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-header"  style={{ marginBottom: 24 }}>
              <div className="avatar">{displayFirstName?.charAt(0) || "U"}</div>
            <div>
              <h2 className="profile-name">
                {t("profile.nameFormat", {
                  defaultValue: "{{first}} {{last}}",
                  first: displayFirstName,
                  last: displayLastName,
                })}
              </h2>
              <p className="profile-username">@{member?.username || "-"}</p>
            </div>
          </div>

          <div className="profile-info">
            <div className="info-item">
              <span className="info-label">{t("profile.email", { defaultValue: "อีเมล" })}</span>
              <span className="info-value">{member?.email || "-"}</span>
            </div>

            <div className="info-item">
              <span className="info-label">{t("profile.phone", { defaultValue: "เบอร์โทรศัพท์" })}</span>
              <span className="info-value">{member?.phoneNumber || "-"}</span>
            </div>

            <div className="info-item">
              <span className="info-label">{t("profile.birthDate", { defaultValue: "วันเกิด" })}</span>
              <span className="info-value">{formatBirthDate(birthValue)}</span>
            </div>

            <div className="info-item">
              <span className="info-label">{t("profile.memberId", { defaultValue: "เลขบัตรประชาชน" })}</span>
              <span className="info-value">{member?.memberId || "-"}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="edit-btn" onClick={() => navigate("/profile/edit")}>
              {t("profile.edit", { defaultValue: "แก้ไขข้อมูล" })}
            </button>

            <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
              {t("profile.logout", { defaultValue: "ออกจากระบบ" })}
            </button>
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="error-icon">⚠️</div>
            <h2>{t("logout.title", { defaultValue: "ยืนยันการออกจากระบบ" })}</h2>
            <p>{t("logout.confirm", { defaultValue: "คุณต้องการออกจากระบบใช่หรือไม่?" })}</p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button className="next-btn" onClick={handleConfirmLogout} style={{ flex: 1 }}>
                {t("logout.ok", { defaultValue: "ยืนยัน" })}
              </button>
              <button className="modal-cancel-btn" onClick={() => setShowLogoutModal(false)} style={{ flex: 1 }}>
                {t("logout.cancel", { defaultValue: "ยกเลิก" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
