import React, { useState } from "react";
import PropTypes from "prop-types";
import "../../styles/slip.css";
import { exportTransactionPdf } from "../../lib/api";
import qrPlaceholder from "../../assets/qr-placeholder.png";
import { useTranslation } from "react-i18next";

const toTimeValue = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) return raw.getTime();
  if (Array.isArray(raw)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
};

const normalizeTypeKey = (rawType) => {
  const v = (rawType || "").toString().trim().toLowerCase();
  if (v === "receive" || v === "รับเงิน") return "receive";
  if (v === "transfer" || v === "โอนเงิน") return "transfer";
  if (v === "deposit" || v === "ฝากเงิน") return "deposit";
  if (v === "withdraw" || v === "ถอนเงิน") return "withdraw";
  return "";
};

export default function TransactionSlip({ transaction, onClose }) {
  const { t, i18n } = useTranslation();

  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  const {
    type,
    amount,
    transactionDate,
    fromAccount,
    toAccount,
    referenceNo,
    fee = 0,
    accountNameFrom,
    accountNameTo,
    qr,
  } = transaction;

  const typeKey = normalizeTypeKey(type);
  const typeText = typeKey ? t(`slip.txType.${typeKey}`) : type || "";

  const dtValue = toTimeValue(transactionDate);
  const locale = i18n.language === "en" ? "en-US" : "th-TH";
  const dtText = dtValue
    ? new Date(dtValue).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
    : "-";

  const getStatusText = () => {
    if (typeKey === "deposit") return t("slip.status.depositSuccess");
    if (typeKey === "withdraw") return t("slip.status.withdrawSuccess");
    if (typeKey === "transfer") return t("slip.status.transferSuccess");
    if (typeKey === "receive") return t("slip.status.receiveSuccess");
    return t("slip.status.success");
  };

  const fromTitle = typeKey === "deposit" ? t("slip.party.depositIn") : t("slip.party.from");
  const toTitle = typeKey === "withdraw" ? t("slip.party.withdrawFrom") : t("slip.party.to");
  const toAccountLabel =
    typeKey === "transfer" ? t("slip.party.receiverAccount") : t("slip.party.accountNo");

  const handleSendSlip = async () => {
    if (!referenceNo) return;

    try {
      setSending(true);
      setSendError("");
      setSentSuccess(false);
      await exportTransactionPdf(referenceNo);
      setSentSuccess(true);
    } catch (err) {
      setSendError(err?.response?.data?.message || t("slip.send.fail"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="slip-overlay">
      <div className="slip-card">
        <div className="slip-inner">
          <div className="slip-header">
            <div>
              <div className="slip-status">{getStatusText()}</div>
              <div className="slip-datetime">{dtText}</div>
            </div>
            <div className="slip-brand">Digibank</div>
          </div>

          <div className="slip-divider" />

          <div className="slip-parties">
            <div className="slip-party">
              <div className="slip-party-title">{fromTitle}</div>

              <div className="slip-party-name">{accountNameFrom || t("slip.dash")}</div>

              <div className="slip-party-bank">{t("slip.party.accountNo")}</div>
              <div className="slip-party-account">{fromAccount || t("slip.dash")}</div>
            </div>

            <div className="slip-arrow">↓</div>

            <div className="slip-party">
              <div className="slip-party-title">{toTitle}</div>

              <div className="slip-party-name">{accountNameTo || t("slip.dash")}</div>

              <div className="slip-party-bank">{toAccountLabel}</div>

              <div className="slip-party-account">{toAccount || t("slip.dash")}</div>
            </div>
          </div>

          <div className="slip-amount-main slip-row">
            <span className="slip-label">{t("slip.fields.amount")}</span>
            <span className="slip-value">
              {amount?.toLocaleString(locale, { minimumFractionDigits: 2 })}{" "}
              {t("slip.unit.baht")}
            </span>
          </div>

          <div className="slip-row">
            <span className="slip-label">{t("slip.fields.referenceNo")}</span>
            <span className="slip-value">{referenceNo || t("slip.dash")}</span>
          </div>

          <div className="slip-row">
            <span className="slip-label">{t("slip.fields.fee")}</span>
            <span className="slip-value">
              {fee.toLocaleString(locale, { minimumFractionDigits: 2 })}{" "}
              {t("slip.unit.baht")}
            </span>
          </div>

          <div className="slip-footer">
            <div className="slip-note">{t("slip.note.scanToVerify")}</div>
            <div className="slip-qr-box">
              <img src={qr || qrPlaceholder} alt="qr" />
            </div>
          </div>
        </div>

        <div className="slip-actions">
          <button
            className="slip-send-btn"
            type="button"
            onClick={handleSendSlip}
            disabled={sending || sentSuccess}
          >
            {sending ? <span className="spinner" /> : t("slip.send.button")}
          </button>

          <button
            className="slip-close-btn secondary"
            type="button"
            onClick={onClose}
            disabled={sending}
          >
            {t("slip.close")}
          </button>
        </div>

        {sentSuccess && (
          <div className="slip-alert success">{t("slip.send.success")}</div>
        )}

        {sendError && <div className="slip-alert error">⚠️ {sendError}</div>}
      </div>
    </div>
  );
}

TransactionSlip.propTypes = {
  transaction: PropTypes.shape({
    type: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    transactionDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
      PropTypes.array,
    ]).isRequired,
    fromAccount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    toAccount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    referenceNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fee: PropTypes.number,
    accountNameFrom: PropTypes.string,
    accountNameTo: PropTypes.string,
    qr: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
