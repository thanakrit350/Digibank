import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addMember, getMemberById, getMemberByEmail, getMemberByUsername } from "../../lib/api";
import "../../styles/register.css";
import PropTypes from "prop-types";

const validateThaiId = (id) => {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  let weight = 13;
  for (let i = 0; i < 12; i++) {
    sum += (id.charAt(i) - "0") * weight--;
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === (id.charAt(12) - "0");
};

const validateThaiText = (text) => /^[\u0E00-\u0E7F\s]+$/.test(text);
const validateEnglishText = (text) => /^[A-Za-z\s]+$/.test(text);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phone) => /^0\d{9}$/.test(phone);
const validatePostalCode = (code) => /^\d{5}$/.test(code);

// ========== Field Validators ==========
const validateMemberIdField = (memberId) => {
  if (!memberId) return "กรุณากรอกเลขบัตรประชาชน";
  if (!/^\d{13}$/.test(memberId)) return "กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก";
  if (!validateThaiId(memberId)) return "เลขบัตรประชาชนไม่ถูกต้อง";
  return null;
};

const validateNameField = (value, fieldName, validator, lang) => {
  if (!value) return `กรุณากรอก${fieldName} (${lang})`;
  if (!validator(value)) return `กรุณากรอก${fieldName}เป็นภาษา${lang}เท่านั้น`;
  return null;
};

const validateEmailField = (email) => {
  if (!email) return "กรุณากรอกอีเมล";
  if (!validateEmail(email)) return "รูปแบบอีเมลไม่ถูกต้อง";
  return null;
};

const validateBirthDateField = (birthDate) => {
  if (!birthDate) return "กรุณาเลือกวันเกิด";
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  if (age < 15) return "ต้องมีอายุอย่างน้อย 15 ปี";
  if (age > 100) return "กรุณาเลือกวันเกิดให้ถูกต้อง";
  return null;
};

const validatePhoneNumberField = (phoneNumber) => {
  if (!phoneNumber) return "กรุณากรอกเบอร์โทรศัพท์";
  if (!validatePhoneNumber(phoneNumber)) return "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก เริ่มต้นด้วย 0)";
  return null;
};

const validateUsernameField = (username) => {
  if (!username) return "กรุณากรอกชื่อผู้ใช้";
  if (username.length < 4) return "ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร";
  if (!/\w{6,20}$/.test(username)) {
    return "ชื่อผู้ใช้ต้อง 6–20 ตัว และใช้ได้เฉพาะ a-z A-Z 0-9 _";
  }
  return null;
};

const validatePasswordField = (password) => {
  if (!password) return "กรุณากรอกรหัสผ่าน";
  if (password.length < 8) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  return null;
};

const validateConfirmPasswordField = (password, confirmPassword) => {
  if (!confirmPassword) return "กรุณายืนยันรหัสผ่าน";
  if (password !== confirmPassword) return "รหัสผ่านไม่ตรงกัน";
  return null;
};

const validateRequiredField = (value, message) => {
  if (value) {
    return null;
  }
  return message;
};

const validatePostalCodeField = (postalCode) => {
  if (!postalCode) return "กรุณากรอกรหัสไปรษณีย์";
  if (!validatePostalCode(postalCode)) return "กรุณากรอกรหัสไปรษณีย์ให้ครบ 5 หลัก";
  return null;
};

const validateAddressTextField = (value, fieldLabel) => {
  if (!value) return `กรุณา${fieldLabel}`;
  if (!validateThaiText(value)) return "กรุณากรอกเป็นภาษาไทย";
  return null;
};

const makeLabel = (item) => {
  const th = item?.name_th || "";
  const en = item?.name_en || "";
  return (th && en) ? `${th} — ${en}` : (th || en || String(item?.id ?? ""));
};

const sortByThaiName = (data) => 
  data.slice().sort((a, b) => (a.name_th || "").localeCompare(b.name_th || "", "th"));

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

