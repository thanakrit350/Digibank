import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/login.css";
import { loginMember, resetPassword } from "../../lib/api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");

  // แยกว่าความสำเร็จมาจาก action ไหน เพื่อไม่ให้ reset แล้วเด้งไป dashboard
  const [successAction, setSuccessAction] = useState(""); // "" | "login" | "reset"

  const [showForgot, setShowForgot] = useState(false);
  const [forgotForm, setForgotForm] = useState({
    email: "",
    pin: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [forgotErrors, setForgotErrors] = useState({
    email: "",
    pin: "",
    newPassword: "",
    confirmNewPassword: "",
    general: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.username.trim()) newErrors.username = "กรุณากรอกชื่อผู้ใช้";
    else if (form.username.trim().length < 4)
      newErrors.username = "ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร";

    if (!form.password.trim()) newErrors.password = "กรุณากรอกรหัสผ่าน";
    else if (form.password.length < 8)
      newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const member = await loginMember({
        user: form.username,
        password: form.password,
      });

      localStorage.setItem("member", JSON.stringify(member));

      setModalType("success");
      setModalMessage("เข้าสู่ระบบสำเร็จ");
      setSuccessAction("login");
      setShowModal(true);
    } catch (err) {
      let message = "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง";
      if (err?.response?.status === 401) message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      else if (err?.response?.data?.message) message = err.response.data.message;

      setModalType("error");
      setModalMessage(message);
      setSuccessAction("");
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);

    if (modalType !== "success") return;

    if (successAction === "login") {
      navigate("/dashboard");
    } else if (successAction === "reset") {
      // อยู่หน้า login ต่อ (ไม่ต้อง navigate)
    }

    setSuccessAction("");
  };

  const validateForgot = () => {
    const e = {
      email: "",
      pin: "",
      newPassword: "",
      confirmNewPassword: "",
      general: "",
    };

    const email = forgotForm.email.trim();
    const pin = forgotForm.pin.trim();
    const newPassword = forgotForm.newPassword;
    const confirm = forgotForm.confirmNewPassword;

    if (!email) e.email = "กรุณากรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (!pin) e.pin = "กรุณากรอก PIN";
    else if (!/^\d{6}$/.test(pin)) e.pin = "PIN ต้องเป็นตัวเลข 6 หลัก";

    if (!newPassword.trim()) e.newPassword = "กรุณากรอกรหัสผ่านใหม่";
    else if (newPassword.length < 8) e.newPassword = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";

    if (!confirm.trim()) e.confirmNewPassword = "กรุณายืนยันรหัสผ่านใหม่";
    else if (newPassword !== confirm) e.confirmNewPassword = "รหัสผ่านไม่ตรงกัน";

    setForgotErrors(e);
    return !e.email && !e.pin && !e.newPassword && !e.confirmNewPassword;
  };

  const handleForgotSubmit = async () => {
    if (!validateForgot()) return;

    try {
      await resetPassword({
        email: forgotForm.email.trim(),
        pin: forgotForm.pin.trim(),
        newPassword: forgotForm.newPassword,
      });

      setForgotErrors({
        email: "",
        pin: "",
        newPassword: "",
        confirmNewPassword: "",
        general: "",
      });

      setShowForgot(false);
      setForgotForm({
        email: "",
        pin: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      setModalType("success");
      setModalMessage("ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");
      setSuccessAction("reset");
      setShowModal(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้";

      setForgotErrors((prev) => ({
        ...prev,
        pin:
          msg.includes("PIN") || msg.includes("ยืนยัน")
            ? msg
            : "PIN หรือข้อมูลยืนยันไม่ถูกต้อง",
        general: msg.includes("PIN") || msg.includes("ยืนยัน") ? "" : msg,
      }));
    }
  };

  const closeForgotModal = () => {
    setShowForgot(false);
    setForgotErrors({
      email: "",
      pin: "",
      newPassword: "",
      confirmNewPassword: "",
      general: "",
    });
    setForgotForm({
      email: "",
      pin: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  };

  return (
    <>
      <div className="login-page">
        <div className="login-left" />

        <div className="login-right">
          <div className="login-card">
            <h1 className="login-title">เข้าสู่ระบบ</h1>

            <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
              <div className="form-group">
                <label className="login-label" htmlFor="username">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={`login-input ${errors.username ? "error" : ""}`}
                  value={form.username}
                  autoComplete="off"
                  onChange={handleChange}
                  placeholder="กรอกอีเมลหรือชื่อผู้ใช้"
                />
                {errors.username && <p className="err-text">{errors.username}</p>}
              </div>

              <div className="form-group">
                <label className="login-label" htmlFor="password">
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className={`login-input ${errors.password ? "error" : ""}`}
                  value={form.password}
                  autoComplete="new-password"
                  onChange={handleChange}
                  placeholder="กรอกรหัสผ่าน"
                />
                {errors.password && <p className="err-text">{errors.password}</p>}
              </div>

              <div className="login-forgot">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setShowForgot(true)}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>

              <button type="submit" className="login-button">
                เข้าสู่ระบบ
              </button>
            </form>

            <div className="login-divider">
              <span className="line" />
              <span className="or-text">OR</span>
              <span className="line" />
            </div>

            <button
              type="button"
              className="link-button create-account"
              onClick={() => navigate("/register")}
            >
              สร้างบัญชีใหม่
            </button>
          </div>
        </div>

        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className={modalType === "success" ? "success-icon" : "error-icon"}>
                {modalType === "success" ? "✓" : "⚠️"}
              </div>

              <h2>{modalType === "success" ? "สำเร็จ" : "เกิดข้อผิดพลาด"}</h2>
              <p>{modalMessage}</p>

              <button className="next-btn" onClick={handleCloseModal}>
                ตกลง
              </button>
            </div>
          </div>
        )}
      </div>

      {showForgot && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>ลืมรหัสผ่าน</h2>

            <div className="form-group">
              <label className="login-label">อีเมล</label>
              <input
                className={`login-input ${forgotErrors.email ? "error" : ""}`}
                placeholder="กรอกอีเมล"
                value={forgotForm.email}
                onChange={(e) => {
                  setForgotForm((prev) => ({ ...prev, email: e.target.value }));
                  setForgotErrors((prev) => ({ ...prev, email: "", general: "" }));
                }}
              />
              {forgotErrors.email && <p className="err-text">{forgotErrors.email}</p>}
            </div>

            <div className="form-group">
              <label className="login-label">PIN</label>
              <input
                className={`login-input ${forgotErrors.pin ? "error" : ""}`}
                placeholder="กรอก PIN"
                type="password"
                value={forgotForm.pin}
                onChange={(e) => {
                  const v = e.target.value.replaceAll(/\D/g, "").slice(0, 6);
                  setForgotForm((prev) => ({ ...prev, pin: v }));
                  setForgotErrors((prev) => ({ ...prev, pin: "", general: "" }));
                }}
              />
              {forgotErrors.pin && <p className="err-text">{forgotErrors.pin}</p>}
            </div>

            <div className="form-group">
              <label className="login-label">รหัสผ่านใหม่</label>
              <input
                className={`login-input ${forgotErrors.newPassword ? "error" : ""}`}
                placeholder="กรอกรหัสผ่านใหม่"
                type="password"
                value={forgotForm.newPassword}
                onChange={(e) => {
                  setForgotForm((prev) => ({ ...prev, newPassword: e.target.value }));
                  setForgotErrors((prev) => ({ ...prev, newPassword: "", general: "" }));
                }}
              />
              {forgotErrors.newPassword && (
                <p className="err-text">{forgotErrors.newPassword}</p>
              )}
            </div>

            <div className="form-group">
              <label className="login-label">ยืนยันรหัสผ่านใหม่</label>
              <input
                className={`login-input ${forgotErrors.confirmNewPassword ? "error" : ""}`}
                placeholder="ยืนยันรหัสผ่านใหม่"
                type="password"
                value={forgotForm.confirmNewPassword}
                onChange={(e) => {
                  setForgotForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }));
                  setForgotErrors((prev) => ({ ...prev, confirmNewPassword: "", general: "" }));
                }}
              />
              {forgotErrors.confirmNewPassword && (
                <p className="err-text">{forgotErrors.confirmNewPassword}</p>
              )}
            </div>

            {forgotErrors.general && <p className="err-text">{forgotErrors.general}</p>}

            <button className="login-button" onClick={handleForgotSubmit}>
              ตั้งรหัสผ่านใหม่
            </button>

            <button type="button" className="link-button" onClick={closeForgotModal}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </>
  );
}
