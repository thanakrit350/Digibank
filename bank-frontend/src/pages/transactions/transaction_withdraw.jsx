import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../../styles/transaction.css";
import "../../styles/slip.css";
import { getAccountsByMember, withdraw } from "../../lib/api";

function TransactionSlip({ slip, onClose }) {
  if (!slip) return null;

  const toTimeValue = (raw) => {
    if (!raw) return new Date();
    if (Array.isArray(raw)) {
      const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
      return new Date(y, m - 1, d, hh, mm, ss);
    }
    return new Date(raw);
  };

  const dt = toTimeValue(slip.transactionDate);

  const getTypeText = (type) => {
    if (type === "deposit") return "ฝากเงิน";
    if (type === "withdraw") return "ถอนเงิน";
    if (type === "transfer") return "โอนเงิน";
    if (type === "receive") return "รับเงิน";
    return type || "-";
  };

  return (
    <>
      <div className="success-icon">✓</div>
      <h2>ถอนเงินสำเร็จ</h2>

      <div className="slip-card">
        <h3 className="slip-title">สลิปยืนยันการถอนเงิน</h3>

        <div className="slip-row">
          <span className="slip-label">รหัสอ้างอิง</span>
          <span className="slip-value">{slip.transientId}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">ประเภทธุรกรรม</span>
          <span className="slip-value">{getTypeText(slip.type)}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">จำนวนเงินที่ถอน</span>
          <span className="slip-value">
            {Math.abs(slip.amount || 0).toLocaleString("th-TH", {
              minimumFractionDigits: 2,
            })}{" "}
            ฿
          </span>
        </div>

        <div className="slip-row">
          <span className="slip-label">จากบัญชี</span>
          <span className="slip-value">{slip.fromAccount || "-"}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">วันเวลา</span>
          <span className="slip-value">
            {dt.toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>

        {slip.account && (
          <div className="slip-row">
            <span className="slip-label">ยอดคงเหลือหลังทำรายการ</span>
            <span className="slip-value">
              {slip.account.balance?.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
              })}{" "}
              ฿
            </span>
          </div>
        )}
      </div>

      <button
        className="next-btn"
        type="button"
        onClick={onClose}
        style={{ marginTop: 16 }}
      >
        ปิด
      </button>
    </>
  );
}

