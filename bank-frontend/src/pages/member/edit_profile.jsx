import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/profile.css";
import { updateMember } from "../../lib/api";
import { useTranslation } from "react-i18next";

const ALLOWED_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.co.th"];

const validateThaiText = (text) => /^[\u0E00-\u0E7F\s]+$/.test(text);

const validateEmailBankStyle = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return ALLOWED_DOMAINS.includes(domain);
};

export default function EditProfile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [member, setMember] = useState(null);
  const [form, setForm] = useState({ firstNameTh: "", lastNameTh: "", email: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");

  const validateField = (name, value) => {
    const v = (value || "").trim();

    switch (name) {
      case "firstNameTh":
        if (!v) return t("editProfile.err.firstNameRequired", { defaultValue: "กรุณากรอกชื่อจริง" });
        if (!validateThaiText(v)) return t("editProfile.err.firstNameThaiOnly", { defaultValue: "กรุณากรอกชื่อเป็นภาษาไทยเท่านั้น" });
        return "";
      case "lastNameTh":
        if (!v) return t("editProfile.err.lastNameRequired", { defaultValue: "กรุณากรอกนามสกุล" });
        if (!validateThaiText(v)) return t("editProfile.err.lastNameThaiOnly", { defaultValue: "กรุณากรอกนามสกุลเป็นภาษาไทยเท่านั้น" });
        return "";
      case "email":
        if (!v) return t("editProfile.err.emailRequired", { defaultValue: "กรุณากรอกอีเมล" });
        if (!validateEmailBankStyle(v)) return t("editProfile.err.emailInvalidDomain", { defaultValue: "รูปแบบอีเมลไม่ถูกต้อง หรือโดเมนไม่รองรับ" });
        return "";
      default:
        return "";
    }
  };

  useEffect(() => {
    const storedMember = localStorage.getItem("member");
    if (!storedMember) return;
    const m = JSON.parse(storedMember);
    setMember(m);
    setForm({
      firstNameTh: m.firstNameTh || "",
      lastNameTh: m.lastNameTh || "",
      email: m.email || "",
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    const errorMsg = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const validate = () => {
    const newErrors = {
      firstNameTh: validateField("firstNameTh", form.firstNameTh),
      lastNameTh: validateField("lastNameTh", form.lastNameTh),
      email: validateField("email", form.email),
    };
    Object.keys(newErrors).forEach((k) => !newErrors[k] && delete newErrors[k]);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member) return;
    if (!validate()) return;

    try {
      setSaving(true);
      const id = member.memberId || member.id || member.member?.memberId;

      const payload = {
        firstNameTh: form.firstNameTh.trim(),
        lastNameTh: form.lastNameTh.trim(),
        email: form.email.trim(),
      };

      const updated = await updateMember(id, payload);
      const merged = { ...member, ...updated };

      localStorage.setItem("member", JSON.stringify(merged));
      setMember(merged);

      setModalType("success");
      setModalMessage(t("editProfile.successMsg", { defaultValue: "บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว" }));
      setModalOpen(true);
    } catch (err) {
      setModalType("error");
      setModalMessage(err?.response?.data?.message || t("editProfile.failMsg", { defaultValue: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" }));
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (modalType === "success") navigate("/profile");
  };

  if (!member) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>{t("editProfile.notFound", { defaultValue: "ไม่พบข้อมูลผู้ใช้" })}</p>
        </div>
      </div>
    );
  }

  const birthValue = member.birthdate || member.birthDate;
  const locale = i18n.language === "en" ? "en-US" : "th-TH";
  const calendar = i18n.language === "en" ? "gregory" : "buddhist";

  const birthText = birthValue
    ? new Date(birthValue).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit", calendar })
    : "";

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
        <h1 className="profile-title">{t("editProfile.title", { defaultValue: "แก้ไขโปรไฟล์" })}</h1>

        <div className="profile-card">
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-header" style={{ marginBottom: 24 }}>
              <div className="avatar">{displayFirstName?.charAt(0) || "U"}</div>
              <div>
                <h2 className="profile-name">
                  {displayFirstName} {displayLastName}
                </h2>
                <p className="profile-username">@{member.username}</p>
              </div>
            </div>

            <div className="profile-info">
              <div className="info-item column">
                <label className="info-label" htmlFor="firstNameTh">
                  {t("editProfile.firstName", { defaultValue: "ชื่อจริง" })}
                </label>
                <input
                  id="firstNameTh"
                  name="firstNameTh"
                  value={form.firstNameTh}
                  onChange={handleChange}
                  className={`profile-input ${errors.firstNameTh ? "error" : ""}`}
                />
                {errors.firstNameTh && <span className="err-text">{errors.firstNameTh}</span>}
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="lastNameTh">
                  {t("editProfile.lastName", { defaultValue: "นามสกุล" })}
                </label>
                <input
                  id="lastNameTh"
                  name="lastNameTh"
                  value={form.lastNameTh}
                  onChange={handleChange}
                  className={`profile-input ${errors.lastNameTh ? "error" : ""}`}
                />
                {errors.lastNameTh && <span className="err-text">{errors.lastNameTh}</span>}
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="email">
                  {t("editProfile.email", { defaultValue: "อีเมล" })}
                </label>
                <input
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`profile-input ${errors.email ? "error" : ""}`}
                />
                {errors.email && <span className="err-text">{errors.email}</span>}
              </div>

              <div className="info-item column">
                <label className="info-label">{t("editProfile.phone", { defaultValue: "เบอร์โทรศัพท์" })}</label>
                <input disabled className="profile-input read-only" value={member.phoneNumber || ""} />
              </div>

              <div className="info-item column">
                <label className="info-label">{t("editProfile.birthDate", { defaultValue: "วันเกิด" })}</label>
                <input disabled className="profile-input read-only" value={birthText} />
              </div>

              <div className="info-item column">
                <label className="info-label">{t("editProfile.memberId", { defaultValue: "เลขบัตรประชาชน" })}</label>
                <input disabled className="profile-input read-only" value={member.memberId || ""} />
              </div>

              <div className="info-item column">
                <label className="info-label">{t("editProfile.username", { defaultValue: "ชื่อผู้ใช้" })}</label>
                <input disabled className="profile-input read-only" value={member.username || ""} />
              </div>
            </div>

            <div className="profile-actions">
              <button type="button" className="logout-btn" onClick={() => navigate("/profile")}>
                {t("editProfile.cancel", { defaultValue: "ยกเลิก" })}
              </button>
              <button type="submit" className="edit-btn" disabled={saving}>
                {saving ? t("editProfile.saving", { defaultValue: "กำลังบันทึก..." }) : t("editProfile.save", { defaultValue: "บันทึกการเปลี่ยนแปลง" })}
              </button>
            </div>
          </form>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className={modalType === "success" ? "success-icon" : "error-icon"}>{modalType === "success" ? "✓" : "⚠️"}</div>
            <h2>
              {modalType === "success"
                ? t("modal.successTitle", { defaultValue: "สำเร็จ" })
                : t("modal.errorTitle", { defaultValue: "เกิดข้อผิดพลาด" })}
            </h2>
            <p>{modalMessage}</p>
            <button className="next-btn" onClick={handleCloseModal}>
              {t("modal.ok", { defaultValue: "ตกลง" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
