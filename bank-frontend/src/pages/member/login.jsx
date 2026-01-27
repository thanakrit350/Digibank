import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/login.css";
import { loginMember, resetPassword, getMemberByEmail } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");
  const [successAction, setSuccessAction] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmNewPwd, setShowConfirmNewPwd] = useState(false);
  const [showPin, setShowPin] = useState(false);

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

  const validatePassword = (password) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[_\W]).{8,}$/.test(password);

  const validatePasswordField = (password) => {
    if (!password) return t("validation.requiredNewPassword");
    if (password.length < 8) return t("validation.passwordMin8");
    if (!validatePassword(password)) return t("validation.passwordNeedComplex");
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.username.trim()) newErrors.username = t("validation.requiredUser");
    if (!form.password.trim()) newErrors.password = t("validation.requiredPassword");
    else if (form.password.length < 8) newErrors.password = t("validation.passwordMin8");
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
      setModalMessage(t("login.success"));
      setSuccessAction("login");
      setShowModal(true);
    } catch (err) {
      let message = t("login.failTryAgain");
      if (err?.response?.status === 401) message = t("login.invalidCreds");
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
    if (successAction === "login") navigate("/dashboard");
    setSuccessAction("");
  };

  const validateForgot = () => {
    const e = { email: "", pin: "", newPassword: "", confirmNewPassword: "", general: "" };
    const email = forgotForm.email.trim();
    const pin = forgotForm.pin.trim();
    const newPassword = forgotForm.newPassword;
    const confirm = forgotForm.confirmNewPassword;

    if (!email) e.email = t("validation.requiredEmail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = t("validation.emailInvalid");

    if (!pin) e.pin = t("validation.requiredPin");
    else if (!/^\d{6}$/.test(pin)) e.pin = t("validation.pin6digits");

    e.newPassword = validatePasswordField(newPassword);

    if (!confirm.trim()) e.confirmNewPassword = t("validation.requiredConfirmNewPassword");
    else if (newPassword !== confirm) e.confirmNewPassword = t("validation.passwordMismatch");

    setForgotErrors(e);
    return !e.email && !e.pin && !e.newPassword && !e.confirmNewPassword;
  };

  const handleForgotSubmit = async () => {
    if (!validateForgot()) return;

    const email = forgotForm.email.trim();
    const pin = forgotForm.pin.trim();
    const newPassword = forgotForm.newPassword;

    try {
      let member = null;
      try {
        member = await getMemberByEmail(email);
      } catch (e) {
        member = null;
      }

      if (!member) {
        setForgotErrors((prev) => ({ ...prev, email: t("forgot.notFoundEmail"), general: "" }));
        return;
      }

      await resetPassword({ email, pin, newPassword });

      setForgotErrors({
        email: "",
        pin: "",
        newPassword: "",
        confirmNewPassword: "",
        general: "",
      });

      setShowForgot(false);
      setForgotForm({ email: "", pin: "", newPassword: "", confirmNewPassword: "" });

      setShowPin(false);
      setShowNewPwd(false);
      setShowConfirmNewPwd(false);

      setModalType("success");
      setModalMessage(t("forgot.resetSuccessLoginAgain"));
      setSuccessAction("reset");
      setShowModal(true);
    } catch (err) {
      const msg = err?.response?.data?.message || t("forgot.resetFail");

      setForgotErrors((prev) => ({
        ...prev,
        pin: msg.includes("PIN") || msg.includes("ยืนยัน") ? msg : t("forgot.pinInvalid"),
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
    setForgotForm({ email: "", pin: "", newPassword: "", confirmNewPassword: "" });

    setShowPin(false);
    setShowNewPwd(false);
    setShowConfirmNewPwd(false);
  };

  const changeLang = (lng) => i18n.changeLanguage(lng);

  return (
    <>
      <div className="lang-switch">
        <button
          type="button"
          className={`lang-btn ${i18n.language === "th" ? "active" : ""}`}
          onClick={() => changeLang("th")}
        >
          TH
        </button>
        <button
          type="button"
          className={`lang-btn ${i18n.language === "en" ? "active" : ""}`}
          onClick={() => changeLang("en")}
        >
          EN
        </button>
      </div>
      <div className={`login-page ${showForgot ? "modal-open" : ""}`}>
        <div className="login-left" />

        <div className="login-right">
          <div className="login-card">
            <h1 className="login-title">{t("login.title")}</h1>

            <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
              <div className="form-group">
                <label className="login-label" htmlFor="username">
                  {t("login.username")}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={`login-input ${errors.username ? "error" : ""}`}
                  value={form.username}
                  autoComplete="off"
                  onChange={handleChange}
                  placeholder={t("login.usernamePlaceholder")}
                />
                {errors.username && <p className="err-text">{errors.username}</p>}
              </div>

              <div className="form-group">
                <label className="login-label" htmlFor="password">
                  {t("login.password")}
                </label>
                <div className="password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    className={`login-input ${errors.password ? "error" : ""}`}
                    value={form.password}
                    autoComplete="new-password"
                    onChange={handleChange}
                    placeholder={t("login.passwordPlaceholder")}
                  />
                  <button type="button" className="toggle-eye" onClick={() => setShowPwd((v) => !v)}>
                    {showPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="err-text">{errors.password}</p>}
              </div>

              <div className="login-forgot">
                <button type="button" className="link-button" onClick={() => setShowForgot(true)}>
                  {t("login.forgot")}
                </button>
              </div>
              
              <button type="submit" className="login-button">
                {t("login.submit")}
              </button>
            </form>

            <div className="login-divider">
              <span className="line" />
              <span className="or-text">OR</span>
              <span className="line" />
            </div>

            <button type="button" className="link-button create-account" onClick={() => navigate("/register")}>
              {t("login.createAccount")}
            </button>
          </div>
        </div>

        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className={modalType === "success" ? "success-icon" : "error-icon"}>
                {modalType === "success" ? "✓" : "⚠️"}
              </div>

              <h2>{modalType === "success" ? t("modal.successTitle") : t("modal.errorTitle")}</h2>
              <p>{modalMessage}</p>

              <button className="next-btn" onClick={handleCloseModal}>
                {t("modal.ok")}
              </button>
            </div>
          </div>
        )}
      </div>

      {showForgot && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>{t("forgot.title")}</h2>

            <div className="form-group">
              <label className="login-label">{t("forgot.email")}</label>
              <input
                className={`login-input ${forgotErrors.email ? "error" : ""}`}
                placeholder={t("forgot.emailPlaceholder")}
                value={forgotForm.email}
                onChange={(e) => {
                  setForgotForm((prev) => ({ ...prev, email: e.target.value }));
                  setForgotErrors((prev) => ({ ...prev, email: "", general: "" }));
                }}
              />
              {forgotErrors.email && <p className="err-text">{forgotErrors.email}</p>}
            </div>

            <div className="form-group">
              <label className="login-label">{t("forgot.pin")}</label>
              <div className="password-wrap">
                <input
                  className={`login-input ${forgotErrors.pin ? "error" : ""}`}
                  placeholder={t("forgot.pinPlaceholder")}
                  type={showPin ? "text" : "password"}
                  value={forgotForm.pin}
                  onChange={(e) => {
                    const v = e.target.value.replaceAll(/\D/g, "").slice(0, 6);
                    setForgotForm((prev) => ({ ...prev, pin: v }));
                    setForgotErrors((prev) => ({ ...prev, pin: "", general: "" }));
                  }}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "ซ่อน PIN" : "แสดง PIN"}
                >
                  {showPin ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              {forgotErrors.pin && <p className="err-text">{forgotErrors.pin}</p>}
            </div>

            <div className="form-group">
              <label className="login-label">{t("forgot.newPassword")}</label>
              <div className="password-wrap">
                <input
                  className={`login-input ${forgotErrors.newPassword ? "error" : ""}`}
                  placeholder={t("forgot.newPasswordPlaceholder")}
                  type={showNewPwd ? "text" : "password"}
                  value={forgotForm.newPassword}
                  onChange={(e) => {
                    setForgotForm((prev) => ({ ...prev, newPassword: e.target.value }));
                    setForgotErrors((prev) => ({ ...prev, newPassword: "", general: "" }));
                  }}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowNewPwd((v) => !v)}
                  aria-label={showNewPwd ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
                >
                  {showNewPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              {forgotErrors.newPassword && <p className="err-text">{forgotErrors.newPassword}</p>}
            </div>

            <div className="form-group">
              <label className="login-label">{t("forgot.confirmPassword")}</label>
              <div className="password-wrap">
                <input
                  className={`login-input ${forgotErrors.confirmNewPassword ? "error" : ""}`}
                  placeholder={t("forgot.confirmPasswordPlaceholder")}
                  type={showConfirmNewPwd ? "text" : "password"}
                  value={forgotForm.confirmNewPassword}
                  onChange={(e) => {
                    setForgotForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }));
                    setForgotErrors((prev) => ({ ...prev, confirmNewPassword: "", general: "" }));
                  }}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowConfirmNewPwd((v) => !v)}
                  aria-label={showConfirmNewPwd ? "ซ่อนยืนยันรหัสผ่านใหม่" : "แสดงยืนยันรหัสผ่านใหม่"}
                >
                  {showConfirmNewPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              {forgotErrors.confirmNewPassword && <p className="err-text">{forgotErrors.confirmNewPassword}</p>}
            </div>

            {forgotErrors.general && <p className="err-text">{forgotErrors.general}</p>}

            <button className="login-button" onClick={handleForgotSubmit}>
              {t("forgot.submit")}
            </button>

            <button type="button" className="link-button" onClick={closeForgotModal}>
              {t("forgot.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