TransactionSlip.propTypes = {
  slip: PropTypes.shape({
    transientId: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]).isRequired,
    type: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    transactionDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
      PropTypes.array, 
    ]).isRequired,
    fromAccount: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    account: PropTypes.shape({
      balance: PropTypes.number,
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default function Withdraw() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState("form");
  const [confirmAt, setConfirmAt] = useState(null);

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");
  const [slip, setSlip] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const storedMember = localStorage.getItem("member");
        if (!storedMember) {
          setAccounts([]);
          setSelectedAccountId("");
          setLoading(false);
          return;
        }

        const memberObj = JSON.parse(storedMember);
        const memberId =
          memberObj.memberId || memberObj.id || memberObj.member?.memberId;

        if (!memberId) {
          setAccounts([]);
          setSelectedAccountId("");
          setLoading(false);
          return;
        }

        const accList = await getAccountsByMember(memberId);

        const activeAccounts = accList.filter(
          (acc) => acc.status === "เปิดใช้งาน"
        );

        const mapped = activeAccounts.map((acc) => ({
          id: acc.accountId,
          accountNumber: acc.accountId,
          accountName: acc.member
            ? `บัญชีของ ${acc.member.firstNameTh || acc.member.username || ""}`
            : "บัญชีออมทรัพย์",
          balance: acc.balance ?? 0,
        }));
        setAccounts(mapped);

        const storedPrimaryId = localStorage.getItem("primaryAccountId");
        if (
          storedPrimaryId &&
          mapped.some((a) => String(a.id) === String(storedPrimaryId))
        ) {
          setSelectedAccountId(storedPrimaryId);
        } else if (mapped.length > 0) {
          setSelectedAccountId(String(mapped[0].id));
        } else {
          setSelectedAccountId("");
        }
      } catch (err) {
        console.error(err);
        setAccounts([]);
        setSelectedAccountId("");
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const selectedAccount =
    accounts.find((a) => String(a.id) === String(selectedAccountId)) || null;

  const validateAmount = (value, maxBalance) => {
    if (!value.trim()) return "กรุณากรอกจำนวนเงินที่ต้องการถอน";
    const num = Number(value);
    if (Number.isNaN(num)) return "จำนวนเงินต้องเป็นตัวเลข";
    if (num <= 0) return "จำนวนเงินต้องมากกว่า 0";
    if (num > 1000000) return "จำนวนเงินต้องไม่เกิน 1,000,000 ฿";
    if (!/^\d+(\.\d{1,2})?$/.test(value))
      return "จำนวนเงินต้องไม่เกินทศนิยม 2 ตำแหน่ง";
    if (typeof maxBalance === "number" && num > maxBalance) {
      return "บัญชีของคุณมีจำนวนเงินไม่เพียงพอในการทำรายการ";
    }
    return "";
  };

  const validatePin = (value) => {
    if (!value.trim()) return "กรุณากรอก PIN";
    if (!/^\d{6}$/.test(value.trim())) return "PIN ต้องเป็นตัวเลข 6 หลัก";
    return "";
  };

  const handleChangeAmount = (e) => {
    const value = e.target.value;
    setAmount(value);
    setAmountError(validateAmount(value, selectedAccount?.balance));
  };

  const handleNext = () => {
    const err = validateAmount(amount, selectedAccount?.balance);
    setAmountError(err);
    if (err) return;
    if (!selectedAccount) return;
    setConfirmAt(new Date());
    setStep("confirm");
  };

  const handleBackToEdit = () => {
    setStep("form");
  };

  const openPinModal = () => {
    setPin("");
    setPinError("");
    setPinModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedAccount) return;
    const errPin = validatePin(pin);
    setPinError(errPin);
    if (errPin) return;

    try {
      setSubmitting(true);
      const payload = {
        accountId: selectedAccount.id,
        amount: Number(amount),
        pin: pin.trim(),
      };
      const tx = await withdraw(payload);

      setSlip(tx);
      setPinModalOpen(false);
      setModalType("success");
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setPinModalOpen(false);
      setModalType("error");
      setModalMessage(
        err?.response?.data?.message ||
          "ไม่สามารถถอนเงินได้ กรุณาลองใหม่อีกครั้ง"
      );
      setModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSlip(null);
    if (modalType === "success") {
      navigate("/transactions");
    }
  };

  if (loading) {
    return (
      <div className="transaction-page">
        <div className="transaction-container">
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-text">กำลังโหลดข้อมูลบัญชี...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <div className="transaction-page">
        <div className="transaction-container">
          <div className="empty-state">
            <div className="empty-icon" />
            <p className="empty-text">
              ไม่มีบัญชีที่อยู่ในสถานะเปิดใช้งานสำหรับทำรายการถอนเงิน
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-page">
      <div className="transaction-container deposit-layout">
        <h1 className="page-title">ถอนเงิน</h1>

        <div className="deposit-grid">
          <div className="deposit-left">
            <div className="deposit-card">
              <h2 className="deposit-section-title">รายละเอียดการถอนเงิน</h2>

              <div className="deposit-field-group">
                <label
                  className="deposit-label"
                  htmlFor="withdraw-account-select"
                >
                  บัญชีที่ต้องการถอนจาก
                </label>
                <select
                  id="withdraw-account-select"
                  className="deposit-select"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.accountNumber}) ยอดคงเหลือ{" "}
                      {acc.balance.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ฿
                    </option>
                  ))}
                </select>
              </div>

              <div className="deposit-field-group">
                <label
                  className="deposit-label"
                  htmlFor="withdraw-amount-input"
                >
                  จำนวนเงินที่ต้องการถอน
                </label>
                <input
                  id="withdraw-amount-input"
                  type="number"
                  className={`deposit-input ${amountError ? "error" : ""}`}
                  placeholder="0.00"
                  value={amount}
                  onChange={handleChangeAmount}
                  min="0"
                  step="0.01"
                />
                {amountError && <p className="err-text">{amountError}</p>}
              </div>

              <div className="security-box">
                <div className="security-icon">🔒</div>
                <div className="security-text">
                  <p className="security-title">ระบบรักษาความปลอดภัย</p>
                  <p className="security-desc">
                    ข้อมูลการทำธุรกรรมของคุณถูกเข้ารหัสและปกป้องตามมาตรฐานความปลอดภัยของธนาคาร
                  </p>
                </div>
              </div>

              <div className="deposit-actions">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => navigate("/dashboard")}
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  className="next-btn"
                  onClick={handleNext}
                  disabled={!selectedAccount || !!amountError || !amount}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>

          <div className="deposit-right">
            <div className="deposit-card">
              <h2 className="deposit-section-title">รายละเอียดธุรกรรม</h2>

              {step === "form" && (
                <p className="deposit-hint">
                  กรอกข้อมูลด้านซ้ายเพื่อดูสรุปรายละเอียดธุรกรรมก่อนยืนยัน
                </p>
              )}

              {step !== "form" && selectedAccount && (
                <div className="transaction-summary">
                  <div className="summary-row">
                    <span className="summary-label">ประเภทธุรกรรม</span>
                    <span className="summary-value">ถอนเงิน</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">บัญชีที่ถอนจาก</span>
                    <span className="summary-value">
                      {selectedAccount.accountName} (
                      {selectedAccount.accountNumber})
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">จำนวนเงิน</span>
                    <span className="summary-value highlight">
                      {Number(amount || 0).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ฿
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">วันเวลา</span>
                    <span className="summary-value">
                      {(confirmAt || new Date()).toLocaleString("th-TH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">รายละเอียดเพิ่มเติม</span>
                    <span className="summary-value">
                      ถอนเงินจากบัญชีผ่านระบบออนไลน์
                    </span>
                  </div>

                  {step === "confirm" && (
                    <div className="deposit-actions" style={{ marginTop: 20 }}>
                      <button
                        type="button"
                        className="back-btn"
                        onClick={handleBackToEdit}
                        disabled={submitting}
                      >
                        แก้ไขข้อมูล
                      </button>
                      <button
                        type="button"
                        className="next-btn"
                        onClick={openPinModal}
                        disabled={submitting}
                      >
                        {submitting ? "กำลังดำเนินการ..." : "ยืนยันถอนเงิน"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pinModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginBottom: 16 }}>ยืนยัน PIN เพื่อถอนเงิน</h2>
            <input
              type="password"
              className={`deposit-input ${pinError ? "error" : ""}`}
              placeholder="กรอก PIN 6 หลัก"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (pinError) setPinError("");
              }}
              maxLength={6}
              style={{ marginBottom: 8 }}
            />
            {pinError && <p className="err-text">{pinError}</p>}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 16,
                width: "100%",
              }}
            >
              <button
                type="button"
                className="next-btn"
                onClick={handleConfirmWithdraw}
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? "กำลังตรวจสอบ..." : "ยืนยัน PIN"}
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => {
                  if (!submitting) {
                    setPinModalOpen(false);
                    setPinError("");
                  }
                }}
                style={{ flex: 1 }}
                disabled={submitting}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {modalType === "success" && slip ? (
              <TransactionSlip slip={slip} onClose={handleCloseModal} />
            ) : (
              <>
                <div className="error-icon">⚠️</div>
                <h2>เกิดข้อผิดพลาด</h2>
                <p>{modalMessage}</p>
                <button
                  className="next-btn"
                  type="button"
                  onClick={handleCloseModal}
                >
                  ตกลง
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