const StepIndicator = ({ step, currentStep }) => {
  const labels = ["กรอกข้อมูลส่วนตัว", "กรอกที่อยู่", "ตั้งรหัส PIN"];
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
};

const PinInput = ({ values, refs, type, onChange, onKeyDown }) => (
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
        aria-label={`${type === "pin" ? "PIN" : "Confirm PIN"} digit ${i + 1}`}
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
};

const Modal = ({ show, icon, title, message, onClose, buttonText = "ตกลง" }) => {
  if (!show) return null;
  
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className={icon === "✓" ? "success-icon" : "error-icon"}>{icon}</div>
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="next-btn" onClick={onClose}>{buttonText}</button>
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
  buttonText: PropTypes.string,
};

const useGeoData = () => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGeo, setSelectedGeo] = useState({
    provinceId: "",
    districtId: "",
    subDistrictId: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    const loadProvinces = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          "https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province_with_district_and_sub_district.json",
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setProvinces(sortByThaiName(data));
      } catch (e) {
        if (e.name !== "AbortError") {
          setError("ไม่สามารถโหลดข้อมูลจังหวัดได้ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setLoading(false);
      }
    };
    loadProvinces();
    return () => controller.abort();
  }, []);

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

// ========== Main Component ==========
export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pinPhase, setPinPhase] = useState("set");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [errors, setErrors] = useState({});
  const [pinError, setPinError] = useState("");

  const [memberForm, setMemberForm] = useState({
    memberId: "", prefixTh: "", firstNameTh: "", lastNameTh: "",
    prefixEn: "", firstNameEn: "", lastNameEn: "", email: "",
    birthDate: "", phoneNumber: "", username: "", password: "", confirmPassword: "",
  });

  const [addressForm, setAddressForm] = useState({
    houseNumber: "", soi: "", road: "", subDistrict: "",
    district: "", province: "", postalCode: "",
  });

  const [pinForm, setPinForm] = useState({
    pin: ["", "", "", "", "", ""],
    confirmPin: ["", "", "", "", "", ""],
  });

  const geoData = useGeoData();
  const pinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

  // ========== Validation ==========
  const addError = (errorsObj, field, validator) => {
    const error = validator();
    if (error) errorsObj[field] = error;
  };

  const validateStep1 = () => {
    const newErrors = {};
    addError(newErrors, "memberId", () => validateMemberIdField(memberForm.memberId));
    addError(newErrors, "prefixTh", () => validateRequiredField(memberForm.prefixTh, "กรุณาเลือกคำนำหน้า"));
    addError(newErrors, "firstNameTh", () => validateNameField(memberForm.firstNameTh, "ชื่อ", validateThaiText, "ไทย"));
    addError(newErrors, "lastNameTh", () => validateNameField(memberForm.lastNameTh, "นามสกุล", validateThaiText, "ไทย"));
    addError(newErrors, "prefixEn", () => validateRequiredField(memberForm.prefixEn, "กรุณาเลือกคำนำหน้า"));
    addError(newErrors, "firstNameEn", () => validateNameField(memberForm.firstNameEn, "ชื่อ", validateEnglishText, "อังกฤษ"));
    addError(newErrors, "lastNameEn", () => validateNameField(memberForm.lastNameEn, "นามสกุล", validateEnglishText, "อังกฤษ"));
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
    
    if (!addressForm.houseNumber) newErrors.houseNumber = "กรุณากรอกที่อยู่";
    
    const addressFields = [
      { name: "subDistrict", label: "เลือกตำบล/แขวง" },
      { name: "district", label: "เลือกอำเภอ/เขต" },
      { name: "province", label: "เลือกจังหวัด" },
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

  // ========== Form Handlers ==========
  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: "" }));

  const handleMemberChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "memberId") val = val.replaceAll(/\D/g, "").slice(0, 13);
    if (name === "phoneNumber") val = val.replaceAll(/\D/g, "").slice(0, 10);
    setMemberForm((prev) => ({ ...prev, [name]: val }));
    clearError(name);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    if (name === "postalCode" && value.length > 5) return;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const clearGeoErrors = (fields) => {
    setErrors((prev) => {
      const updated = { ...prev };
      fields.forEach(field => delete updated[field]);
      return updated;
    });
  };

  const handleProvinceSelect = (e) => {
    const value = e.target.value;
    geoData.setSelectedGeo({ provinceId: value, districtId: "", subDistrictId: "" });
    setAddressForm((prev) => ({ ...prev, province: "", district: "", subDistrict: "", postalCode: "" }));
    clearGeoErrors(["province", "district", "subDistrict", "postalCode"]);

    const provinceName = geoData.updateDistricts(value);
    if (provinceName) {
      setAddressForm((prev) => ({ ...prev, province: provinceName }));
    }
  };

  const handleDistrictSelect = (e) => {
    const value = e.target.value;
    geoData.setSelectedGeo((prev) => ({ ...prev, districtId: value, subDistrictId: "" }));
    setAddressForm((prev) => ({ ...prev, district: "", subDistrict: "", postalCode: "" }));
    clearGeoErrors(["district", "subDistrict", "postalCode"]);

    const districtName = geoData.updateSubDistricts(value);
    if (districtName) {
      setAddressForm((prev) => ({ ...prev, district: districtName }));
    }
  };

  const handleSubDistrictSelect = (e) => {
    const value = e.target.value;
    geoData.setSelectedGeo((prev) => ({ ...prev, subDistrictId: value }));
    setAddressForm((prev) => ({ ...prev, subDistrict: "", postalCode: "" }));
    clearGeoErrors(["subDistrict", "postalCode"]);

    const subDistrictData = geoData.getSubDistrictData(value);
    if (subDistrictData) {
      setAddressForm((prev) => ({
        ...prev,
        subDistrict: subDistrictData.name,
        postalCode: subDistrictData.zipCode,
      }));
    }
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
      setPinError("กรุณากรอก PIN ให้ครบ 6 หลัก");
      return;
    }
    setPinPhase("confirm");
    setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pin = pinForm.pin.join("");
    const confirmPin = pinForm.confirmPin.join("");

    if (confirmPin.length !== 6) {
      setPinError("กรุณากรอก Confirm PIN ให้ครบ 6 หลัก");
      return;
    }

    if (pin !== confirmPin) {
      setPinError("PIN และ Confirm PIN ไม่ตรงกัน");
      setPinForm({ pin: ["", "", "", "", "", ""], confirmPin: ["", "", "", "", "", ""] });
      setTimeout(() => pinRefs.current[0]?.focus(), 150);
      return;
    }

    try {
      setSubmitting(true);
      await addMember({ ...memberForm, pin, ...addressForm });
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setPinError(err?.response?.data?.message || "เกิดข้อผิดพลาด");
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
      console.error(err);
      setErrors((prev) => ({ ...prev, [errorField]: `ไม่สามารถตรวจสอบได้ กรุณาลองใหม่อีกครั้ง` }));
      return true;
    }
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;

    setCheckingId(true);
    try {
      const idExists = await checkExistence(
        () => getMemberById(memberForm.memberId),
        "memberId",
        "เลขบัตรประชาชนนี้ถูกใช้สมัครแล้ว"
      );
      if (idExists) return;

      const emailExists = await checkExistence(
        () => getMemberByEmail(memberForm.email),
        "email",
        "อีเมลนี้ถูกใช้สมัครแล้ว"
      );
      if (emailExists) return;
      const usernameExists = await checkExistence(
        () => getMemberByUsername(memberForm.username),
        "username",
        "ชื่อผู้ใช้นี้ถูกใช้สมัครแล้ว"
      );
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
    if (step === 2) return "กรอกที่อยู่";
    if (step === 3) return pinPhase === "set" ? "ตั้งรหัส PIN" : "ยืนยันรหัส PIN";
    return "สมัครสมาชิก";
  };

  return (
    <div className={`register-page ${showSuccess ? "modal-open" : ""}`}>
      <div className="register-left" />
      <div className="register-right">
        <h1 className="register-title">{getTitle()}</h1>

        <div className="register-content">
          <div className="register-steps">
            <StepIndicator step={1} currentStep={step} />
            <div className="step-line" />
            <StepIndicator step={2} currentStep={step} />
            <div className="step-line" />
            <StepIndicator step={3} currentStep={step} />
          </div>

          <form
            className="register-form"
            onSubmit={step === 3 && pinPhase === "confirm" ? handleSubmit : (e) => e.preventDefault()}
          >
            {step === 1 && (
              <Step1Form
                memberForm={memberForm}
                errors={errors}
                checkingId={checkingId}
                onChange={handleMemberChange}
                onNext={handleStep1Next}
                onNavigate={() => navigate("/")}
              />
            )}

            {step === 2 && (
              <Step2Form
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
        title="สมัครการใช้งานสำเร็จ"
        message="ยินดีต้อนรับเข้าสู่ระบบ"
        onClose={() => {
          setShowSuccess(false);
          navigate("/");
        }}
        buttonText="เข้าสู่ระบบ"
      />

      <Modal
        show={!!pinError}
        icon="⚠️"
        title="พบข้อผิดพลาด"
        message={pinError}
        onClose={() => setPinError("")}
      />
    </div>
  );
}

const Step1Form = ({ memberForm, errors, checkingId, onChange, onNext, onNavigate }) => (
  <>
    <FormGroup label="เลขบัตรประชาชน" htmlFor="memberId" error={errors.memberId}>
      <input
        id="memberId" name="memberId" type="text" maxLength={13}
        value={memberForm.memberId} onChange={onChange}
        className={errors.memberId ? "error" : ""}
      />
    </FormGroup>

    <div className="row">
      <FormGroup label="คำนำหน้า (ไทย)" htmlFor="prefixTh" error={errors.prefixTh}>
        <select
          id="prefixTh" name="prefixTh" value={memberForm.prefixTh}
          onChange={onChange} className={errors.prefixTh ? "error" : ""}
        >
          <option value="">เลือก</option>
          <option value="นาย">นาย</option>
          <option value="นาง">นาง</option>
          <option value="นางสาว">นางสาว</option>
        </select>
      </FormGroup>
      <FormGroup label="ชื่อ (ไทย)" htmlFor="firstNameTh" error={errors.firstNameTh}>
        <input
          id="firstNameTh" name="firstNameTh" value={memberForm.firstNameTh}
          onChange={onChange} className={errors.firstNameTh ? "error" : ""}
        />
      </FormGroup>
      <FormGroup label="นามสกุล (ไทย)" htmlFor="lastNameTh" error={errors.lastNameTh}>
        <input
          id="lastNameTh" name="lastNameTh" value={memberForm.lastNameTh}
          onChange={onChange} className={errors.lastNameTh ? "error" : ""}
        />
      </FormGroup>
    </div>

    <div className="row">
      <FormGroup label="คำนำหน้า (อังกฤษ)" htmlFor="prefixEn" error={errors.prefixEn}>
        <select
          id="prefixEn" name="prefixEn" value={memberForm.prefixEn}
          onChange={onChange} className={errors.prefixEn ? "error" : ""}
        >
          <option value="">Select</option>
          <option value="Mr.">Mr.</option>
          <option value="Mrs.">Mrs.</option>
          <option value="Ms.">Ms.</option>
        </select>
      </FormGroup>
      <FormGroup label="ชื่อ (อังกฤษ)" htmlFor="firstNameEn" error={errors.firstNameEn}>
        <input
          id="firstNameEn" name="firstNameEn" value={memberForm.firstNameEn}
          onChange={onChange} className={errors.firstNameEn ? "error" : ""}
        />
      </FormGroup>
      <FormGroup label="นามสกุล (อังกฤษ)" htmlFor="lastNameEn" error={errors.lastNameEn}>
        <input
          id="lastNameEn" name="lastNameEn" value={memberForm.lastNameEn}
          onChange={onChange} className={errors.lastNameEn ? "error" : ""}
        />
      </FormGroup>
    </div>

    <FormGroup label="อีเมล" htmlFor="email" error={errors.email}>
      <input
        id="email" type="email" name="email" value={memberForm.email}
        onChange={onChange} className={errors.email ? "error" : ""}
      />
    </FormGroup>

    <div className="row">
      <FormGroup label="วันเกิด" htmlFor="birthDate" error={errors.birthDate}>
        <input
          id="birthDate" type="date" name="birthDate" value={memberForm.birthDate}
          onChange={onChange} className={errors.birthDate ? "error" : ""}
        />
      </FormGroup>
      <FormGroup label="เบอร์โทรศัพท์" htmlFor="phoneNumber" error={errors.phoneNumber}>
        <input
          id="phoneNumber" name="phoneNumber" type="tel" maxLength={10}
          value={memberForm.phoneNumber} onChange={onChange}
          className={errors.phoneNumber ? "error" : ""} placeholder="0812345678"
        />
      </FormGroup>
    </div>

    <FormGroup label="ชื่อผู้ใช้" htmlFor="username" error={errors.username}>
      <input
        id="username" name="username" value={memberForm.username}
        onChange={onChange} className={errors.username ? "error" : ""}
      />
    </FormGroup>

    <FormGroup label="รหัสผ่าน" htmlFor="password" error={errors.password}>
      <input
        id="password" type="password" name="password" value={memberForm.password}
        onChange={onChange} className={errors.password ? "error" : ""}
      />
    </FormGroup>

    <FormGroup label="ยืนยันรหัสผ่าน" htmlFor="confirmPassword" error={errors.confirmPassword}>
      <input
        id="confirmPassword" type="password" name="confirmPassword"
        value={memberForm.confirmPassword} onChange={onChange}
        className={errors.confirmPassword ? "error" : ""}
      />
    </FormGroup>

    <div className="form-actions">
      <div className="login-option">
        <button
          type="button"
          className="already"
          onClick={onNavigate}
        >
          มีบัญชีอยู่แล้ว ?
        </button>
      </div>
      <button type="button" className="next-btn" disabled={checkingId} onClick={onNext}>
        {checkingId ? "กำลังตรวจสอบ..." : "ถัดไป"}
      </button>
    </div>
  </>
);
Step1Form.propTypes = {
  memberForm: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  checkingId: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

const Step2Form = ({
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
    <FormGroup label="ที่อยู่" htmlFor="houseNumber" error={errors.houseNumber}>
      <input
        id="houseNumber" name="houseNumber" value={addressForm.houseNumber}
        onChange={onAddressChange} className={errors.houseNumber ? "error" : ""}
        placeholder="บ้านเลขที่ หมู่ หมู่บ้าน"
      />
    </FormGroup>

    <div className="row">
      <FormGroup label="ซอย" htmlFor="soi">
        <input id="soi" name="soi" value={addressForm.soi} onChange={onAddressChange} />
      </FormGroup>
      <FormGroup label="ถนน" htmlFor="road">
        <input id="road" name="road" value={addressForm.road} onChange={onAddressChange} />
      </FormGroup>
    </div>

    {geoData.error && <p className="err-text" style={{ marginTop: 4 }}>{geoData.error}</p>}

    <div className="row">
      <FormGroup label="จังหวัด" htmlFor="province" error={errors.province}>
        <select
          id="province" value={geoData.selectedGeo.provinceId} onChange={onProvinceSelect}
          disabled={geoData.loading || !!geoData.error || geoData.provinces.length === 0}
          className={errors.province ? "error" : ""}
        >
          <option value="">เลือกจังหวัด</option>
          {geoData.provinces.map((p) => (
            <option key={p.id} value={p.id}>{makeLabel(p)}</option>
          ))}
        </select>
      </FormGroup>
      <FormGroup label="อำเภอ/เขต" htmlFor="district" error={errors.district}>
        <select
          id="district" value={geoData.selectedGeo.districtId} onChange={onDistrictSelect}
          disabled={isDistrictDisabled} className={errors.district ? "error" : ""}
        >
          <option value="">เลือกอำเภอ/เขต</option>
          {geoData.districts.map((d) => (
            <option key={d.id} value={d.id}>{makeLabel(d)}</option>
          ))}
        </select>
      </FormGroup>
    </div>

    <div className="row">
      <FormGroup label="ตำบล/แขวง" htmlFor="subDistrict" error={errors.subDistrict}>
        <select
          id="subDistrict" value={geoData.selectedGeo.subDistrictId} onChange={onSubDistrictSelect}
          disabled={isSubDistrictDisabled} className={errors.subDistrict ? "error" : ""}
        >
          <option value="">เลือกตำบล/แขวง</option>
          {geoData.subDistricts.map((s) => (
            <option key={s.id} value={s.id}>{makeLabel(s)}</option>
          ))}
        </select>
      </FormGroup>
      <FormGroup label="รหัสไปรษณีย์" htmlFor="postalCode" error={errors.postalCode}>
        <input
          id="postalCode" name="postalCode" type="text" maxLength={5}
          value={addressForm.postalCode} readOnly
          className={errors.postalCode ? "error" : ""} placeholder="รหัสไปรษณีย์"
        />
      </FormGroup>
    </div>

    <div className="form-actions">
      <button type="button" className="back-btn" onClick={onBack}>ย้อนกลับ</button>
      <button type="button" className="next-btn" onClick={onNext}>ถัดไป</button>
    </div>
  </>
);
Step2Form.propTypes = {
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

const Step3Form = ({
  pinPhase,
  pinForm,
  pinRefs,
  confirmPinRefs,
  submitting,
  onPinChange,
  onPinKeyDown,
  onBack,
  onSetSubmit,
}) => (
  <div className="pin-section">
    {pinPhase === "set" ? (
      <>
        <h2 className="pin-title">ตั้งรหัส PIN</h2>
        <p className="pin-subtitle">กรุณากรอกตัวเลข 6 หลัก เพื่อตั้งค่ารหัส PIN</p>
        <PinInput
          values={pinForm.pin}
          refs={pinRefs}
          type="pin"
          onChange={onPinChange}
          onKeyDown={onPinKeyDown}
        />
        <div className="form-actions pin-actions">
          <button type="button" className="back-btn" onClick={onBack}>ย้อนกลับ</button>
          <button type="button" className="next-btn" onClick={onSetSubmit}>ยืนยัน</button>
        </div>
      </>
    ) : (
      <>
        <h2 className="pin-title">ยืนยันรหัส PIN</h2>
        <p className="pin-subtitle">กรุณากรอกตัวเลข 6 หลัก อีกครั้ง เพื่อยืนยันรหัส PIN</p>
        <PinInput
          values={pinForm.confirmPin}
          refs={confirmPinRefs}
          type="confirmPin"
          onChange={onPinChange}
          onKeyDown={onPinKeyDown}
        />
        <div className="form-actions pin-actions">
          <button type="button" className="back-btn" onClick={onBack}>ย้อนกลับ</button>
          <button type="submit" className="next-btn" disabled={submitting}>
            {submitting ? "กำลังสมัคร..." : "ยืนยัน"}
          </button>
        </div>
      </>
    )}
  </div>
)
Step3Form.propTypes = {
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