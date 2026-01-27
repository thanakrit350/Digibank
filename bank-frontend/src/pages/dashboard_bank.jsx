import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import { getAccountsByMember, getTransactionsByAccount } from "../lib/api";
import { useTranslation } from "react-i18next";

const toTimeValue = (raw) => {
  if (!raw) return 0;
  if (Array.isArray(raw)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  return new Date(raw).getTime();
};

export default function DashboardBank() {
  const { t, i18n } = useTranslation();
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

  const extractOwnerKey = (memberObj) => {
    const id = extractMemberId(memberObj);
    const username = memberObj?.username || memberObj?.member?.username || null;
    return String(id || username || "").trim() || null;
  };

  const favoritesStorageKey = (ownerKey) =>
    ownerKey ? `favoriteAccounts:${ownerKey}` : "favoriteAccounts:guest";

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
      return active.find((a) => a.accountId === primaryId) || active[0] || frozen[0];
    }
    return active[0] || frozen[0];
  };

  const loadTransactions = async (accountId) => {
    const txRes = await getTransactionsByAccount(accountId);
    let txArray = [];
    if (Array.isArray(txRes)) txArray = txRes;
    else if (txRes) txArray = [txRes];

    const sorted = [...txArray].sort(
      (a, b) => toTimeValue(b.transactionDate) - toTimeValue(a.transactionDate)
    );

    setRecentTransactions(sorted.slice(0, 4));
  };

  const loadFavorites = (ownerKey) => {
    const key = favoritesStorageKey(ownerKey);
    const storedFavs = localStorage.getItem(key);
    if (!storedFavs) {
      setFavoriteAccounts([]);
      return;
    }
    try {
      const parsed = JSON.parse(storedFavs);
      setFavoriteAccounts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFavoriteAccounts([]);
    }
  };

  const cleanupAndStop = () => {
    setAccount(null);
    setRecentTransactions([]);
    setFavoriteAccounts([]);
  };

  const resetAccountState = () => {
    setAccount(null);
    setRecentTransactions([]);
    localStorage.removeItem("primaryAccountId");
  };

  const updatePrimaryAccountStorage = (acc) => {
    if (acc.status === "อายัดบัญชี") localStorage.removeItem("primaryAccountId");
    else localStorage.setItem("primaryAccountId", acc.accountId);
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
        const ownerKey = extractOwnerKey(memberObj);

        if (!memberId || !ownerKey) {
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

        loadFavorites(ownerKey);
      } catch {
        setFavoriteAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const validatePin = (value) => {
    const v = (value || "").trim();
    if (!v) return t("dashboard.pinModal.errRequired");
    if (!/^\d{6}$/.test(v)) return t("dashboard.pinModal.errFormat");
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
    return <div className="dashboard-container">{t("dashboard.loading")}</div>;
  }

  const isFrozen = account?.status === "อายัดบัญชี";

  const normalizeTypeKey = (rawType) => {
    const v = (rawType || "").toString().trim().toLowerCase();
    if (v === "receive" || v === "รับเงิน") return "receive";
    if (v === "transfer" || v === "โอนเงิน") return "transfer";
    if (v === "deposit" || v === "ฝากเงิน") return "deposit";
    if (v === "withdraw" || v === "ถอนเงิน") return "withdraw";
    return "";
  };

  const typeLabel = (typeKey) => {
    if (typeKey === "receive") return t("dashboard.txType.receive");
    if (typeKey === "transfer") return t("dashboard.txType.transfer");
    if (typeKey === "deposit") return t("dashboard.txType.deposit");
    if (typeKey === "withdraw") return t("dashboard.txType.withdraw");
    return "";
  };

  const getTransactionDescription = (tx, typeText) => {
    if (typeText === t("dashboard.txType.deposit")) return t("dashboard.txDesc.deposit");
    if (typeText === t("dashboard.txType.withdraw")) return t("dashboard.txDesc.withdraw");
    return t("dashboard.txDesc.transferFormat", {
      from: tx.fromAccount || t("dashboard.txDesc.dash"),
      to: tx.toAccount || t("dashboard.txDesc.dash"),
    });
  };

  const renderBalanceSection = () => {
    if (!account) {
      return (
        <>
          <h1 className="balance-amount">{t("dashboard.balance.noAccountAmount")}</h1>
          <p className="account-info">{t("dashboard.balance.noAccountInfo")}</p>
        </>
      );
    }

    if (isFrozen) {
      return (
        <>
          <h1 className="balance-amount">{t("dashboard.balance.frozenAmount")}</h1>
          <p className="account-info">
            {t("dashboard.balance.frozenInfoLine1")}
            <br />
            {t("dashboard.balance.accountNo", { accountId: account?.accountId })}
          </p>
        </>
      );
    }

    const firstName =
      i18n.language === "en"
        ? account?.member?.firstNameEn || account?.member?.firstNameTh || account?.member?.firstName || ""
        : account?.member?.firstNameTh || account?.member?.firstNameEn || account?.member?.firstName || "";

    const lastName =
      i18n.language === "en"
        ? account?.member?.lastNameEn || account?.member?.lastNameTh || account?.member?.lastName || ""
        : account?.member?.lastNameTh || account?.member?.lastNameEn || account?.member?.lastName || "";

    return (
      <>
        <h1 className="balance-amount">
          {account?.balance?.toLocaleString(i18n.language === "en" ? "en-US" : "th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          ฿
        </h1>
        <p className="account-info">
          {t("dashboard.balance.owner", { firstName, lastName })}
          <br />
          {t("dashboard.balance.accountNo", { accountId: account?.accountId })}
        </p>
      </>
    );
  };

  const shortLabel = (key) => {
    if (i18n.language === "en") return t(`dashboard.quick.short.${key}`);
    if (key === "transfer") return t("dashboard.quick.short.transfer");
    if (key === "deposit") return t("dashboard.quick.short.deposit");
    if (key === "withdraw") return t("dashboard.quick.short.withdraw");
    if (key === "summary") return t("dashboard.quick.short.summary");
    if (key === "check") return t("dashboard.quick.short.check");
    return "";
  };

  return (
    <div className="dashboard-container">
      <div className={`balance-card ${isFrozen ? "balance-frozen" : ""}`}>
        <div className="balance-header">
          <div>
            <p className="balance-label">{t("dashboard.balance.label")}</p>
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
        {isFrozen && <div className="balance-warning">{t("dashboard.balance.warning")}</div>}
      </div>

      <div className="quick-actions">
        <h2 className="section-title">{t("dashboard.quick.title")}</h2>
        <div className="actions-grid">
          <Link to="/transfer" className="action-card">
            <div className="action-icon transfer">{shortLabel("transfer")}</div>
            <span className="action-label">{t("dashboard.quick.transfer")}</span>
          </Link>

          <Link to="/deposit" className="action-card">
            <div className="action-icon deposit">{shortLabel("deposit")}</div>
            <span className="action-label">{t("dashboard.quick.deposit")}</span>
          </Link>

          <Link to="/withdraw" className="action-card">
            <div className="action-icon withdraw">{shortLabel("withdraw")}</div>
            <span className="action-label">{t("dashboard.quick.withdraw")}</span>
          </Link>

          <Link to="/summary" className="action-card">
            <div className="action-icon summary">{shortLabel("summary")}</div>
            <span className="action-label">{t("dashboard.quick.summary")}</span>
          </Link>

          <Link to="/check-account" className="action-card">
            <div className="action-icon check">{shortLabel("check")}</div>
            <span className="action-label">{t("dashboard.quick.checkAccount")}</span>
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">{t("dashboard.favorites.title")}</h2>
            <Link to="/favorites" className="section-link">
              {t("dashboard.favorites.manage")}
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
                  <button type="button" className="favorite-action" onClick={() => handleFavoriteTransferClick(fav)}>
                    {t("dashboard.favorites.transferBtn")}
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>{t("dashboard.favorites.empty")}</p>
                <Link to="/favorites" className="btn-add-favorite">
                  {t("dashboard.favorites.add")}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">{t("dashboard.recent.title")}</h2>
            <Link to="/transactions" className="section-link">
              {t("dashboard.recent.viewAll")}
            </Link>
          </div>
          <div className="transactions-list">
            {recentTransactions.length === 0 ? (
              <div className="empty-state">
                <p>{t("dashboard.recent.empty")}</p>
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const typeKey = normalizeTypeKey(tx.type);
                const typeText = typeLabel(typeKey);

                return (
                  <div key={tx.transientId} className="transaction-item">
                    <div className={`transaction-icon ${typeText || "payment"}`}>
                      {typeKey === "receive" && "↓"}
                      {typeKey === "transfer" && "→"}
                      {typeKey === "deposit" && "+"}
                      {typeKey === "withdraw" && "−"}
                      {!["receive", "transfer", "deposit", "withdraw"].includes(typeKey) && "💳"}
                    </div>

                    <div className="transaction-details">
                      <div className="transaction-main">
                        <h4 className="transaction-category">{typeText}</h4>
                        <p className="transaction-description">{getTransactionDescription(tx, typeText)}</p>
                      </div>
                      <div className="transaction-meta">
                        <span className="transaction-date">
                          {tx.transactionDate
                            ? new Date(toTimeValue(tx.transactionDate)).toLocaleString(i18n.language === "en" ? "en-US" : "th-TH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="transaction-amount-section">
                      <div className={`transaction-amount ${tx.amount >= 0 ? "positive" : "negative"}`}>
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount?.toLocaleString(i18n.language === "en" ? "en-US" : "th-TH", {
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
            <h2 style={{ marginBottom: 16 }}>{t("dashboard.pinModal.title")}</h2>
            <input
              type="password"
              className={`deposit-input ${pinError ? "error" : ""}`}
              placeholder={t("dashboard.pinModal.placeholder")}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (pinError) setPinError("");
              }}
              maxLength={6}
              style={{ marginBottom: 8 }}
            />
            {pinError && <p className="err-text">{pinError}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16, width: "100%" }}>
              <button type="button" className="next-btn" onClick={handleConfirmFavoritePin} style={{ flex: 1 }}>
                {t("dashboard.pinModal.confirm")}
              </button>
              <button type="button" className="modal-cancel-btn" onClick={handleCloseFavoriteModal} style={{ flex: 1 }}>
                {t("dashboard.pinModal.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
