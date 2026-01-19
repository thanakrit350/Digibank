import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import { getAccountsByMember, getTransactionsByAccount } from "../lib/api";

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

export default function DashboardBank() {
  const [favoriteAccounts, setFavoriteAccounts] = useState([]);
  const [account, setAccount] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedFavorite, setSelectedFavorite] = useState(null);

  const navigate = useNavigate();

  const extractMemberId = (memberObj) =>
    memberObj?.memberId || memberObj?.id || memberObj?.member?.memberId || null;

  const loadAccounts = async (memberId) => {
    const accountsRes = await getAccountsByMember(memberId);
    if (!accountsRes) return [];
    return Array.isArray(accountsRes) ? accountsRes : [accountsRes];
  };

  const pickPrimaryAccount = (accounts) => {
    const active = accounts.filter((a) => a.status !== "อายัดบัญชี");
    const frozen = accounts.filter((a) => a.status === "อายัดบัญชี");

    if (active.length === 0 && frozen.length === 0) return null;

    const primaryId = localStorage.getItem("primaryAccountId");

    if (primaryId) {
      return (
        active.find((a) => a.accountId === primaryId) ||
        active[0] ||
        frozen[0]
      );
    }

    return active[0] || frozen[0];
  };

  const loadTransactions = async (accountId) => {
    const txRes = await getTransactionsByAccount(accountId);
    let txArray = [];
    if (Array.isArray(txRes)) {
      txArray = txRes;
    } else if (txRes) {
      txArray = [txRes];
    }

    const sorted = [...txArray].sort(
      (a, b) => toTimeValue(b.transactionDate) - toTimeValue(a.transactionDate)
    );

    setRecentTransactions(sorted.slice(0, 4));
  };

  const loadFavorites = () => {
    const storedFavs = localStorage.getItem("favoriteAccounts");
    if (!storedFavs) {
      setFavoriteAccounts([]);
      return;
    }

    try {
      setFavoriteAccounts(JSON.parse(storedFavs));
    } catch {
      setFavoriteAccounts([]);
    }
  };

  const cleanupAndStop = () => {
    setAccount(null);
    setRecentTransactions([]);
  };

  const resetAccountState = () => {
    setAccount(null);
    setRecentTransactions([]);
    localStorage.removeItem("primaryAccountId");
  };

  const updatePrimaryAccountStorage = (acc) => {
    if (acc.status === "อายัดบัญชี") {
      localStorage.removeItem("primaryAccountId");
    } else {
      localStorage.setItem("primaryAccountId", acc.accountId);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const storedMember = localStorage.getItem("member");
        if (!storedMember) {
          cleanupAndStop();
          return;
        }

        const memberObj = JSON.parse(storedMember);
        const memberId = extractMemberId(memberObj);
        if (!memberId) {
          cleanupAndStop();
          return;
        }

        const accounts = await loadAccounts(memberId);
        const myAccount = pickPrimaryAccount(accounts);

        if (myAccount) {
          setAccount(myAccount);
          updatePrimaryAccountStorage(myAccount);
          await loadTransactions(myAccount.accountId);
        } else {
          resetAccountState();
        }

        loadFavorites();
      } catch {
        setFavoriteAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const validatePin = (value) => {
    if (!value.trim()) return "กรุณากรอก PIN";
    if (!/^\d{6}$/.test(value.trim())) return "PIN ต้องเป็นตัวเลข 6 หลัก";
    return "";
  };

  const handleFavoriteTransferClick = (fav) => {
    setSelectedFavorite(fav);
    setPin("");
    setPinError("");
    setPinModalOpen(true);
  };

  const handleConfirmFavoritePin = () => {
    const err = validatePin(pin);
    setPinError(err);
    if (err) return;
    if (!selectedFavorite) return;

    navigate(`/transfer?to=${encodeURIComponent(selectedFavorite.accountNo)}`);
    setPinModalOpen(false);
    setSelectedFavorite(null);
    setPin("");
    setPinError("");
  };

  const handleCloseFavoriteModal = () => {
    setPinModalOpen(false);
    setSelectedFavorite(null);
    setPin("");
    setPinError("");
  };

  if (loading) {
    return <div className="dashboard-container">กำลังโหลดข้อมูล...</div>;
  }

  const isFrozen = account?.status === "อายัดบัญชี";

  const getTransactionDescription = (t, typeText) => {
    if (typeText === "ฝากเงิน") {
      return "ฝากเงินผ่านระบบออนไลน์";
    }
    if (typeText === "ถอนเงิน") {
      return "ถอนเงินผ่านระบบออนไลน์";
    }
    return `${t.fromAccount || "-"} ➜ ${t.toAccount || "-"}`;
  };

  const renderBalanceSection = () => {
    if (!account) {
      return (
        <>
          <h1 className="balance-amount">- ฿</h1>
          <p className="account-info">กรุณาเปิดบัญชีก่อนใช้งาน</p>
        </>
      );
    }

    if (isFrozen) {
      return (
        <>
          <h1 className="balance-amount">- ฿</h1>
          <p className="account-info">
            บัญชีนี้ถูกอายัด ไม่สามารถทำรายการได้
            <br />
            เลขที่บัญชี: {account?.accountId}
          </p>
        </>
      );
    }

    return (
      <>
        <h1 className="balance-amount">
          {account?.balance?.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          ฿
        </h1>
        <p className="account-info">
          {account?.member?.firstNameTh} {account?.member?.lastNameTh}
          <br />
          เลขที่บัญชี: {account?.accountId}
        </p>
      </>
    );
  };

  return (
    <div className="dashboard-container">
      <div className={`balance-card ${isFrozen ? "balance-frozen" : ""}`}>
        <div className="balance-header">
          <div>
            <p className="balance-label">ยอดเงินคงเหลือ</p>
            {renderBalanceSection()}
          </div>
          <div className="balance-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9h18v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V9z"
                fill="currentColor"
                opacity="0.3"
              />
              <path
                d="M3 9V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v3M3 9h18M8 13h8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        {isFrozen && (
          <div className="balance-warning">
            บัญชีหลักของคุณถูกอายัด โปรดติดต่อ Digibank เพื่อดำเนินการปลดอายัด
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h2 className="section-title">เมนูลัด</h2>
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

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">บัญชีโปรด</h2>
            <Link to="/favorites" className="section-link">
              จัดการ
            </Link>
          </div>
          <div className="favorites-list">
            {favoriteAccounts.length > 0 ? (
              favoriteAccounts.map((fav) => (
                <div key={fav.accountNo} className="favorite-item">
                  <div className="favorite-info">
                    <p className="favorite-name">{fav.name}</p>
                    <p className="favorite-account">{fav.accountNo}</p>
                    <p className="favorite-bank">{fav.bank}</p>
                  </div>
                  <button
                    type="button"
                    className="favorite-action"
                    onClick={() => handleFavoriteTransferClick(fav)}
                  >
                    โอนเงิน
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>ยังไม่มีบัญชีโปรด</p>
                <Link to="/favorites" className="btn-add-favorite">
                  + เพิ่มบัญชีโปรด
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">รายการล่าสุด</h2>
            <Link to="/transactions" className="section-link">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="transactions-list">
            {recentTransactions.length === 0 ? (
              <div className="empty-state">
                <p>ยังไม่มีรายการธุรกรรม</p>
              </div>
            ) : (
              recentTransactions.map((t) => {
                const typeText = mapTypeToThai(t.type);
                return (
                  <div key={t.transientId} className="transaction-item">
                    <div
                      className={`transaction-icon ${typeText || "payment"}`}
                    >
                      {typeText === "รับเงิน" && "↓"}
                      {typeText === "โอนเงิน" && "→"}
                      {typeText === "ฝากเงิน" && "+"}
                      {typeText === "ถอนเงิน" && "−"}
                      {!["รับเงิน", "โอนเงิน", "ฝากเงิน", "ถอนเงิน"].includes(
                        typeText
                      ) && "💳"}
                    </div>

                    <div className="transaction-details">
                      <div className="transaction-main">
                        <h4 className="transaction-category">{typeText}</h4>
                        <p className="transaction-description">
                          {getTransactionDescription(t, typeText)}
                        </p>
                      </div>
                      <div className="transaction-meta">
                        <span className="transaction-date">
                          {t.transactionDate
                            ? new Date(
                                toTimeValue(t.transactionDate)
                              ).toLocaleString("th-TH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "-"}
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
                        {t.amount?.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ฿
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {pinModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginBottom: 16 }}>ยืนยัน PIN เพื่อใช้บัญชีโปรด</h2>
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
                onClick={handleConfirmFavoritePin}
                style={{ flex: 1 }}
              >
                ยืนยัน PIN
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={handleCloseFavoriteModal}
                style={{ flex: 1 }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
