import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/transaction.css";
import "../../styles/slip.css";
import { getAccountsByMember, deposit } from "../../lib/api";

function TransactionSlip({ slip, onClose }) {
  if (!slip) return null;

  const toTimeValue = (raw) => {
    if (!raw) return 0;
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
      <h2>ฝากเงินสำเร็จ</h2>

      <div className="slip-card">
        <h3 className="slip-title">สลิปยืนยันการฝากเงิน</h3>

        <div className="slip-row">
          <span className="slip-label">รหัสอ้างอิง</span>
          <span className="slip-value">{slip.transientId}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">ประเภทธุรกรรม</span>
          <span className="slip-value">{getTypeText(slip.type)}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">จำนวนเงินที่ฝาก</span>
          <span className="slip-value">
            {slip.amount?.toLocaleString("th-TH", {
              minimumFractionDigits: 2,
            })}{" "}
            ฿
          </span>
        </div>

        <div className="slip-row">
          <span className="slip-label">เข้าบัญชี</span>
          <span className="slip-value">
            {slip.toAccount || slip.account?.accountId || "-"}
          </span>
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

      <button className="next-btn" onClick={onClose} style={{ marginTop: 16 }}>
        ปิด
      </button>
    </>
  );
}

export default function Deposit() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState("form");
  const [confirmAt, setConfirmAt] = useState(null);

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

  const validateAmount = (value) => {
    if (!value.trim()) return "กรุณากรอกจำนวนเงินที่ต้องการฝาก";
    const num = Number(value);
    if (Number.isNaN(num)) return "จำนวนเงินต้องเป็นตัวเลข";
    if (num <= 0) return "จำนวนเงินต้องมากกว่า 0";
    if (num > 1000000) return "จำนวนเงินต้องไม่เกิน 1,000,000 ฿";
    if (!/^\d+(\.\d{1,2})?$/.test(value))
      return "จำนวนเงินต้องไม่เกินทศนิยม 2 ตำแหน่ง";
    return "";
  };

  const handleChangeAmount = (e) => {
    const value = e.target.value;
    setAmount(value);
    setAmountError(validateAmount(value));
  };

  const selectedAccount =
    accounts.find((a) => String(a.id) === String(selectedAccountId)) || null;

  const handleNext = () => {
    const err = validateAmount(amount);
    setAmountError(err);
    if (err) return;
    if (!selectedAccount) return;
    setConfirmAt(new Date());
    setStep("confirm");
  };

  const handleBackToEdit = () => {
    setStep("form");
  };

  const handleConfirmDeposit = async () => {
    if (!selectedAccount) return;
    const err = validateAmount(amount);
    setAmountError(err);
    if (err) {
      setStep("form");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        amount: Number(amount),
        accountId: selectedAccount.id,
      };
      const tx = await deposit(payload);

      setSlip(tx);
      setModalType("success");
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setModalType("error");
      setModalMessage(
        err?.response?.data?.message ||
          "ไม่สามารถฝากเงินได้ กรุณาลองใหม่อีกครั้ง"
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
            <div className="empty-icon"></div>
            <p className="empty-text">
              ไม่มีบัญชีที่อยู่ในสถานะเปิดใช้งานสำหรับทำรายการฝากเงิน
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-page">
      <div className="transaction-container deposit-layout">
        <h1 className="page-title">ฝากเงิน</h1>

        <div className="deposit-grid">
          <div className="deposit-left">
            <div className="deposit-card">
              <h2 className="deposit-section-title">รายละเอียดการฝากเงิน</h2>

              <div className="deposit-field-group">
                <label className="deposit-label">บัญชีปลายทาง</label>
                <select
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
                <label className="deposit-label">จำนวนเงินที่ต้องการฝาก</label>
                <input
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
                    <span className="summary-value">ฝากเงิน</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">บัญชีปลายทาง</span>
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
                      ฝากเงินเข้าบัญชีผ่านระบบออนไลน์
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
                        onClick={handleConfirmDeposit}
                        disabled={submitting}
                      >
                        {submitting ? "กำลังดำเนินการ..." : "ยืนยันฝากเงิน"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                <button className="next-btn" onClick={handleCloseModal}>
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
