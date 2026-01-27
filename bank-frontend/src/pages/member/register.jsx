import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { addMember, getMemberById, getMemberByEmail, getMemberByUsername } from "../../lib/api";
import "../../styles/register.css";
import PropTypes from "prop-types";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

const validateThaiId = (id) => {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  let weight = 13;
  for (let i = 0; i < 12; i++) sum += (id.charAt(i) - "0") * weight--;
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === id.charAt(12) - "0";
};

const validateThaiText = (text) => /^[\u0E00-\u0E7F\s]+$/.test(text);
const validateEnglishText = (text) => /^[A-Za-z\s]+$/.test(text);
const validatePhoneNumber = (phone) => /^0\d{9}$/.test(phone);
const validatePostalCode = (code) => /^\d{5}$/.test(code);
const validatePassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[\x21-\x7E]{8,}$/.test(password);
const validateAddressFreeText = (text) => /^[A-Za-z0-9\u0E00-\u0E7F\s./(),\-]+$/.test(text);

const ALLOWED_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.co.th"];

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split("@")[1].toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

const makeLabel = (item) => {
  const th = item?.name_th || "";
  const en = item?.name_en || "";
  return th && en ? `${th} — ${en}` : th || en || String(item?.id ?? "");
};

const sortByThaiName = (data) => data.slice().sort((a, b) => (a.name_th || "").localeCompare(b.name_th || "", "th"));

const FormGroup = ({ label, htmlFor, error, children }) => (
  <div className="form-group">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {error && <p className="err-text">{error}</p>}
  </div>
);

FormGroup.propTypes = {
  label: PropTypes.string.isRequired,
  htmlFor: PropTypes.string,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const StepIndicator = ({ step, currentStep, t }) => {
  const labels = [
    t("register.step1", { defaultValue: "กรอกข้อมูลส่วนตัว" }),
    t("register.step2", { defaultValue: "กรอกที่อยู่" }),
    t("register.step3", { defaultValue: "ตั้งรหัส PIN" }),
  ];
  const getClassName = () => {
    if (currentStep === step) return "current";
    if (currentStep > step) return "done";
    return "";
  };

  return (
    <div className="step-item">
      <div className={`step-circle ${getClassName()}`}>{step}</div>
      <span className="step-label">{labels[step - 1]}</span>
    </div>
  );
};

StepIndicator.propTypes = {
  step: PropTypes.number.isRequired,
  currentStep: PropTypes.number.isRequired,
  t: PropTypes.func.isRequired,
};

const PinInput = ({ values, refs, type, onChange, onKeyDown, t }) => (
  <div className="pin-input-row">
    {values.map((v, i) => (
      <input
        key={`${type}-${i}`}
        className="pin-input"
        type="password"
        inputMode="numeric"
        maxLength={1}
        value={v}
        ref={(el) => (refs.current[i] = el)}
        onChange={(e) => onChange(type, i, e.target.value)}
        onKeyDown={(e) => onKeyDown(type, i, e)}
        aria-label={`${type === "pin" ? t("register.pin", { defaultValue: "PIN" }) : t("register.confirmPin", { defaultValue: "Confirm PIN" })} digit ${i + 1}`}
      />
    ))}
  </div>
);

PinInput.propTypes = {
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  refs: PropTypes.shape({ current: PropTypes.array }).isRequired,
  type: PropTypes.oneOf(["pin", "confirmPin"]).isRequired,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

const Modal = ({ show, icon, title, message, onClose, buttonText }) => {
  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className={icon === "✓" ? "success-icon" : "error-icon"}>{icon}</div>
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="next-btn" onClick={onClose}>
          {buttonText}
        </button>
      </div>
    </div>
  );
};

Modal.propTypes = {
  show: PropTypes.bool.isRequired,
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  buttonText: PropTypes.string.isRequired,
};

const useGeoData = (t) => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGeo, setSelectedGeo] = useState({ provinceId: "", districtId: "", subDistrictId: "" });

  useEffect(() => {
    const controller = new AbortController();
    const loadProvinces = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province_with_district_and_sub_district.json", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setProvinces(sortByThaiName(data));
      } catch (e) {
        if (e.name !== "AbortError") setError(t("register.geoLoadFail", { defaultValue: "ไม่สามารถโหลดข้อมูลจังหวัดได้ กรุณาลองใหม่อีกครั้ง" }));
      } finally {
        setLoading(false);
      }
    };
    loadProvinces();
    return () => controller.abort();
  }, [t]);

  const updateDistricts = (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      return null;
    }
    const province = provinces.find((p) => String(p.id) === provinceId);
    setDistricts(sortByThaiName(province?.districts || []));
    return province?.name_th || "";
  };

  const updateSubDistricts = (districtId) => {
    if (!districtId) {
      setSubDistricts([]);
      return null;
    }
    const district = districts.find((d) => String(d.id) === districtId);
    setSubDistricts(sortByThaiName(district?.sub_districts || []));
    return district?.name_th || "";
  };

  const getSubDistrictData = (subDistrictId) => {
    if (!subDistrictId) return null;
    const sd = subDistricts.find((s) => String(s.id) === subDistrictId);
    return sd ? { name: sd.name_th || "", zipCode: sd.zip_code ? String(sd.zip_code) : "" } : null;
  };

  return {
    provinces,
    districts,
    subDistricts,
    loading,
    error,
    selectedGeo,
    setSelectedGeo,
    updateDistricts,
    updateSubDistricts,
    getSubDistrictData,
  };
};

