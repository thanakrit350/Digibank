import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/profile.css";
import { updateMember } from "../../lib/api";

export default function EditProfile() {
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [form, setForm] = useState({
    firstNameTh: "",
    lastNameTh: "",
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");

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
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.firstNameTh.trim()) {
      newErrors.firstNameTh = "กรุณากรอกชื่อจริง";
    }
    if (!form.lastNameTh.trim()) {
      newErrors.lastNameTh = "กรุณากรอกนามสกุล";
    }
    if (!form.email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

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
        ...member,
        firstNameTh: form.firstNameTh.trim(),
        lastNameTh: form.lastNameTh.trim(),
        email: form.email.trim(),
      };

      const updated = await updateMember(id, payload);

      localStorage.setItem("member", JSON.stringify(updated));

      setModalType("success");
      setModalMessage("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
      setModalOpen(true);
    } catch (err) {
      setModalType("error");
      setModalMessage(
        err?.response?.data?.message ||
          "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
      );
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (modalType === "success") {
      navigate("/profile");
    }
  };

  if (!member) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>ไม่พบข้อมูลผู้ใช้</p>
        </div>
      </div>
    );
  }

  const birthValue = member.birthdate || member.birthDate;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">แก้ไขโปรไฟล์</h1>

        <div className="profile-card">
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-header" style={{ marginBottom: 24 }}>
              <div className="avatar">
                {member.firstNameTh?.charAt(0) || "U"}
              </div>
              <div>
                <h2 className="profile-name">
                  {member.firstNameTh} {member.lastNameTh}
                </h2>
                <p className="profile-username">@{member.username}</p>
              </div>
            </div>

            <div className="profile-info">
              <div className="info-item column">
                <label className="info-label" htmlFor="firstNameTh">
                  ชื่อจริง
                </label>
                <input
                  id="firstNameTh"
                  type="text"
                  name="firstNameTh"
                  className={`profile-input ${
                    errors.firstNameTh ? "error" : ""
                  }`}
                  value={form.firstNameTh}
                  onChange={handleChange}
                />
                {errors.firstNameTh && (
                  <span className="err-text">{errors.firstNameTh}</span>
                )}
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="lastNameTh">
                  นามสกุล
                </label>
                <input
                  id="lastNameTh"
                  type="text"
                  name="lastNameTh"
                  className={`profile-input ${
                    errors.lastNameTh ? "error" : ""
                  }`}
                  value={form.lastNameTh}
                  onChange={handleChange}
                />
                {errors.lastNameTh && (
                  <span className="err-text">{errors.lastNameTh}</span>
                )}
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="email">
                  อีเมล
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className={`profile-input ${errors.email ? "error" : ""}`}
                  value={form.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <span className="err-text">{errors.email}</span>
                )}
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="phoneNumber">
                  เบอร์โทรศัพท์
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  disabled
                  className="profile-input read-only"
                  value={member.phoneNumber || ""}
                />
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="birthDate">
                  วันเกิด
                </label>
                <input
                  id="birthDate"
                  type="text"
                  disabled
                  className="profile-input read-only"
                  value={
                    birthValue
                      ? new Date(birthValue).toLocaleDateString("th-TH")
                      : ""
                  }
                />
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="memberId">
                  เลขบัตรประชาชน
                </label>
                <input
                  id="memberId"
                  type="text"
                  disabled
                  className="profile-input read-only"
                  value={member.memberId || ""}
                />
              </div>

              <div className="info-item column">
                <label className="info-label" htmlFor="username">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  type="text"
                  disabled
                  className="profile-input read-only"
                  value={member.username || ""}
                />
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="logout-btn"
                onClick={() => navigate("/profile")}
              >
                ยกเลิก
              </button>
              <button type="submit" className="edit-btn" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div
              className={
                modalType === "success" ? "success-icon" : "error-icon"
              }
            >
              {modalType === "success" ? "✓" : "⚠️"}
            </div>
            <h2>
              {modalType === "success" ? "บันทึกสำเร็จ" : "เกิดข้อผิดพลาด"}
            </h2>
            <p>{modalMessage}</p>
            <button className="next-btn" onClick={handleCloseModal}>
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
