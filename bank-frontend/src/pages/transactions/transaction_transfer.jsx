import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/transaction.css";
import "../../styles/slip.css";
import { getAccountsByMember, transfer } from "../../lib/api";
import { useTranslation } from "react-i18next";

function TransactionSlip({ slip, onClose }) {
  const { t, i18n } = useTranslation();

  const toTimeValue = (raw) => {
    if (!raw) return new Date();
    if (Array.isArray(raw)) {
      const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
      return new Date(y, m - 1, d, hh, mm, ss);
    }
    return new Date(raw);
  };

  const dt = toTimeValue(slip.transactionDate);
  const locale = i18n.language === "en" ? "en-US" : "th-TH";

  return (
    <>
      <div className="success-icon">✓</div>
      <h2>{t("transfer.slip.successTitle")}</h2>

      <div className="slip-card">
        <h3 className="slip-title">{t("transfer.slip.slipTitle")}</h3>

        <div className="slip-row">
          <span className="slip-label">{t("transfer.slip.ref")}</span>
          <span className="slip-value">{slip.transientId}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">{t("transfer.slip.type")}</span>
          <span className="slip-value">{t("slip.txType.transfer", { defaultValue: "โอนเงิน" })}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">{t("transfer.slip.amount")}</span>
          <span className="slip-value">
            {Math.abs(slip.amount || 0).toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
          </span>
        </div>

        <div className="slip-row">
          <span className="slip-label">{t("transfer.slip.from")}</span>
          <span className="slip-value">{slip.fromAccount || "-"}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">{t("transfer.slip.to")}</span>
          <span className="slip-value">{slip.toAccount || "-"}</span>
        </div>

        <div className="slip-row">
          <span className="slip-label">{t("transfer.slip.datetime")}</span>
          <span className="slip-value">
            {dt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        {slip.account && (
          <div className="slip-row">
            <span className="slip-label">{t("transfer.slip.afterBalance")}</span>
            <span className="slip-value">
              {slip.account.balance?.toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
            </span>
          </div>
        )}
      </div>

      <button className="next-btn" type="button" onClick={onClose} style={{ marginTop: 16 }}>
        {t("modal.ok")}
      </button>
    </>
  );
}

TransactionSlip.propTypes = {
  slip: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default function Transfer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();

  const [accounts, setAccounts] = useState([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [toAccountError, setToAccountError] = useState("");
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

  const locale = i18n.language === "en" ? "en-US" : "th-TH";

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const storedMember = localStorage.getItem("member");
        if (!storedMember) {
          setLoading(false);
          return;
        }

        const memberObj = JSON.parse(storedMember);
        const memberId = memberObj.memberId || memberObj.id || memberObj.member?.memberId;

        const accList = await getAccountsByMember(memberId);
        const activeAccounts = accList.filter((acc) => acc.status === "เปิดใช้งาน");

        const mapped = activeAccounts.map((acc) => ({
          id: acc.accountId,
          accountNumber: acc.accountId,
          accountName: acc.member
            ? i18n.language === "en"
              ? acc.member.firstNameEn || acc.member.firstNameTh || acc.member.username || ""
              : acc.member.firstNameTh || acc.member.firstNameEn || acc.member.username || ""
            : t("transactions.defaultAccountName"),
          balance: acc.balance ?? 0,
        }));

        setAccounts(mapped);

        const storedPrimaryId = localStorage.getItem("primaryAccountId");
        if (storedPrimaryId && mapped.some((a) => String(a.id) === String(storedPrimaryId))) {
          setFromAccountId(storedPrimaryId);
        } else if (mapped.length > 0) {
          setFromAccountId(String(mapped[0].id));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [i18n.language, t]);

  useEffect(() => {
    const to = searchParams.get("to");
    if (to) {
      setToAccount(to);
      setToAccountError("");
    }
  }, [searchParams]);

  const normalizeAccount = (v) => String(v || "").replaceAll("-", "").trim();

  const validateAmount = (value, maxBalance) => {
    if (!value.trim()) return t("transfer.err.amountRequired");
    const num = Number(value);
    if (Number.isNaN(num)) return t("transfer.err.nan");
    if (num <= 0) return t("transfer.err.min");
    if (num > 1000000) return t("transfer.err.max");
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return t("transfer.err.decimals");
    if (typeof maxBalance === "number" && num > maxBalance) return t("transfer.err.insufficient");
    return "";
  };

  const validateToAccount = (value, fromAcc) => {
    if (!value.trim()) return t("transfer.err.toRequired");
    const toNorm = normalizeAccount(value);
    if (!/^\d{6,20}$/.test(toNorm)) return t("transfer.err.toDigits");
    if (fromAcc) {
      const fromNorm = normalizeAccount(fromAcc.accountNumber);
      if (toNorm === fromNorm) return t("transfer.err.toSelf");
    }
    return "";
  };

  const validatePin = (value) => {
    if (!value.trim()) return t("transfer.err.pinRequired");
    if (!/^\d{6}$/.test(value.trim())) return t("transfer.err.pin6digits");
    return "";
  };

  const fromAccount = accounts.find((a) => String(a.id) === String(fromAccountId)) || null;

  const handleNext = () => {
    const errAmt = validateAmount(amount, fromAccount?.balance);
    const errTo = validateToAccount(toAccount, fromAccount);
    setAmountError(errAmt);
    setToAccountError(errTo);
    if (errAmt || errTo) return;
    setConfirmAt(new Date());
    setStep("confirm");
  };

  const openPinModal = () => {
    setPin("");
    setPinError("");
    setPinModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    const errPin = validatePin(pin);
    setPinError(errPin);
    if (errPin) return;

    try {
      setSubmitting(true);
      const payload = {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.trim(),
        amount: Number(amount),
        pin: pin.trim(),
      };
      const tx = await transfer(payload);
      setSlip(tx);
      setPinModalOpen(false);
      setModalType("success");
      setModalOpen(true);
    } catch (err) {
      setPinModalOpen(false);
      setModalType("error");
      setModalMessage(err?.response?.data?.message || t("transfer.err.fail"));
      setModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="transaction-page">
        <div className="transaction-container">
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-text">{t("transfer.loadingAccounts")}</p>
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
            <p className="empty-text">{t("transfer.noActiveAccount")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-page">
      <div className="transaction-container deposit-layout">
        <h1 className="page-title">{t("transfer.title")}</h1>

        <div className="deposit-grid">
          <div className="deposit-left">
            <div className="deposit-card">
              <h2 className="deposit-section-title">{t("transfer.section.details")}</h2>

              <div className="deposit-field-group">
                <label className="deposit-label">{t("transfer.fromAccountLabel")}</label>
                <select className="deposit-select" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.accountNumber}) {acc.balance.toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
                    </option>
                  ))}
                </select>
              </div>

              <div className="deposit-field-group">
                <label className="deposit-label">{t("transfer.toAccountLabel")}</label>
                <input
                  type="text"
                  className={`deposit-input ${toAccountError ? "error" : ""}`}
                  placeholder={t("transfer.toAccountPlaceholder")}
                  value={toAccount}
                  onChange={(e) => {
                    setToAccount(e.target.value);
                    setToAccountError(validateToAccount(e.target.value, fromAccount));
                  }}
                />
                {toAccountError && <p className="err-text">{toAccountError}</p>}
              </div>

              <div className="deposit-field-group">
                <label className="deposit-label">{t("transfer.amountLabel")}</label>
                <input
                  type="number"
                  className={`deposit-input ${amountError ? "error" : ""}`}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountError(validateAmount(e.target.value, fromAccount?.balance));
                  }}
                />
                {amountError && <p className="err-text">{amountError}</p>}
              </div>

              <div className="deposit-actions">
                <button type="button" className="back-btn" onClick={() => navigate("/dashboard")}>
                  {t("transfer.back")}
                </button>
                <button type="button" className="next-btn" onClick={handleNext} disabled={!amount || !toAccount || amountError || toAccountError}>
                  {t("transfer.next")}
                </button>
              </div>
            </div>
          </div>

          <div className="deposit-right">
            <div className="deposit-card">
              <h2 className="deposit-section-title">{t("transfer.section.txSummary")}</h2>

              {step === "form" && <p className="deposit-hint">{t("transfer.hint")}</p>}

              {step !== "form" && fromAccount && (
                <div className="transaction-summary">
                  <div className="summary-row">
                    <span className="summary-label">{t("transfer.txTypeLabel")}</span>
                    <span className="summary-value">{t("transactions.txType.transfer")}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">{t("transfer.fromAccountLabel")}</span>
                    <span className="summary-value">
                      {fromAccount.accountName} ({fromAccount.accountNumber})
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">{t("transfer.toAccountLabel")}</span>
                    <span className="summary-value">{toAccount}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">{t("transfer.amountLabel")}</span>
                    <span className="summary-value highlight">
                      {Number(amount || 0).toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">{t("transfer.datetimeLabel")}</span>
                    <span className="summary-value">
                      {(confirmAt || new Date()).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>

                  {step === "confirm" && (
                    <div className="deposit-actions" style={{ marginTop: 20 }}>
                      <button type="button" className="back-btn" onClick={() => setStep("form")} disabled={submitting}>
                        {t("transfer.edit")}
                      </button>
                      <button type="button" className="next-btn" onClick={openPinModal} disabled={submitting}>
                        {t("transfer.confirm")}
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
            <h2 style={{ marginBottom: 16 }}>{t("transfer.pinModal.title")}</h2>
            <input
              type="password"
              className={`deposit-input ${pinError ? "error" : ""}`}
              placeholder={t("transfer.pinModal.placeholder")}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (pinError) setPinError("");
              }}
              maxLength={6}
            />
            {pinError && <p className="err-text">{pinError}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button type="button" className="next-btn" onClick={handleConfirmTransfer} style={{ flex: 1 }} disabled={submitting}>
                {submitting ? t("transfer.pinModal.checking") : t("transfer.pinModal.confirm")}
              </button>
              <button type="button" className="modal-cancel-btn" onClick={() => setPinModalOpen(false)} style={{ flex: 1 }} disabled={submitting}>
                {t("transfer.pinModal.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {modalType === "success" && slip ? (
              <TransactionSlip slip={slip} onClose={() => navigate("/transactions")} />
            ) : (
              <>
                <div className="error-icon">⚠️</div>
                <h2>{t("modal.errorTitle")}</h2>
                <p>{modalMessage}</p>
                <button className="next-btn" type="button" onClick={() => setModalOpen(false)}>
                  {t("modal.ok")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