export default function Register() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const msg = (key, def) => t(key, { defaultValue: def });

  const [step, setStep] = useState(1);
  const [pinPhase, setPinPhase] = useState("set");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [errors, setErrors] = useState({});
  const [pinError, setPinError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [memberForm, setMemberForm] = useState({
    memberId: "",
    prefixTh: "",
    firstNameTh: "",
    lastNameTh: "",
    prefixEn: "",
    firstNameEn: "",
    lastNameEn: "",
    email: "",
    birthDate: "",
    phoneNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [birthParts, setBirthParts] = useState({ day: "", month: "", year: "" });

  const pad2 = (n) => String(n).padStart(2, "0");

  const toBirthDateString = (year, month, day) => {
    if (!year || !month || !day) return "";
    return `${year}-${pad2(month)}-${pad2(day)}`;
  };

  const daysInMonth = (year, month) => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  };

  const monthLabels = useMemo(
    () =>
      i18n.language === "th"
        ? ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
        : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    [i18n.language]
  );

  const yearRange = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const minYear = thisYear - 100;
    const maxYear = thisYear;  
    const years = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);
    return years;
  }, []);

  useEffect(() => {
    if (!memberForm.birthDate) return;
    const [y, m, d] = memberForm.birthDate.split("-");
    if (y && m && d) setBirthParts({ year: y, month: String(Number(m)), day: String(Number(d)) });
  }, [memberForm.birthDate]);

  const handleBirthPartChange = (field, value) => {
    setBirthParts((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "year" || field === "month") {
        const maxDay = daysInMonth(next.year, next.month);
        if (next.day && Number(next.day) > maxDay) next.day = String(maxDay);
      }

      const nextBirthDate = toBirthDateString(next.year, next.month, next.day);
      setMemberForm((m) => ({ ...m, birthDate: nextBirthDate }));
      clearError("birthDate");
      return next;
    });
  };

  const [addressForm, setAddressForm] = useState({
    houseNumber: "",
    soi: "",
    road: "",
    subDistrict: "",
    district: "",
    province: "",
    postalCode: "",
  });

  const [pinForm, setPinForm] = useState({
    pin: ["", "", "", "", "", ""],
    confirmPin: ["", "", "", "", "", ""],
  });

  const geoData = useGeoData(t);
  const pinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

  const validateMemberIdField = (memberId) => {
    if (!memberId) return msg("register.err.memberIdRequired", "กรุณากรอกเลขบัตรประชาชน");
    if (!/^\d{13}$/.test(memberId)) return msg("register.err.memberId13", "กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    if (!validateThaiId(memberId)) return msg("register.err.memberIdInvalid", "เลขบัตรประชาชนไม่ถูกต้อง");
    return null;
  };

  const validateNameField = (value, fieldName, validator, langLabel) => {
    if (!value) return msg("register.err.nameRequired", `กรุณากรอก${fieldName} (${langLabel})`);
    if (!validator(value)) return msg("register.err.nameLangOnly", `กรุณากรอก${fieldName}เป็นภาษา${langLabel}เท่านั้น`);
    return null;
  };

  const validateEmailField = (email) => {
    if (!email) return msg("register.err.emailRequired", "กรุณากรอกอีเมล");
    if (!validateEmail(email)) return msg("register.err.emailInvalid", "รูปแบบอีเมลไม่ถูกต้อง");
    return null;
  };

  const validateBirthDateField = (birthDate) => {
    if (!birthDate) return msg("register.err.birthRequired", "กรุณาเลือกวันเกิด");
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
    if (age < 15) return msg("register.err.ageMin15", "ต้องมีอายุอย่างน้อย 15 ปี");
    if (age > 100) return msg("register.err.birthInvalid", "กรุณาเลือกวันเกิดให้ถูกต้อง");
    return null;
  };

  const validatePhoneNumberField = (phoneNumber) => {
    if (!phoneNumber) return msg("register.err.phoneRequired", "กรุณากรอกเบอร์โทรศัพท์");
    if (!validatePhoneNumber(phoneNumber)) return msg("register.err.phoneInvalid", "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก เริ่มต้นด้วย 0)");
    return null;
  };

  const validateUsernameField = (username) => {
    if (!username) return msg("register.err.usernameRequired", "กรุณากรอกชื่อผู้ใช้");
    if (username.length < 6) return msg("register.err.usernameMin6", "ชื่อผู้ใช้ต้องมีอย่างน้อย 6 ตัวอักษร");
    if (!/\w{6,20}$/.test(username)) return msg("register.err.usernameRule", "ชื่อผู้ใช้ต้อง 6–20 ตัว และใช้ได้เฉพาะ a-z A-Z 0-9 _");
    return null;
  };

  const validatePasswordField = (password) => {
    if (!password) return msg("register.err.passwordRequired", "กรุณากรอกรหัสผ่าน");
    if (password.length < 8) return msg("register.err.passwordMin8", "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (!validatePassword(password)) return msg("register.err.passwordComplex", "รหัสผ่านต้องประกอบด้วยตัวอักษร ตัวเลข และอักขระพิเศษ อย่างน้อย 1 ตัว");
    return null;
  };

  const validateConfirmPasswordField = (password, confirmPassword) => {
    if (!confirmPassword) return msg("register.err.confirmRequired", "กรุณายืนยันรหัสผ่าน");
    if (password !== confirmPassword) return msg("register.err.passwordMismatch", "รหัสผ่านไม่ตรงกัน");
    return null;
  };

  const validateRequiredField = (value, message) => (value ? null : message);

  const validatePostalCodeField = (postalCode) => {
    if (!postalCode) return msg("register.err.postalRequired", "กรุณากรอกรหัสไปรษณีย์");
    if (!validatePostalCode(postalCode)) return msg("register.err.postal5", "กรุณากรอกรหัสไปรษณีย์ให้ครบ 5 หลัก");
    return null;
  };

  const validateAddressTextField = (value, fieldLabel) => {
    if (!value) return msg("register.err.addressPick", `กรุณา${fieldLabel}`);
    if (!validateThaiText(value)) return msg("register.err.addressThaiOnly", "กรุณากรอกเป็นภาษาไทย");
    return null;
  };

  const validateAddressFreeTextField = (value, fieldLabel, { required = false } = {}) => {
    const v = (value ?? "").trim();
    if (required && !v) return msg("register.err.addressRequired", `กรุณากรอก${fieldLabel}`);
    if (!v) return null;
    if (v.length > 120) return msg("register.err.addressTooLong", `${fieldLabel} ยาวเกินไป`);
    if (!validateAddressFreeText(v)) return msg("register.err.addressChars", `${fieldLabel} กรอกได้เฉพาะ ไทย/อังกฤษ/ตัวเลข และสัญลักษณ์ . / - , ( ) #`);
    return null;
  };

  const addError = (errorsObj, field, validator) => {
    const error = validator();
    if (error) errorsObj[field] = error;
  };

  const validateStep1 = () => {
    const newErrors = {};
    addError(newErrors, "memberId", () => validateMemberIdField(memberForm.memberId));
    addError(newErrors, "prefixTh", () => validateRequiredField(memberForm.prefixTh, msg("register.err.prefixPick", "กรุณาเลือกคำนำหน้า")));
    addError(newErrors, "firstNameTh", () => validateNameField(memberForm.firstNameTh, msg("register.firstName", "ชื่อ"), validateThaiText, msg("lang.th", "ไทย")));
    addError(newErrors, "lastNameTh", () => validateNameField(memberForm.lastNameTh, msg("register.lastName", "นามสกุล"), validateThaiText, msg("lang.th", "ไทย")));
    addError(newErrors, "prefixEn", () => validateRequiredField(memberForm.prefixEn, msg("register.err.prefixPick", "กรุณาเลือกคำนำหน้า")));
    addError(newErrors, "firstNameEn", () => validateNameField(memberForm.firstNameEn, msg("register.firstName", "ชื่อ"), validateEnglishText, msg("lang.en", "อังกฤษ")));
    addError(newErrors, "lastNameEn", () => validateNameField(memberForm.lastNameEn, msg("register.lastName", "นามสกุล"), validateEnglishText, msg("lang.en", "อังกฤษ")));
    addError(newErrors, "email", () => validateEmailField(memberForm.email));
    addError(newErrors, "birthDate", () => validateBirthDateField(memberForm.birthDate));
    addError(newErrors, "phoneNumber", () => validatePhoneNumberField(memberForm.phoneNumber));
    addError(newErrors, "username", () => validateUsernameField(memberForm.username));
    addError(newErrors, "password", () => validatePasswordField(memberForm.password));
    addError(newErrors, "confirmPassword", () => validateConfirmPasswordField(memberForm.password, memberForm.confirmPassword));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    const houseErr = validateAddressFreeTextField(addressForm.houseNumber, msg("register.address.house", "ที่อยู่"), { required: true });
    if (houseErr) newErrors.houseNumber = houseErr;

    const soiErr = validateAddressFreeTextField(addressForm.soi, msg("register.address.soi", "ซอย"));
    if (soiErr) newErrors.soi = soiErr;

    const roadErr = validateAddressFreeTextField(addressForm.road, msg("register.address.road", "ถนน"));
    if (roadErr) newErrors.road = roadErr;

    const addressFields = [
      { name: "subDistrict", label: msg("register.address.pickSub", "เลือกตำบล/แขวง") },
      { name: "district", label: msg("register.address.pickDist", "เลือกอำเภอ/เขต") },
      { name: "province", label: msg("register.address.pickProv", "เลือกจังหวัด") },
    ];

    addressFields.forEach(({ name, label }) => {
      const error = validateAddressTextField(addressForm[name], label);
      if (error) newErrors[name] = error;
    });

    const postalError = validatePostalCodeField(addressForm.postalCode);
    if (postalError) newErrors.postalCode = postalError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: "" }));

  const PREFIX_MAP_TH_TO_EN = { นาย: "Mr.", นาง: "Mrs.", นางสาว: "Ms." };
  const PREFIX_MAP_EN_TO_TH = { "Mr.": "นาย", "Mrs.": "นาง", "Ms.": "นางสาว" };

  const handleMemberChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    if (name === "memberId") val = val.replaceAll(/\D/g, "").slice(0, 13);
    if (name === "phoneNumber") val = val.replaceAll(/\D/g, "").slice(0, 10);

    setMemberForm((prev) => {
      if (name === "prefixTh") {
        const en = PREFIX_MAP_TH_TO_EN[val] || "";
        return { ...prev, prefixTh: val, prefixEn: en };
      }
      if (name === "prefixEn") {
        const th = PREFIX_MAP_EN_TO_TH[val] || "";
        return { ...prev, prefixEn: val, prefixTh: th };
      }
      return { ...prev, [name]: val };
    });

    clearError(name);
    if (name === "prefixTh") clearError("prefixEn");
    if (name === "prefixEn") clearError("prefixTh");
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;

    if (["houseNumber", "soi", "road"].includes(name)) {
      const filtered = value.replace(/[^A-Za-z0-9\u0E00-\u0E7F\s./(),\-]/g, "");
      setAddressForm((prev) => ({ ...prev, [name]: filtered }));
      clearError(name);
      return;
    }

    if (name === "postalCode" && value.length > 5) return;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const clearGeoErrors = (fields) => {
    setErrors((prev) => {
      const updated = { ...prev };
      fields.forEach((field) => delete updated[field]);
      return updated;
    });
  };

  const handleProvinceSelect = (e) => {
    const value = e.target.value;
    geoData.setSelectedGeo({ provinceId: value, districtId: "", subDistrictId: "" });
    setAddressForm((prev) => ({ ...prev, province: "", district: "", subDistrict: "", postalCode: "" }));
    clearGeoErrors(["province", "district", "subDistrict", "postalCode"]);
    const provinceName = geoData.updateDistricts(value);
    if (provinceName) setAddressForm((prev) => ({ ...prev, province: provinceName }));
  };

  const handleDistrictSelect = (e) => {
    const value = e.target.value;
    geoData.setSelectedGeo((prev) => ({ ...prev, districtId: value, subDistrictId: "" }));
    setAddressForm((prev) => ({ ...prev, district: "", subDistrict: "", postalCode: "" }));
    clearGeoErrors(["district", "subDistrict", "postalCode"]);
    const districtName = geoData.updateSubDistricts(value);
    if (districtName) setAddressForm((prev) => ({ ...prev, district: districtName }));
  };

  const handleSubDistrictSelect = (e) => {
    const value = e.target.value;
    geoData.setSelectedGeo((prev) => ({ ...prev, subDistrictId: value }));
    setAddressForm((prev) => ({ ...prev, subDistrict: "", postalCode: "" }));
    clearGeoErrors(["subDistrict", "postalCode"]);
    const subDistrictData = geoData.getSubDistrictData(value);
    if (subDistrictData) setAddressForm((prev) => ({ ...prev, subDistrict: subDistrictData.name, postalCode: subDistrictData.zipCode }));
  };

  const handlePinChange = (type, index, value) => {
    const digit = value.replaceAll(/\D/g, "").slice(0, 1);
    setPinForm((prev) => {
      const arr = [...prev[type]];
      arr[index] = digit;
      return { ...prev, [type]: arr };
    });

    if (digit && index < 5) {
      const refs = type === "pin" ? pinRefs.current : confirmPinRefs.current;
      refs[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (type, index, e) => {
    if (e.key === "Backspace" && !pinForm[type][index] && index > 0) {
      const refs = type === "pin" ? pinRefs.current : confirmPinRefs.current;
      refs[index - 1]?.focus();
    }
  };

  const handleBackFromPin = () => {
    if (pinPhase === "confirm") {
      setPinPhase("set");
      setPinForm((prev) => ({ ...prev, confirmPin: ["", "", "", "", "", ""] }));
      pinRefs.current[0]?.focus();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handlePinSetSubmit = (e) => {
    e.preventDefault();
    const pin = pinForm.pin.join("");
    if (pin.length !== 6) {
      setPinError(msg("register.err.pin6", "กรุณากรอก PIN ให้ครบ 6 หลัก"));
      return;
    }
    setPinError("");
    setPinPhase("confirm");
    setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pin = pinForm.pin.join("");
    const confirmPin = pinForm.confirmPin.join("");

    if (confirmPin.length !== 6) {
      setPinError(msg("register.err.confirmPin6", "กรุณากรอก Confirm PIN ให้ครบ 6 หลัก"));
      return;
    }

    if (pin !== confirmPin) {
      setPinError(msg("register.err.pinMismatch", "PIN และ Confirm PIN ไม่ตรงกัน"));
      setPinForm({ pin: ["", "", "", "", "", ""], confirmPin: ["", "", "", "", "", ""] });
      setPinPhase("set");
      setTimeout(() => pinRefs.current[0]?.focus(), 150);
      return;
    }

    try {
      setSubmitting(true);
      await addMember({ ...memberForm, pin, ...addressForm });
      setShowSuccess(true);
    } catch (err) {
      setPinError(err?.response?.data?.message || msg("register.err.generic", "เกิดข้อผิดพลาด"));
    } finally {
      setSubmitting(false);
    }
  };

  const checkExistence = async (checkFn, errorField, errorMsg) => {
    try {
      const exists = await checkFn();
      if (exists) {
        setErrors((prev) => ({ ...prev, [errorField]: errorMsg }));
        return true;
      }
      return false;
    } catch (err) {
      if (err?.response?.status === 404) return false;
      setErrors((prev) => ({ ...prev, [errorField]: msg("register.err.checkFail", "ไม่สามารถตรวจสอบได้ กรุณาลองใหม่อีกครั้ง") }));
      return true;
    }
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;

    setCheckingId(true);
    try {
      const idExists = await checkExistence(() => getMemberById(memberForm.memberId), "memberId", msg("register.err.idUsed", "เลขบัตรประชาชนนี้ถูกใช้สมัครแล้ว"));
      if (idExists) return;

      const emailExists = await checkExistence(() => getMemberByEmail(memberForm.email), "email", msg("register.err.emailUsed", "อีเมลนี้ถูกใช้สมัครแล้ว"));
      if (emailExists) return;

      const usernameExists = await checkExistence(() => getMemberByUsername(memberForm.username), "username", msg("register.err.usernameUsed", "ชื่อผู้ใช้นี้ถูกใช้สมัครแล้ว"));
      if (usernameExists) return;

      setStep(2);
    } finally {
      setCheckingId(false);
    }
  };

  const handleStep2Next = () => {
    if (validateStep2()) {
      setPinPhase("set");
      setStep(3);
    }
  };

  const isDistrictDisabled = !geoData.selectedGeo.provinceId || geoData.districts.length === 0;
  const isSubDistrictDisabled = !geoData.selectedGeo.districtId || geoData.subDistricts.length === 0;

  const getTitle = () => {
    if (step === 2) return msg("register.titleAddress", "กรอกที่อยู่");
    if (step === 3) return pinPhase === "set" ? msg("register.titlePinSet", "ตั้งรหัส PIN") : msg("register.titlePinConfirm", "ยืนยันรหัส PIN");
    return msg("register.title", "สมัครสมาชิก");
  };

  return (
    <>
      {createPortal(
        <div className="lang-switch">
          <button type="button" className={`lang-btn ${i18n.language === "th" ? "active" : ""}`} onClick={() => i18n.changeLanguage("th")}>
            TH
          </button>
          <button type="button" className={`lang-btn ${i18n.language === "en" ? "active" : ""}`} onClick={() => i18n.changeLanguage("en")}>
            EN
          </button>
        </div>,
        document.body
      )}

      <div className={`register-page ${showSuccess ? "modal-open" : ""}`}>
        <div className="register-left" />
        <div className="register-right">
          <h1 className="register-title">{getTitle()}</h1>

          <div className="register-content">
            <div className="register-steps">
              <StepIndicator step={1} currentStep={step} t={t} />
              <div className="step-line" />
              <StepIndicator step={2} currentStep={step} t={t} />
              <div className="step-line" />
              <StepIndicator step={3} currentStep={step} t={t} />
            </div>

            <form className="register-form" onSubmit={step === 3 && pinPhase === "confirm" ? handleSubmit : (e) => e.preventDefault()}>
              {step === 1 && (
                <Step1Form
                  t={t}
                  i18n={i18n}
                  memberForm={memberForm}
                  errors={errors}
                  checkingId={checkingId}
                  onChange={handleMemberChange}
                  onNext={handleStep1Next}
                  onNavigate={() => navigate("/")}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  birthParts={birthParts}
                  onBirthPartChange={handleBirthPartChange}
                  monthLabels={monthLabels}
                  yearRange={yearRange}
                  daysInMonth={daysInMonth}
                />
              )}

              {step === 2 && (
                <Step2Form
                  t={t}
                  addressForm={addressForm}
                  errors={errors}
                  geoData={geoData}
                  isDistrictDisabled={isDistrictDisabled}
                  isSubDistrictDisabled={isSubDistrictDisabled}
                  onAddressChange={handleAddressChange}
                  onProvinceSelect={handleProvinceSelect}
                  onDistrictSelect={handleDistrictSelect}
                  onSubDistrictSelect={handleSubDistrictSelect}
                  onBack={() => setStep(1)}
                  onNext={handleStep2Next}
                />
              )}

              {step === 3 && (
                <Step3Form
                  t={t}
                  pinPhase={pinPhase}
                  pinForm={pinForm}
                  pinRefs={pinRefs}
                  confirmPinRefs={confirmPinRefs}
                  submitting={submitting}
                  onPinChange={handlePinChange}
                  onPinKeyDown={handlePinKeyDown}
                  onBack={handleBackFromPin}
                  onSetSubmit={handlePinSetSubmit}
                />
              )}
            </form>
          </div>
        </div>

        <Modal
          show={showSuccess}
          icon="✓"
          title={msg("register.successTitle", "สมัครการใช้งานสำเร็จ")}
          message={msg("register.successMsg", "ยินดีต้อนรับเข้าสู่ระบบ")}
          onClose={() => {
            setShowSuccess(false);
            navigate("/");
          }}
          buttonText={msg("register.goLogin", "เข้าสู่ระบบ")}
        />

        <Modal
          show={!!pinError}
          icon="⚠️"
          title={msg("register.errorTitle", "พบข้อผิดพลาด")}
          message={pinError}
          onClose={() => setPinError("")}
          buttonText={msg("modal.ok", "ตกลง")}
        />
      </div>
    </>
  );
}

const Step1Form = ({
  t,
  i18n,
  memberForm,
  errors,
  checkingId,
  onChange,
  onNext,
  onNavigate,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  birthParts,
  onBirthPartChange,
  monthLabels,
  yearRange,
  daysInMonth,
}) => (
  <>
    <FormGroup
      label={
        <>
          {t("register.memberId", { defaultValue: "เลขบัตรประชาชน" })} <span className="required">*</span>
        </>
      }
      htmlFor="memberId"
      error={errors.memberId}
      >
      <input id="memberId" name="memberId" type="text" maxLength={13} value={memberForm.memberId} onChange={onChange} className={errors.memberId ? "error" : ""} />
    </FormGroup>

    <div className="row">
      <FormGroup label={
        <>
          {t("register.prefixTh", { defaultValue: "คำนำหน้า (ไทย)" })} <span className="required">*</span>
        </>
      } htmlFor="prefixTh" error={errors.prefixTh}>
        <select id="prefixTh" name="prefixTh" value={memberForm.prefixTh} onChange={onChange} className={errors.prefixTh ? "error" : ""}>
          <option value="">{t("register.pick", { defaultValue: "เลือก" })}</option>
          <option value="นาย">{t("register.prefix.mrTh", { defaultValue: "นาย" })}</option>
          <option value="นาง">{t("register.prefix.mrsTh", { defaultValue: "นาง" })}</option>
          <option value="นางสาว">{t("register.prefix.msTh", { defaultValue: "นางสาว" })}</option>
        </select>
      </FormGroup>

      <FormGroup label={
        <>
          {t("register.firstNameTh", { defaultValue: "ชื่อ (ไทย)" })} <span className="required">*</span>
        </>
      } htmlFor="firstNameTh" error={errors.firstNameTh}>
        <input id="firstNameTh" name="firstNameTh" value={memberForm.firstNameTh} onChange={onChange} className={errors.firstNameTh ? "error" : ""} />
      </FormGroup>

      <FormGroup label={
        <>
          {t("register.lastNameTh", { defaultValue: "นามสกุล (ไทย)" })} <span className="required">*</span>
        </>
      } htmlFor="lastNameTh" error={errors.lastNameTh}>
        <input id="lastNameTh" name="lastNameTh" value={memberForm.lastNameTh} onChange={onChange} className={errors.lastNameTh ? "error" : ""} />
      </FormGroup>
    </div>

    <div className="row">
      <FormGroup label={
        <>
          {t("register.prefixEn", { defaultValue: "คำนำหน้า (อังกฤษ)" })} <span className="required">*</span>
        </>
      } htmlFor="prefixEn" error={errors.prefixEn}>
        <select id="prefixEn" name="prefixEn" value={memberForm.prefixEn} onChange={onChange} className={errors.prefixEn ? "error" : ""}>
          <option value="">{t("register.pickEn", { defaultValue: "Select" })}</option>
          <option value="Mr.">Mr.</option>
          <option value="Mrs.">Mrs.</option>
          <option value="Ms.">Ms.</option>
        </select>
      </FormGroup>

      <FormGroup label={
        <>
          {t("register.firstNameEn", { defaultValue: "ชื่อ (อังกฤษ)" })} <span className="required">*</span>
        </>
      } htmlFor="firstNameEn" error={errors.firstNameEn}>
        <input id="firstNameEn" name="firstNameEn" value={memberForm.firstNameEn} onChange={onChange} className={errors.firstNameEn ? "error" : ""} />
      </FormGroup>

      <FormGroup label={
        <>
          {t("register.lastNameEn", { defaultValue: "นามสกุล (อังกฤษ)" })} <span className="required">*</span>
        </>
      } htmlFor="lastNameEn" error={errors.lastNameEn}>
        <input id="lastNameEn" name="lastNameEn" value={memberForm.lastNameEn} onChange={onChange} className={errors.lastNameEn ? "error" : ""} />
      </FormGroup>
    </div>

    <FormGroup label={
      <>
        {t("register.email", { defaultValue: "อีเมล" })} <span className="required">*</span>
      </>
    } htmlFor="email" error={errors.email}>
      <input id="email" type="email" name="email" value={memberForm.email} onChange={onChange} className={errors.email ? "error" : ""} />
    </FormGroup>

    <div className="row">
      <FormGroup label={
        <>
          {t("register.birthDate", { defaultValue: "วันเกิด" })} <span className="required">*</span>
        </>
      } htmlFor="birthDate" error={errors.birthDate}>
        <div className="row" style={{ gap: 10 }}>
          <select value={birthParts.day} onChange={(e) => onBirthPartChange("day", e.target.value)} className={errors.birthDate ? "error" : ""}>
            <option value="">{t("register.day", { defaultValue: "วัน" })}</option>
            {Array.from({ length: daysInMonth(birthParts.year, birthParts.month) }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {d}
              </option>
            ))}
          </select>

          <select value={birthParts.month} onChange={(e) => onBirthPartChange("month", e.target.value)} className={errors.birthDate ? "error" : ""}>
            <option value="">{t("register.month", { defaultValue: "เดือน" })}</option>
            {monthLabels.map((label, idx) => (
              <option key={idx + 1} value={String(idx + 1)}>
                {label}
              </option>
            ))}
          </select>

          <select value={birthParts.year} onChange={(e) => onBirthPartChange("year", e.target.value)} className={errors.birthDate ? "error" : ""}>
            <option value="">{t("register.year", { defaultValue: "ปี" })}</option>
            {yearRange.map((y) => (
              <option key={y} value={String(y)}>
                {i18n.language === "th" ? y + 543 : y}
              </option>
            ))}
          </select>
        </div>
      </FormGroup>

      <FormGroup label={
        <>
          {t("register.phone", { defaultValue: "เบอร์โทรศัพท์" })} <span className="required">*</span>
        </>
      } htmlFor="phoneNumber" error={errors.phoneNumber}>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          maxLength={10}
          value={memberForm.phoneNumber}
          onChange={onChange}
          className={errors.phoneNumber ? "error" : ""}
          placeholder={t("register.phonePlaceholder", { defaultValue: "0812345678" })}
        />
      </FormGroup>
    </div>

    <FormGroup label={<>{t("register.username", { defaultValue: "ชื่อผู้ใช้" })} <span className="required">*</span></>} htmlFor="username" error={errors.username}>
      <input id="username" name="username" value={memberForm.username} onChange={onChange} className={errors.username ? "error" : ""} />
    </FormGroup>

    <FormGroup label={<>{t("register.password", { defaultValue: "รหัสผ่าน" })} <span className="required">*</span></>} htmlFor="password" error={errors.password}>
      <div className="password-field">
        <input id="password" type={showPassword ? "text" : "password"} name="password" value={memberForm.password} onChange={onChange} className={errors.password ? "error" : ""} />
        <button type="button" className="toggle-password" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "hide" : "show"}>
          {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>
    </FormGroup>

    <FormGroup label={<>{t("register.confirmPassword", { defaultValue: "ยืนยันรหัสผ่าน" })} <span className="required">*</span></>} htmlFor="confirmPassword" error={errors.confirmPassword}>
      <div className="password-field">
        <input
          id="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          name="confirmPassword"
          value={memberForm.confirmPassword}
          onChange={onChange}
          className={errors.confirmPassword ? "error" : ""}
        />
        <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? "hide" : "show"}>
          {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>
    </FormGroup>

    <div className="form-actions">
      <div className="login-option">
        <button type="button" className="already" onClick={onNavigate}>
          {t("register.alreadyHaveAccount", { defaultValue: "มีบัญชีอยู่แล้ว ?" })}
        </button>
      </div>

      <button type="button" className="next-btn" disabled={checkingId} onClick={onNext}>
        {checkingId ? t("register.checking", { defaultValue: "กำลังตรวจสอบ..." }) : t("register.next", { defaultValue: "ถัดไป" })}
      </button>
    </div>
  </>
);

Step1Form.propTypes = {
  t: PropTypes.func.isRequired,
  i18n: PropTypes.object.isRequired,
  memberForm: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  checkingId: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  showPassword: PropTypes.bool.isRequired,
  setShowPassword: PropTypes.func.isRequired,
  showConfirmPassword: PropTypes.bool.isRequired,
  setShowConfirmPassword: PropTypes.func.isRequired,
  birthParts: PropTypes.object.isRequired,
  onBirthPartChange: PropTypes.func.isRequired,
  monthLabels: PropTypes.array.isRequired,
  yearRange: PropTypes.array.isRequired,
  daysInMonth: PropTypes.func.isRequired,
};

const Step2Form = ({
  t,
  addressForm,
  errors,
  geoData,
  isDistrictDisabled,
  isSubDistrictDisabled,
  onAddressChange,
  onProvinceSelect,
  onDistrictSelect,
  onSubDistrictSelect,
  onBack,
  onNext,
}) => (
  <>
    <FormGroup label={<>{t("register.address.house", { defaultValue: "ที่อยู่" })} <span className="required">*</span></>} htmlFor="houseNumber" error={errors.houseNumber}>
      <input
        id="houseNumber"
        name="houseNumber"
        value={addressForm.houseNumber}
        onChange={onAddressChange}
        className={errors.houseNumber ? "error" : ""}
        placeholder={t("register.address.housePlaceholder", { defaultValue: "บ้านเลขที่ หมู่ หมู่บ้าน" })}
      />
    </FormGroup>

    <div className="row">
      <FormGroup label={t("register.address.soi", { defaultValue: "ซอย" })} htmlFor="soi" error={errors.soi}>
        <input id="soi" name="soi" value={addressForm.soi} onChange={onAddressChange} className={errors.soi ? "error" : ""} />
      </FormGroup>

      <FormGroup label={t("register.address.road", { defaultValue: "ถนน" })} htmlFor="road" error={errors.road}>
        <input id="road" name="road" value={addressForm.road} onChange={onAddressChange} className={errors.road ? "error" : ""} />
      </FormGroup>
    </div>

    {geoData.error && (
      <p className="err-text" style={{ marginTop: 4 }}>
        {geoData.error}
      </p>
    )}

    <div className="row">
      <FormGroup label={<>{t("register.address.province", { defaultValue: "จังหวัด" })} <span className="required">*</span></>} htmlFor="province" error={errors.province}>
        <select
          id="province"
          value={geoData.selectedGeo.provinceId}
          onChange={onProvinceSelect}
          disabled={geoData.loading || !!geoData.error || geoData.provinces.length === 0}
          className={errors.province ? "error" : ""}
        >
          <option value="">{t("register.address.pickProv", { defaultValue: "เลือกจังหวัด" })}</option>
          {geoData.provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {makeLabel(p)}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={<>{t("register.address.district", { defaultValue: "อำเภอ/เขต" })} <span className="required">*</span></>} htmlFor="district" error={errors.district}>
        <select id="district" value={geoData.selectedGeo.districtId} onChange={onDistrictSelect} disabled={isDistrictDisabled} className={errors.district ? "error" : ""}>
          <option value="">{t("register.address.pickDist", { defaultValue: "เลือกอำเภอ/เขต" })}</option>
          {geoData.districts.map((d) => (
            <option key={d.id} value={d.id}>
              {makeLabel(d)}
            </option>
          ))}
        </select>
      </FormGroup>
    </div>

    <div className="row">
      <FormGroup label={<>{t("register.address.subDistrict", { defaultValue: "ตำบล/แขวง" })} <span className="required">*</span></>} htmlFor="subDistrict" error={errors.subDistrict}>
        <select
          id="subDistrict"
          value={geoData.selectedGeo.subDistrictId}
          onChange={onSubDistrictSelect}
          disabled={isSubDistrictDisabled}
          className={errors.subDistrict ? "error" : ""}
        >
          <option value="">{t("register.address.pickSub", { defaultValue: "เลือกตำบล/แขวง" })}</option>
          {geoData.subDistricts.map((s) => (
            <option key={s.id} value={s.id}>
              {makeLabel(s)}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={<>{t("register.address.postal", { defaultValue: "รหัสไปรษณีย์" })} <span className="required">*</span></>} htmlFor="postalCode" error={errors.postalCode}>
        <input
          id="postalCode"
          name="postalCode"
          type="text"
          maxLength={5}
          value={addressForm.postalCode}
          readOnly
          className={errors.postalCode ? "error" : ""}
          placeholder={t("register.address.postalPlaceholder", { defaultValue: "รหัสไปรษณีย์" })}
        />
      </FormGroup>
    </div>

    <div className="form-actions">
      <button type="button" className="back-btn-under-lang" onClick={onBack}>
        {t("register.back", { defaultValue: "ย้อนกลับ" })}
      </button>
      <button type="button" className="next-btn" onClick={onNext}>
        {t("register.next", { defaultValue: "ถัดไป" })}
      </button>
    </div>
  </>
);

Step2Form.propTypes = {
  t: PropTypes.func.isRequired,
  addressForm: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  geoData: PropTypes.object.isRequired,
  isDistrictDisabled: PropTypes.bool.isRequired,
  isSubDistrictDisabled: PropTypes.bool.isRequired,
  onAddressChange: PropTypes.func.isRequired,
  onProvinceSelect: PropTypes.func.isRequired,
  onDistrictSelect: PropTypes.func.isRequired,
  onSubDistrictSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

const Step3Form = ({ t, pinPhase, pinForm, pinRefs, confirmPinRefs, submitting, onPinChange, onPinKeyDown, onBack, onSetSubmit }) => (
  <div className="pin-section">
    {pinPhase === "set" ? (
      <>
        <h2 className="pin-title">{t("register.pinSetTitle", { defaultValue: "ตั้งรหัส PIN" })}</h2>
        <p className="pin-subtitle">{t("register.pinSetSubtitle", { defaultValue: "กรุณากรอกตัวเลข 6 หลัก เพื่อตั้งค่ารหัส PIN" })}</p>
        <PinInput values={pinForm.pin} refs={pinRefs} type="pin" onChange={onPinChange} onKeyDown={onPinKeyDown} t={t} />
        <div className="form-actions pin-actions">
          <button type="button" className="back-btn-under-lang" onClick={onBack}>
            {t("register.back", { defaultValue: "ย้อนกลับ" })}
          </button>
          <button type="button" className="next-btn" onClick={onSetSubmit}>
            {t("register.confirm", { defaultValue: "ยืนยัน" })}
          </button>
        </div>
      </>
    ) : (
      <>
        <h2 className="pin-title">{t("register.pinConfirmTitle", { defaultValue: "ยืนยันรหัส PIN" })}</h2>
        <p className="pin-subtitle">{t("register.pinConfirmSubtitle", { defaultValue: "กรุณากรอกตัวเลข 6 หลัก อีกครั้ง เพื่อยืนยันรหัส PIN" })}</p>
        <PinInput values={pinForm.confirmPin} refs={confirmPinRefs} type="confirmPin" onChange={onPinChange} onKeyDown={onPinKeyDown} t={t} />
        <div className="form-actions pin-actions">
          <button type="button" className="back-btn-under-lang" onClick={onBack}>
            {t("register.back", { defaultValue: "ย้อนกลับ" })}
          </button>
          <button type="submit" className="next-btn" disabled={submitting}>
            {submitting ? t("register.submitting", { defaultValue: "กำลังสมัคร..." }) : t("register.confirm", { defaultValue: "ยืนยัน" })}
          </button>
        </div>
      </>
    )}
  </div>
);

Step3Form.propTypes = {
  t: PropTypes.func.isRequired,
  pinPhase: PropTypes.oneOf(["set", "confirm"]).isRequired,
  pinForm: PropTypes.object.isRequired,
  pinRefs: PropTypes.object.isRequired,
  confirmPinRefs: PropTypes.object.isRequired,
  submitting: PropTypes.bool.isRequired,
  onPinChange: PropTypes.func.isRequired,
  onPinKeyDown: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onSetSubmit: PropTypes.func.isRequired,
};
