import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { getAccountsByMember, getTransactions, addAccount } from "../../lib/api";
import "../../styles/transaction.css";
import TransactionSlip from "./transactions_slip";
import { useTranslation } from "react-i18next";

const toTimeValue = (raw) => {
  if (!raw) return 0;
  if (Array.isArray(raw)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  return new Date(raw).getTime();
};

const normalizeTypeKey = (rawType) => {
  const v = (rawType || "").toString().trim().toLowerCase();
  if (v === "receive" || v === "รับเงิน") return "receive";
  if (v === "transfer" || v === "โอนเงิน") return "transfer";
  if (v === "deposit" || v === "ฝากเงิน") return "deposit";
  if (v === "withdraw" || v === "ถอนเงิน") return "withdraw";
  return "";
};

const normalizeStatusKey = (rawStatus) => {
  const v = (rawStatus || "").toString().trim().toLowerCase();
  if (v === "ยกเลิก" || v === "cancel" || v === "canceled" || v === "cancelled") return "canceled";
  if (v === "สำเร็จ" || v === "success" || v === "successful") return "success";
  return "pending";
};

export default function Transaction() {
  const { t, i18n } = useTranslation();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [openAccountForm, setOpenAccountForm] = useState({ memberId: "", pin: "" });
  const [openAccountError, setOpenAccountError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [slipOpen, setSlipOpen] = useState(false);
  const [selectedTransactionForSlip, setSelectedTransactionForSlip] = useState(null);

  const [startParts, setStartParts] = useState({ day: "", month: "", year: "" });
  const [endParts, setEndParts] = useState({ day: "", month: "", year: "" });

  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const locale = i18n.language === "en" ? "en-US" : "th-TH";

  const pad2 = (n) => String(n).padStart(2, "0");

  const toDateString = (year, month, day) => {
    if (!year || !month || !day) return "";
    return `${year}-${pad2(month)}-${pad2(day)}`;
  };

  const daysInMonth = (year, month) => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  };

  const monthLabels =
    i18n.language === "th"
      ? ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
      : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const yearRange = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const minYear = thisYear - 50;
    const maxYear = thisYear;
    const years = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);
    return years;
  }, []);

  const YearOptionLabel = (y) => (i18n.language === "th" ? y + 543 : y);

  const currentStartDate = useMemo(
    () => toDateString(startParts.year, startParts.month, startParts.day),
    [startParts]
  );
  const currentEndDate = useMemo(
    () => toDateString(endParts.year, endParts.month, endParts.day),
    [endParts]
  );

  const handleSelectAccount = (account) => {
    if (account.status === "อายัดบัญชี") return;
    setSelectedAccount(account);
    localStorage.setItem("primaryAccountId", account.id);
    localStorage.setItem("primaryAccount", JSON.stringify(account));
    setPage(1);
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
      const memberId = memberObj.memberId || memberObj.id || memberObj.member?.memberId;

      if (!memberId) {
        setAccounts([]);
        setSelectedAccount(null);
        localStorage.removeItem("primaryAccountId");
        localStorage.removeItem("primaryAccount");
        return;
      }

      const accList = await getAccountsByMember(memberId);
      const list = Array.isArray(accList) ? accList : accList ? [accList] : [];

      const mapped = list.map((acc) => ({
        id: acc.accountId,
        accountNumber: acc.accountId,
        hasMember: !!acc.member,
        firstNameTh: acc.member?.firstNameTh || "",
        firstNameEn: acc.member?.firstNameEn || "",
        username: acc.member?.username || "",
        balance: acc.balance ?? 0,
        limit: 200000,
        status: acc.status,
        createdDate: acc.createdDate,
      }));

      const sorted = mapped.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
      setAccounts(sorted);

      const storedPrimaryId = localStorage.getItem("primaryAccountId");
      const selectable = sorted.filter((a) => a.status !== "อายัดบัญชี");

      let nextSelected = null;
      if (storedPrimaryId) nextSelected = selectable.find((a) => a.id === storedPrimaryId) || null;
      if (!nextSelected && selectable.length > 0) nextSelected = selectable[0];

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
      setLoading(true);
      const txList = await getTransactions();
      const list = Array.isArray(txList) ? txList : txList ? [txList] : [];

      const mappedTx = list.map((tx) => ({
        id: tx.transientId,
        referenceNo: tx.transientId,
        typeKey: normalizeTypeKey(tx.type),
        rawType: tx.type || "",
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

  const accountsView = useMemo(() => {
    return accounts.map((acc) => {
      const displayName =
        i18n.language === "en"
          ? acc.firstNameEn || acc.firstNameTh || acc.username || ""
          : acc.firstNameTh || acc.firstNameEn || acc.username || "";

      return {
        ...acc,
        accountName: acc.hasMember ? t("transactions.accountNameFormat", { name: displayName }) : t("transactions.defaultAccountName"),
        statusText: acc.status === "อายัดบัญชี" ? t("transactions.status.frozen") : t("transactions.status.active"),
      };
    });
  }, [accounts, i18n.language, t]);

  const getAccountName = (accNumber) => {
    if (!accNumber) return t("transactions.txDesc.dash");
    const found = accountsView.find((a) => String(a.accountNumber) === String(accNumber));
    return found ? found.accountName : accNumber;
  };

  const transactionsView = useMemo(() => {
    return transactions.map((tx) => {
      const typeText = tx.typeKey ? t(`transactions.txType.${tx.typeKey}`) : tx.rawType || "";
      const statusKey = normalizeStatusKey(tx.status);
      const statusText = t(`transactions.txStatus.${statusKey}`);
      return { ...tx, typeText, statusKey, statusText };
    });
  }, [transactions, i18n.language, t]);

  const filteredTransactions = useMemo(() => {
    const base = transactionsView
      .filter((row) => row.accountId === selectedAccount?.id)
      .filter((row) => filterType === "all" || row.typeKey === filterType)
      .filter((row) => {
        if (!searchTerm.trim()) return true;

        const keyword = searchTerm.toLowerCase();
        const textFields = [
          row.id,
          row.typeText,
          row.fromAccount,
          row.fromAccountName,
          row.toAccount,
          row.toAccountName,
          row.accountId,
          row.statusText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const amountMatch = row.amount?.toString().includes(keyword.replace(/,/g, ""));
        return textFields.includes(keyword) || amountMatch;
      });

    let start = null;
    let end = null;

    if (appliedStart) {
      start = new Date(appliedStart);
      start.setHours(0, 0, 0, 0);
    }
    if (appliedEnd) {
      end = new Date(appliedEnd);
      end.setHours(23, 59, 59, 999);
    }

    return base.filter((r) => {
      const d = new Date(toTimeValue(r.date));
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [transactionsView, selectedAccount, filterType, searchTerm, appliedStart, appliedEnd]);

  const activeTransactions = useMemo(() => {
    return filteredTransactions.filter((row) => row.statusKey !== "canceled");
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return activeTransactions.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  }, [activeTransactions]);

  const totalExpense = useMemo(() => {
    return activeTransactions.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);
  }, [activeTransactions]);

  const getTransactionDescription = (row) => {
    if (row.typeKey === "deposit") return t("transactions.txDesc.deposit");
    if (row.typeKey === "withdraw") return t("transactions.txDesc.withdraw");
    return t("transactions.txDesc.format", {
      from: row.fromAccount || t("transactions.txDesc.dash"),
      to: row.toAccount || t("transactions.txDesc.dash"),
    });
  };

  const getStatusBadgeClass = (row) => {
    if (row.statusKey === "success") return "status-success";
    if (row.statusKey === "canceled") return "status-cancel";
    return "status-pending";
  };

  const handleOpenAccountChange = (e) => {
    const { name, value } = e.target;
    setOpenAccountForm((prev) => ({ ...prev, [name]: value }));
    setOpenAccountError("");
  };

  const handleOpenAccountSubmit = async (e) => {
    e.preventDefault();
    const memberIdInput = openAccountForm.memberId.trim();
    const pinInput = openAccountForm.pin.trim();

    if (!memberIdInput) {
      setOpenAccountError(t("transactions.validation.memberIdRequired"));
      return;
    }
    if (!/^\d{13}$/.test(memberIdInput)) {
      setOpenAccountError("เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");
      return;
    }
    if (!pinInput) {
      setOpenAccountError(t("transactions.validation.pinRequired"));
      return;
    }
    if (!/^\d{6}$/.test(pinInput)) {
      setOpenAccountError(t("transactions.validation.pin6digits"));
      return;
    }

    try {
      setSubmitting(true);

      const payload = { memberId: memberIdInput, pin: pinInput };
      console.log("OPEN ACCOUNT payload:", payload);

      await addAccount(payload);

      await fetchAccounts();
      setOpenAccountModal(false);
      setOpenAccountForm({ memberId: "", pin: "" });
      setOpenAccountError("");
    } catch (err) {
      setOpenAccountError(err?.response?.data?.message || t("transactions.validation.openAccountFail"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSlip = (row) => {
    const transactionForSlip = {
      type: row.typeKey ? t(`slip.txType.${row.typeKey}`) : row.typeText || row.rawType || "",
      amount: Math.abs(row.amount || 0),
      transactionDate: row.date,
      fromAccount: row.fromAccount,
      toAccount: row.toAccount,
      referenceNo: row.referenceNo || row.id,
      fee: 0,
      accountNameFrom: row.typeKey === "deposit" ? t("transactions.slip.cash") : row.fromAccountName || getAccountName(row.fromAccount),
      accountNameTo: row.typeKey === "withdraw" ? t("transactions.slip.cash") : row.toAccountName || getAccountName(row.toAccount),
      qr: null,
    };
    setSelectedTransactionForSlip(transactionForSlip);
    setSlipOpen(true);
  };

  const handleCloseSlip = () => {
    setSlipOpen(false);
    setSelectedTransactionForSlip(null);
  };

  const handleApplySearch = () => {
    setAppliedStart(currentStartDate);
    setAppliedEnd(currentEndDate);
    setPage(1);
  };

  const handleClearDate = () => {
    setStartParts({ day: "", month: "", year: "" });
    setEndParts({ day: "", month: "", year: "" });
    setAppliedStart("");
    setAppliedEnd("");
    setPage(1);
  };

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;

    const rows = filteredTransactions.map((row, index) => ({
      [t("transactions.excel.no")]: index + 1,
      [t("transactions.excel.date")]: row.date
        ? new Date(toTimeValue(row.date)).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
        : "",
      [t("transactions.excel.type")]: row.typeText,
      [t("transactions.excel.amount")]: row.amount,
      [t("transactions.excel.status")]: row.statusText,
      [t("transactions.excel.fromAcc")]: row.fromAccount || "",
      [t("transactions.excel.fromName")]: row.fromAccountName || "",
      [t("transactions.excel.toAcc")]: row.toAccount || "",
      [t("transactions.excel.toName")]: row.toAccountName || "",
      [t("transactions.excel.accountId")]: row.accountId || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("transactions.export.sheetName"));
    XLSX.writeFile(wb, `transactions_${selectedAccount?.accountNumber || "all"}.xlsx`);
  };

  const DateSelectGroup = ({ label, parts, setParts }) => {
    const dim = daysInMonth(parts.year, parts.month);
    const dayOptions = Array.from({ length: dim }, (_, i) => i + 1);

    const onChangeYear = (e) => {
      const year = e.target.value;
      setParts((prev) => {
        const next = { ...prev, year };
        const nextDim = daysInMonth(year, next.month);
        if (next.day && Number(next.day) > nextDim) next.day = "";
        return next;
      });
    };

    const onChangeMonth = (e) => {
      const month = e.target.value;
      setParts((prev) => {
        const next = { ...prev, month };
        const nextDim = daysInMonth(next.year, month);
        if (next.day && Number(next.day) > nextDim) next.day = "";
        return next;
      });
    };

    const onChangeDay = (e) => setParts((prev) => ({ ...prev, day: e.target.value }));

    return (
      <div className="tx-date-group">
        <label className="tx-date-label">{label}</label>
        <div className="tx-date-row">
          <select className="tx-date-select" value={parts.day} onChange={onChangeDay}>
            <option value="">{i18n.language === "th" ? "วัน" : "Day"}</option>
            {dayOptions.map((d) => (
              <option key={d} value={String(d)}>
                {String(d)}
              </option>
            ))}
          </select>

          <select className="tx-date-select" value={parts.month} onChange={onChangeMonth}>
            <option value="">{i18n.language === "th" ? "เดือน" : "Month"}</option>
            {monthLabels.map((m, idx) => (
              <option key={m} value={String(idx + 1)}>
                {m}
              </option>
            ))}
          </select>

          <select className="tx-date-select" value={parts.year} onChange={onChangeYear}>
            <option value="">{i18n.language === "th" ? "ปี" : "Year"}</option>
            {yearRange.map((y) => (
              <option key={y} value={String(y)}>
                {YearOptionLabel(y)}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedTransactions = useMemo(() => {
    const startIdx = (safePage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredTransactions, safePage]);

  const startNo = (safePage - 1) * PAGE_SIZE;

  return (
    <div className="transaction-page">
      <div className="transaction-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 className="page-title">{t("transactions.title")}</h1>
          <button className="open-account-btn" type="button" onClick={() => setOpenAccountModal(true)}>
            {t("transactions.openNewAccount")}
          </button>
        </div>

        <div className="account-selector">
          {accountsView.map((account) => (
            <button
              key={account.id}
              type="button"
              className={`account-card ${selectedAccount?.id === account.id ? "selected" : ""} ${
                account.status === "อายัดบัญชี" ? "account-disabled" : ""
              }`}
              onClick={() => handleSelectAccount(account)}
            >
              <div className="account-card-header">
                <div className="account-type-badge">{t("transactions.accountTypeSaving")}</div>
                <div className={`account-status ${account.status === "อายัดบัญชี" ? "frozen" : "active"}`}>
                  ● {account.statusText}
                </div>
              </div>
              <h3 className="account-name">{account.accountName}</h3>
              <p className="account-number">{account.accountNumber}</p>
              <div className="account-balance">
                <span className="balance-label">{t("transactions.balance.label")}</span>
                <span className="balance-amount">
                  {account.balance.toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="quick-actions">
          <div className="actions-grid">
            <Link to="/transfer" className="action-card">
              <div className="action-icon transfer">{t("transactions.quick.transferShort")}</div>
              <span className="action-label">{t("transactions.quick.transfer")}</span>
            </Link>

            <Link to="/deposit" className="action-card">
              <div className="action-icon deposit">{t("transactions.quick.depositShort")}</div>
              <span className="action-label">{t("transactions.quick.deposit")}</span>
            </Link>

            <Link to="/withdraw" className="action-card">
              <div className="action-icon withdraw">{t("transactions.quick.withdrawShort")}</div>
              <span className="action-label">{t("transactions.quick.withdraw")}</span>
            </Link>

            <Link to="/summary" className="action-card">
              <div className="action-icon summary">{t("transactions.quick.summaryShort")}</div>
              <span className="action-label">{t("transactions.quick.summary")}</span>
            </Link>

            <Link to="/check-account" className="action-card">
              <div className="action-icon check">{t("transactions.quick.checkShort")}</div>
              <span className="action-label">{t("transactions.quick.check")}</span>
            </Link>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat-card income">
            <div className="stat-icon">↓</div>
            <div className="stat-info">
              <p className="stat-label">{t("transactions.stats.income")}</p>
              <p className="stat-amount positive">+{totalIncome.toLocaleString(locale, { minimumFractionDigits: 2 })} ฿</p>
            </div>
          </div>

          <div className="stat-card expense">
            <div className="stat-icon">↑</div>
            <div className="stat-info">
              <p className="stat-label">{t("transactions.stats.expense")}</p>
              <p className="stat-amount negative">-{totalExpense.toLocaleString(locale, { minimumFractionDigits: 2 })} ฿</p>
            </div>
          </div>

          <div className="stat-card net">
            <div className="stat-icon">≈</div>
            <div className="stat-info">
              <p className="stat-label">{t("transactions.stats.net")}</p>
              <p className={`stat-amount ${totalIncome - totalExpense >= 0 ? "positive" : "negative"}`}>
                {totalIncome - totalExpense >= 0 ? "+" : ""}
                {(totalIncome - totalExpense).toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
              </p>
            </div>
          </div>
        </div>

        {/* ====== Date Filter (กดค้นหาเท่านั้น) ====== */}
        <div className="tx-date-filter-card">
          <div className="tx-date-filter-grid">
            <DateSelectGroup label={i18n.language === "th" ? "จากวันที่" : "From date"} parts={startParts} setParts={setStartParts} />
            <DateSelectGroup label={i18n.language === "th" ? "ถึงวันที่" : "To date"} parts={endParts} setParts={setEndParts} />

            <div className="tx-date-actions">
              <button type="button" className="tx-search-btn" onClick={handleApplySearch}>
                {i18n.language === "th" ? "ค้นหา" : "Search"}
              </button>
              <button type="button" className="tx-clear-btn" onClick={handleClearDate}>
                {i18n.language === "th" ? "ล้างวันที่" : "Clear date"}
              </button>
            </div>
          </div>
        </div>

        <div className="transaction-filters">
          <div className="filter-left">
            <button className={`filter-btn ${filterType === "all" ? "active" : ""}`} type="button" onClick={() => { setFilterType("all"); setPage(1); }}>
              {t("transactions.filters.all")}
            </button>
            <button className={`filter-btn ${filterType === "receive" ? "active" : ""}`} type="button" onClick={() => { setFilterType("receive"); setPage(1); }}>
              {t("transactions.filters.receive")}
            </button>
            <button className={`filter-btn ${filterType === "transfer" ? "active" : ""}`} type="button" onClick={() => { setFilterType("transfer"); setPage(1); }}>
              {t("transactions.filters.transfer")}
            </button>
            <button className={`filter-btn ${filterType === "deposit" ? "active" : ""}`} type="button" onClick={() => { setFilterType("deposit"); setPage(1); }}>
              {t("transactions.filters.deposit")}
            </button>
            <button className={`filter-btn ${filterType === "withdraw" ? "active" : ""}`} type="button" onClick={() => { setFilterType("withdraw"); setPage(1); }}>
              {t("transactions.filters.withdraw")}
            </button>
          </div>

          <div className="filter-right">
            <input
              type="text"
              className="search-input"
              placeholder={t("transactions.filters.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <div className="tx-page-info">
            {i18n.language === "th"
              ? `แสดง ${pagedTransactions.length ? startNo + 1 : 0}-${startNo + pagedTransactions.length} จาก ${filteredTransactions.length} รายการ`
              : `Showing ${pagedTransactions.length ? startNo + 1 : 0}-${startNo + pagedTransactions.length} of ${filteredTransactions.length}`}
          </div>

          <button className="export-btn" type="button" onClick={handleExportExcel} disabled={!filteredTransactions.length}>
            {t("transactions.export.xlsx")}
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-text">{t("transactions.empty.loading")}</p>
          </div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true" />
                <p className="empty-text">{t("transactions.empty.notFound")}</p>
              </div>
            ) : (
              <>
                {pagedTransactions.map((row, idx) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`transaction-item ${row.statusKey === "canceled" ? "tx-canceled" : ""}`}
                    onClick={() => handleOpenSlip(row)}
                  >
                    <div className="tx-no">{startNo + idx + 1}</div>

                    <div className={`transaction-icon ${row.typeKey || "payment"}`}>
                      {row.typeKey === "receive" && "↓"}
                      {row.typeKey === "transfer" && "→"}
                      {row.typeKey === "deposit" && "+"}
                      {row.typeKey === "withdraw" && "−"}
                      {!["receive", "transfer", "deposit", "withdraw"].includes(row.typeKey) && "💳"}
                    </div>

                    <div className="transaction-details">
                      <div className="transaction-main">
                        <h4 className="transaction-category">{row.typeText || row.rawType || ""}</h4>
                        <p className="transaction-description">{getTransactionDescription(row)}</p>
                      </div>
                      <div className="transaction-meta">
                        <span className="transaction-date">
                          {row.date
                            ? new Date(toTimeValue(row.date)).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
                            : t("transactions.txDesc.dash")}
                        </span>
                        <span className={`transaction-status-badge ${getStatusBadgeClass(row)}`}>{row.statusText}</span>
                      </div>
                    </div>

                    <div className="transaction-amount-section">
                      <div className={`transaction-amount ${row.amount >= 0 ? "positive" : "negative"}`}>
                        {row.amount >= 0 ? "+" : ""}
                        {row.amount.toLocaleString(locale, { minimumFractionDigits: 2 })} ฿
                      </div>
                    </div>
                  </button>
                ))}

                <div className="tx-pagination">
                  <button type="button" className="tx-page-btn" onClick={() => setPage(1)} disabled={safePage === 1}>
                    {i18n.language === "th" ? "หน้าแรก" : "First"}
                  </button>
                  <button type="button" className="tx-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                    {i18n.language === "th" ? "ก่อนหน้า" : "Prev"}
                  </button>

                  <span className="tx-page-current">
                    {i18n.language === "th" ? `หน้า ${safePage} / ${totalPages}` : `Page ${safePage} / ${totalPages}`}
                  </span>

                  <button type="button" className="tx-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                    {i18n.language === "th" ? "ถัดไป" : "Next"}
                  </button>
                  <button type="button" className="tx-page-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>
                    {i18n.language === "th" ? "หน้าสุดท้าย" : "Last"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {openAccountModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginBottom: 16 }}>{t("transactions.modal.openAccountTitle")}</h2>
            <form onSubmit={handleOpenAccountSubmit}>
              <div style={{ marginBottom: 12, textAlign: "left" }}>
                <label htmlFor="memberIdInput" style={{ fontSize: 14 }}>
                  {t("transactions.modal.memberIdLabel")}
                </label>
                <input
                  id="memberIdInput"
                  type="text"
                  name="memberId"
                  value={openAccountForm.memberId}
                  onChange={handleOpenAccountChange}
                  className="modal-input"
                  placeholder={t("transactions.modal.memberIdPlaceholder")}
                />
              </div>

              <div style={{ marginBottom: 12, textAlign: "left" }}>
                <label htmlFor="pinInput" style={{ fontSize: 14 }}>
                  {t("transactions.modal.pinLabel")}
                </label>
                <input
                  id="pinInput"
                  type="password"
                  name="pin"
                  value={openAccountForm.pin}
                  onChange={handleOpenAccountChange}
                  className="modal-input"
                  placeholder={t("transactions.modal.pinPlaceholder")}
                  maxLength={6}
                />
              </div>

              {openAccountError && (
                <p style={{ color: "#e63946", fontSize: 13, marginBottom: 8, textAlign: "left" }}>{openAccountError}</p>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button type="submit" className="next-btn" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? t("transactions.modal.submitting") : t("transactions.modal.submit")}
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
                  {t("transactions.modal.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {slipOpen && selectedTransactionForSlip && <TransactionSlip transaction={selectedTransactionForSlip} onClose={handleCloseSlip} />}
    </div>
  );
}
