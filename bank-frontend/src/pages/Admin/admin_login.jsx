import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin_login.css";
import { loginAdmin } from "../../lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.username.trim()) {
      newErrors.username = "กรุณากรอกชื่อผู้ใช้";
    }

    if (!form.password.trim()) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const admin = await loginAdmin({
        username: form.username,
        password: form.password,
      });

      console.log("ADMIN LOGIN SUCCESS =", admin);
      localStorage.setItem("admin", JSON.stringify(admin));

      setModalType("success");
      setModalMessage("เข้าสู่ระบบผู้ดูแลระบบสำเร็จ");
      setShowModal(true);
    } catch (err) {
      console.error(err);

      let message = "ไม่สามารถเข้าสู่ระบบได้";

      if (err?.response?.status === 401) {
        message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }

      setModalType("error");
      setModalMessage(message);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalType === "success") {
      navigate("/admin-dashboard");
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-left" />

      <div className="admin-login-right">
        <div className="admin-login-card">
          <h1 className="admin-login-title">Admin Digibank</h1>

          <form onSubmit={handleSubmit} className="admin-login-form" autoComplete="off">
            <div className="form-group">
              <label htmlFor="username" className="admin-login-label">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className={`admin-login-input ${errors.username ? "error" : ""}`}
                value={form.username}
                onChange={handleChange}
                placeholder="กรอกชื่อผู้ใช้"
              />
              {errors.username && <p className="err-text">{errors.username}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="admin-login-label">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className={`admin-login-input ${errors.password ? "error" : ""}`}
                value={form.password}
                onChange={handleChange}
                placeholder="กรอกรหัสผ่าน"
              />
              {errors.password && <p className="err-text">{errors.password}</p>}
            </div>

            <button type="submit" className="admin-login-button">
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className={`modal-icon ${modalType}`}>
              {modalType === "success" ? "✓" : "⚠️"}
            </div>

            <h2>{modalType === "success" ? "สำเร็จ" : "ผิดพลาด"}</h2>
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
