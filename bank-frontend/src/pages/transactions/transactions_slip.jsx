import React, { useState } from "react";
import PropTypes from "prop-types";
import "../../styles/slip.css";
import { exportTransactionPdf } from "../../lib/api";
import qrPlaceholder from "../../assets/qr-placeholder.png";

export default function TransactionSlip({ transaction, onClose }) {

  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSendSlip = async () => {
    if (!referenceNo) return;

    try {
      setSending(true);
      setSendError("");
      setSentSuccess(false);
      await exportTransactionPdf(referenceNo);
      setSentSuccess(true);
    } catch (err) {
      setSendError(
        err?.response?.data?.message || "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setSending(false);
    }
  };

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

  const dt = new Date(transactionDate);

  const getStatusText = () => {
    if (type === "ฝากเงิน") return "ฝากเงินสำเร็จ";
    if (type === "ถอนเงิน") return "ถอนเงินสำเร็จ";
    if (type === "โอนเงิน") return "โอนเงินสำเร็จ";
    return "ทำรายการสำเร็จ";
  };

  return (
    <div className="slip-overlay">
      <div className="slip-card">
        <div className="slip-inner">
          <div className="slip-header">
            <div>
              <div className="slip-status">{getStatusText()}</div>
              <div className="slip-datetime">
                {dt.toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            </div>
            <div className="slip-brand">Digibank</div>
          </div>

          <div className="slip-divider" />

          <div className="slip-parties">
            <div className="slip-party">
              <div className="slip-party-title">
                {type === "ฝากเงิน" ? "ฝากเข้า" : "จาก"}
              </div>

              <div className="slip-party-name">{accountNameFrom || "-"}</div>

              <div className="slip-party-bank">เลขบัญชี</div>
              <div className="slip-party-account">{fromAccount || "-"}</div>
            </div>

            <div className="slip-arrow">↓</div>

            <div className="slip-party">
              <div className="slip-party-title">
                {type === "ถอนเงิน" ? "ถอนจาก" : "ถึง"}
              </div>

              <div className="slip-party-name">{accountNameTo || "-"}</div>

              <div className="slip-party-bank">
                {type === "โอนเงิน" ? "เลขบัญชีผู้รับ" : "เลขบัญชี"}
              </div>

              <div className="slip-party-account">{toAccount || "-"}</div>
            </div>
          </div>

          <div className="slip-amount-main slip-row">
            <span className="slip-label">จำนวน</span>
            <span className="slip-value">
              {amount?.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
              })}{" "}
              บาท
            </span>
          </div>

          <div className="slip-row">
            <span className="slip-label">เลขที่รายการ</span>
            <span className="slip-value">{referenceNo || "-"}</span>
          </div>

          <div className="slip-row">
            <span className="slip-label">ค่าธรรมเนียม</span>
            <span className="slip-value">
              {fee.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
              })}{" "}
              บาท
            </span>
          </div>

          <div className="slip-footer">
            <div className="slip-note">สแกนเพื่อตรวจสอบสลิป</div>
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
            {sending ? <span className="spinner" /> : "ส่งสลิปไปอีเมล"}
          </button>

          <button
            className="slip-close-btn secondary"
            type="button"
            onClick={onClose}
            disabled={sending}
          >
            ปิด
          </button>
        </div>
        {sentSuccess && (
          <div className="slip-alert success">
            ✅ ส่งสลิปไปยังอีเมลเรียบร้อยแล้ว
          </div>
        )}

        {sendError && (
          <div className="slip-alert error">
            ⚠️ {sendError}
          </div>
        )}
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
