import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { getAccountsByMember, getTransactions, addAccount } from "../../lib/api";
import "../../styles/transaction.css";
import TransactionSlip from "./transactions_slip";

export default function Transaction() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [openAccountForm, setOpenAccountForm] = useState({
    memberId: "",
    pin: "",
  });
  const [openAccountError, setOpenAccountError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [selectedTransactionForSlip, setSelectedTransactionForSlip] =
    useState(null);

  const toTimeValue = (raw) => {
    if (!raw) return 0;
    if (Array.isArray(raw)) {
      const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
      return new Date(y, m - 1, d, hh, mm, ss).getTime();
    }
    return new Date(raw).getTime();
  };

  const mapTypeToThai = (type) => {
    if (type === "receive") return "รับเงิน";
    if (type === "transfer") return "โอนเงิน";
    if (type === "deposit") return "ฝากเงิน";
    if (type === "withdraw") return "ถอนเงิน";
    return type || "";
  };

  const handleSelectAccount = (account) => {
    if (account.status === "อายัดบัญชี") return;
    setSelectedAccount(account);
    localStorage.setItem("primaryAccountId", account.id);
    localStorage.setItem("primaryAccount", JSON.stringify(account));
  };

  const fetchAccounts = async () => {
    try {
      const storedMember = localStorage.getItem("member");
      if (!storedMember) {
        setAccounts([]);
        setSelectedAccount(null);
        localStorage.removeItem("primaryAccountId");
        localStorage.removeItem("primaryAccount");
        return;
      }

      const memberObj = JSON.parse(storedMember);
      const memberId =
        memberObj.memberId || memberObj.id || memberObj.member?.memberId;

      if (!memberId) {
        setAccounts([]);
        setSelectedAccount(null);
        localStorage.removeItem("primaryAccountId");
        localStorage.removeItem("primaryAccount");
        return;
      }

      const accList = await getAccountsByMember(memberId);

      const mapped = accList.map((acc) => ({
        id: acc.accountId,
        accountNumber: acc.accountId,
        accountName: acc.member
          ? `บัญชีของ ${acc.member.firstNameTh || acc.member.username || ""}`
          : "บัญชีออมทรัพย์",
        balance: acc.balance ?? 0,
        limit: 200000,
        status: acc.status,
        createdDate: acc.createdDate,
      }));

      const sorted = mapped.sort(
        (a, b) => new Date(a.createdDate) - new Date(b.createdDate)
      );
      setAccounts(sorted);

      const storedPrimaryId = localStorage.getItem("primaryAccountId");
      const selectable = sorted.filter((a) => a.status !== "อายัดบัญชี");
      let nextSelected = null;

      if (storedPrimaryId) {
        nextSelected = selectable.find((a) => a.id === storedPrimaryId) || null;
      }

      if (!nextSelected && selectable.length > 0) {
        nextSelected = selectable[0];
      }

      setSelectedAccount(nextSelected);

      if (nextSelected) {
        localStorage.setItem("primaryAccountId", nextSelected.id);
        localStorage.setItem("primaryAccount", JSON.stringify(nextSelected));
      } else {
        localStorage.removeItem("primaryAccountId");
        localStorage.removeItem("primaryAccount");
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const txList = await getTransactions();
      const mappedTx = txList.map((tx) => ({
        id: tx.transientId,
        referenceNo: tx.transientId,
        type: mapTypeToThai(tx.type),
        amount: tx.amount,
        date: tx.transactionDate,
        status: tx.status,
        fromAccount: tx.fromAccount,
        toAccount: tx.toAccount,
        accountId: tx.accountId || tx.account?.accountId,
        fromAccountName: tx.fromAccountName,
        toAccountName: tx.toAccountName,
      }));
      mappedTx.sort((a, b) => toTimeValue(b.date) - toTimeValue(a.date));
      setTransactions(mappedTx);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions
    .filter((t) => t.accountId === selectedAccount?.id)
    .filter((t) => filterType === "all" || t.type === filterType)
    .filter((t) => {
      if (!searchTerm.trim()) return true;

      const keyword = searchTerm.toLowerCase();

      const textFields = [
        t.id,
        t.type,
        t.fromAccount,
        t.fromAccountName,
        t.toAccount,
        t.toAccountName,
        t.accountId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const amountMatch = t.amount
        ?.toString()
        .includes(keyword.replace(/,/g, ""));

      return textFields.includes(keyword) || amountMatch;
    });


  const activeTransactions = filteredTransactions.filter(
    (t) => t.status !== "ยกเลิก"
  );

  const totalIncome = activeTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = activeTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const handleOpenAccountChange = (e) => {
    const { name, value } = e.target;
    setOpenAccountForm((prev) => ({ ...prev, [name]: value }));
    setOpenAccountError("");
  };

  const handleOpenAccountSubmit = async (e) => {
    e.preventDefault();
    const { memberId, pin } = openAccountForm;
    if (!memberId.trim()) {
      setOpenAccountError("กรุณากรอกเลขบัตรประชาชน");
      return;
    }
    if (!pin.trim()) {
      setOpenAccountError("กรุณากรอก PIN");
      return;
    }
    if (!/^\d{6}$/.test(pin.trim())) {
      setOpenAccountError("PIN ต้องเป็นตัวเลข 6 หลัก");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        memberId: memberId.trim(),
        pin: pin.trim(),
      };
      await addAccount(payload);
      await fetchAccounts();
      setOpenAccountModal(false);
      setOpenAccountForm({ memberId: "", pin: "" });
      setOpenAccountError("");
    } catch (err) {
      setOpenAccountError(
        err?.response?.data?.message || "ไม่สามารถเปิดบัญชีได้ กรุณาลองใหม่"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountName = (accNumber) => {
    if (!accNumber) return "-";
    const found = accounts.find(
      (a) => String(a.accountNumber) === String(accNumber)
    );
    return found ? found.accountName : accNumber;
  };

  const handleOpenSlip = (t) => {
    const transactionForSlip = {
      type: t.type,
      amount: Math.abs(t.amount || 0),
      transactionDate: t.date,
      fromAccount: t.fromAccount,
      toAccount: t.toAccount,
      referenceNo: t.referenceNo || t.id,
      fee: 0,
      accountNameFrom:
        t.type === "ฝากเงิน"
          ? "เงินสด"
          : t.fromAccountName || getAccountName(t.fromAccount),
      accountNameTo:
        t.type === "ถอนเงิน"
          ? "เงินสด"
          : t.toAccountName || getAccountName(t.toAccount),
      qr: null,
    };
    setSelectedTransactionForSlip(transactionForSlip);
    setSlipOpen(true);
  };

  const handleCloseSlip = () => {
    setSlipOpen(false);
    setSelectedTransactionForSlip(null);
  };

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;
    const rows = filteredTransactions.map((t, index) => ({
      ลำดับ: index + 1,
      วันที่ทำรายการ: t.date
        ? new Date(toTimeValue(t.date)).toLocaleString("th-TH", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "",
      ประเภท: t.type,
      จำนวนเงิน: t.amount,
      สถานะ: t.status,
      จากเลขที่บัญชี: t.fromAccount || "",
      ชื่อบัญชีต้นทาง: t.fromAccountName || "",
      ถึงเลขที่บัญชี: t.toAccount || "",
      ชื่อบัญชีปลายทาง: t.toAccountName || "",
      บัญชีที่ทำรายการ: t.accountId || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(
      wb,
      `transactions_${selectedAccount?.accountNumber || "all"}.xlsx`
    );
  };

  const getTransactionDescription = (t) => {
    if (t.type === "ฝากเงิน") return "ฝากเงินผ่านระบบออนไลน์";
    if (t.type === "ถอนเงิน") return "ถอนเงินผ่านระบบออนไลน์";
    return `${t.fromAccount || "-"} ➜ ${t.toAccount || "-"}`;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "สำเร็จ") return "status-success";
    if (status === "ยกเลิก") return "status-cancel";
    return "status-pending";
  };

  return (
    <div className="transaction-page">
      <div className="transaction-container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 className="page-title">ธุรกรรมทั้งหมด</h1>
          <button
            className="open-account-btn"
            type="button"
            onClick={() => setOpenAccountModal(true)}
          >
            + เปิดบัญชีใหม่
          </button>
        </div>

        <div className="account-selector">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className={`account-card ${
                selectedAccount?.id === account.id ? "selected" : ""
              } ${
                account.status === "อายัดบัญชี" ? "account-disabled" : ""
              }`}
              onClick={() => handleSelectAccount(account)}
            >
              <div className="account-card-header">
                <div className="account-type-badge">💰 บัญชีออมทรัพย์</div>
                <div
                  className={`account-status ${
                    account.status === "อายัดบัญชี" ? "frozen" : "active"
                  }`}
                >
                  ●{" "}
                  {account.status === "อายัดบัญชี"
                    ? "อายัดบัญชี"
                    : "เปิดใช้งาน"}
                </div>
              </div>
              <h3 className="account-name">{account.accountName}</h3>
              <p className="account-number">{account.accountNumber}</p>
              <div className="account-balance">
                <span className="balance-label">ยอดคงเหลือ</span>
                <span className="balance-amount">
                  {account.balance.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ฿
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="quick-actions">
          <div className="actions-grid">
            <Link to="/transfer" className="action-card">
              <div className="action-icon transfer">โอน</div>
              <span className="action-label">โอนเงิน</span>
            </Link>

            <Link to="/deposit" className="action-card">
              <div className="action-icon deposit">ฝาก</div>
              <span className="action-label">ฝากเงิน</span>
            </Link>

            <Link to="/withdraw" className="action-card">
              <div className="action-icon withdraw">ถอน</div>
              <span className="action-label">ถอนเงิน</span>
            </Link>

            <Link to="/summary" className="action-card">
              <div className="action-icon summary">สรุป</div>
              <span className="action-label">สรุปรายการ</span>
            </Link>

            <Link to="/check-account" className="action-card">
              <div className="action-icon check">เช็ค</div>
              <span className="action-label">ตรวจสอบบัญชี</span>
            </Link>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat-card income">
            <div className="stat-icon">↓</div>
            <div className="stat-info">
              <p className="stat-label">รายรับ</p>
              <p className="stat-amount positive">
                +
                {totalIncome.toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}{" "}
                ฿
              </p>
            </div>
          </div>

          <div className="stat-card expense">
            <div className="stat-icon">↑</div>
            <div className="stat-info">
              <p className="stat-label">รายจ่าย</p>
              <p className="stat-amount negative">
                -
                {totalExpense.toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}{" "}
                ฿
              </p>
            </div>
          </div>

          <div className="stat-card net">
            <div className="stat-icon">≈</div>
            <div className="stat-info">
              <p className="stat-label">สุทธิ</p>
              <p
                className={`stat-amount ${
                  totalIncome - totalExpense >= 0 ? "positive" : "negative"
                }`}
              >
                {totalIncome - totalExpense >= 0 ? "+" : ""}
                {(totalIncome - totalExpense).toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}{" "}
                ฿
              </p>
            </div>
          </div>
        </div>

        <div className="transaction-filters">
          <div className="filter-left">
            <button
              className={`filter-btn ${filterType === "all" ? "active" : ""}`}
              type="button"
              onClick={() => setFilterType("all")}
            >
              ทั้งหมด
            </button>
            <button
              className={`filter-btn ${
                filterType === "รับเงิน" ? "active" : ""
              }`}
              type="button"
              onClick={() => setFilterType("รับเงิน")}
            >
              รับเงิน
            </button>
            <button
              className={`filter-btn ${
                filterType === "โอนเงิน" ? "active" : ""
              }`}
              type="button"
              onClick={() => setFilterType("โอนเงิน")}
            >
              โอนเงิน
            </button>
            <button
              className={`filter-btn ${
                filterType === "ฝากเงิน" ? "active" : ""
              }`}
              type="button"
              onClick={() => setFilterType("ฝากเงิน")}
            >
              ฝากเงิน
            </button>
            <button
              className={`filter-btn ${
                filterType === "ถอนเงิน" ? "active" : ""
              }`}
              type="button"
              onClick={() => setFilterType("ถอนเงิน")}
            >
              ถอนเงิน
            </button>
          </div>

          <div className="filter-right">
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาธุรกรรม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <button
            className="export-btn"
            type="button"
            onClick={handleExportExcel}
            disabled={!filteredTransactions.length}
          >
            ส่งออกประวัติเป็น .xlsx
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-text">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true" />
                <p className="empty-text">ไม่พบธุรกรรมสำหรับบัญชีนี้</p>
              </div>
            ) : (
              filteredTransactions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`transaction-item ${
                    t.status === "ยกเลิก" ? "tx-canceled" : ""
                  }`}
                  onClick={() => handleOpenSlip(t)}
                >
                  <div className={`transaction-icon ${t.type || "payment"}`}>
                    {t.type === "รับเงิน" && "↓"}
                    {t.type === "โอนเงิน" && "→"}
                    {t.type === "ฝากเงิน" && "+"}
                    {t.type === "ถอนเงิน" && "−"}
                    {!["รับเงิน", "โอนเงิน", "ฝากเงิน", "ถอนเงิน"].includes(
                      t.type
                    ) && "💳"}
                  </div>

                  <div className="transaction-details">
                    <div className="transaction-main">
                      <h4 className="transaction-category">{t.type}</h4>
                      <p className="transaction-description">
                        {getTransactionDescription(t)}
                      </p>
                    </div>
                    <div className="transaction-meta">
                      <span className="transaction-date">
                        {t.date
                          ? new Date(toTimeValue(t.date)).toLocaleString(
                              "th-TH",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )
                          : "-"}
                      </span>
                      <span
                        className={`transaction-status-badge ${getStatusBadgeClass(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>

                  <div className="transaction-amount-section">
                    <div
                      className={`transaction-amount ${
                        t.amount >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {t.amount.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ฿
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {openAccountModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginBottom: 16 }}>เปิดบัญชีใหม่</h2>
            <form onSubmit={handleOpenAccountSubmit}>
              <div style={{ marginBottom: 12, textAlign: "left" }}>
                <label htmlFor="memberIdInput" style={{ fontSize: 14 }}>
                  เลขบัตรประชาชน
                </label>
                <input
                  id="memberIdInput"
                  type="text"
                  name="memberId"
                  value={openAccountForm.memberId}
                  onChange={handleOpenAccountChange}
                  className="modal-input"
                  placeholder="กรอกเลขบัตรประชาชน"
                />
              </div>

              <div style={{ marginBottom: 12, textAlign: "left" }}>
                <label htmlFor="pinInput" style={{ fontSize: 14 }}>
                  PIN (6 หลัก)
                </label>
                <input
                  id="pinInput"
                  type="password"
                  name="pin"
                  value={openAccountForm.pin}
                  onChange={handleOpenAccountChange}
                  className="modal-input"
                  placeholder="กรอก PIN 6 หลัก"
                  maxLength={6}
                />
              </div>

              {openAccountError && (
                <p
                  style={{
                    color: "#e63946",
                    fontSize: 13,
                    marginBottom: 8,
                    textAlign: "left",
                  }}
                >
                  {openAccountError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <button
                  type="submit"
                  className="next-btn"
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? "กำลังเปิดบัญชี..." : "ยืนยันเปิดบัญชี"}
                </button>
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => {
                    setOpenAccountModal(false);
                    setOpenAccountError("");
                  }}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {slipOpen && selectedTransactionForSlip && (
        <TransactionSlip
          transaction={selectedTransactionForSlip}
          onClose={handleCloseSlip}
        />
      )}
    </div>
  );
}
