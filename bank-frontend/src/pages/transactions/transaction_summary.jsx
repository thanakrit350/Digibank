import React, { useEffect, useState, useMemo } from "react";
import { getTransactions, getAccountsByMember } from "../../lib/api";
import "../../styles/summary.css";
import { useTranslation } from "react-i18next";

export default function Summary() {
  const { t, i18n } = useTranslation();

  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startParts, setStartParts] = useState({ day: "", month: "", year: "" });
  const [endParts, setEndParts] = useState({ day: "", month: "", year: "" });

  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

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

  const selectedStartDate = useMemo(() => toDateString(startParts.year, startParts.month, startParts.day), [startParts]);
  const selectedEndDate = useMemo(() => toDateString(endParts.year, endParts.month, endParts.day), [endParts]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedMember = localStorage.getItem("member");
        if (!storedMember) {
          setAllRows([]);
          setLoading(false);
          return;
        }

        const memberObj = JSON.parse(storedMember);
        const memberId = memberObj.memberId || memberObj.id || memberObj.member?.memberId;

        if (!memberId) {
          setAllRows([]);
          setLoading(false);
          return;
        }

        const [txList, accList] = await Promise.all([getTransactions(), getAccountsByMember(memberId)]);

        const activeAccountIds = new Set(accList.filter((acc) => acc.status === "เปิดใช้งาน").map((acc) => acc.accountId));
        const primaryAccountId = localStorage.getItem("primaryAccountId");

        const mapped = txList
          .map((tx) => ({
            type: mapTypeToThai(tx.type),
            amount: tx.amount,
            date: tx.transactionDate,
            accountId: tx.accountId || tx.account?.accountId,
          }))
          .filter((t) => t.accountId && activeAccountIds.has(t.accountId));

        const filteredByAccount = primaryAccountId ? mapped.filter((t) => t.accountId === primaryAccountId) : mapped;

        const agg = {};

        filteredByAccount.forEach((tx) => {
          const timeValue = toTimeValue(tx.date);
          const d = new Date(timeValue);
          const key = d.toISOString().slice(0, 10);

          if (!agg[key]) {
            agg[key] = {
              dateObj: d,
              dateKey: key,
              deposit: 0,
              withdraw: 0,
              transfer: 0,
              receive: 0,
            };
          }

          const amountAbs = Math.abs(tx.amount || 0);

          if (tx.type === "ฝากเงิน" || tx.type === "deposit") {
            agg[key].deposit += amountAbs;
          } else if (tx.type === "ถอนเงิน" || tx.type === "withdraw") {
            agg[key].withdraw += amountAbs;
          } else if (tx.type === "โอนเงิน" || tx.type === "transfer") {
            agg[key].transfer += amountAbs;
          } else if (tx.type === "รับเงิน" || tx.type === "receive") {
            agg[key].receive += amountAbs;
          }
        });

        const rowsSorted = Object.values(agg).sort((a, b) => a.dateObj - b.dateObj);
        setAllRows(rowsSorted);
      } catch (err) {
        console.error(err);
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const rowsToRender = useMemo(() => {
    if (!allRows.length) return [];

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

    return allRows.filter((r) => {
      if (start && r.dateObj < start) return false;
      if (end && r.dateObj > end) return false;
      return true;
    });
  }, [allRows, appliedStart, appliedEnd]);

  const showReceiveColumn = rowsToRender.some((row) => row.receive > 0);

  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const yearType = i18n.language === "th" ? "buddhist" : "gregory";
  const numLocale = i18n.language === "th" ? "th-TH" : "en-US";

  const renderDateDay = (d) =>
    d.toLocaleDateString(locale, {
      day: "2-digit",
      calendar: yearType,
    });

  const renderDateMonthYear = (d) =>
    d.toLocaleDateString(locale, {
      month: "short",
      year: "numeric",
      calendar: yearType,
    });

  const formatMoney = (n) =>
    Number(n || 0).toLocaleString(numLocale, {
      minimumFractionDigits: 2,
    });

  const YearOptionLabel = (y) => (i18n.language === "th" ? y + 543 : y);

  const isPartialDate = (parts) => {
    const hasAny = !!(parts.day || parts.month || parts.year);
    const hasAll = !!(parts.day && parts.month && parts.year);
    return hasAny && !hasAll;
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
      <div className="date-input-group">
        <label className="date-label">{label}</label>
        <div className="row" style={{ gap: 10 }}>
          <select className="date-input" value={parts.day} onChange={onChangeDay}>
            <option value="">{i18n.language === "th" ? "วัน" : "Day"}</option>
            {dayOptions.map((d) => (
              <option key={d} value={String(d)}>
                {String(d)}
              </option>
            ))}
          </select>

          <select className="date-input" value={parts.month} onChange={onChangeMonth}>
            <option value="">{i18n.language === "th" ? "เดือน" : "Month"}</option>
            {monthLabels.map((m, idx) => (
              <option key={m} value={String(idx + 1)}>
                {m}
              </option>
            ))}
          </select>

          <select className="date-input" value={parts.year} onChange={onChangeYear}>
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

  const handleSearch = () => {
    if (isPartialDate(startParts) || isPartialDate(endParts)) return;

    const s = selectedStartDate;
    const e = selectedEndDate;

    if (s && e) {
      const sDate = new Date(s);
      const eDate = new Date(e);
      sDate.setHours(0, 0, 0, 0);
      eDate.setHours(0, 0, 0, 0);
      if (sDate > eDate) return;
    }

    setAppliedStart(s);
    setAppliedEnd(e);
  };

  const handleClearDate = () => {
    setStartParts({ day: "", month: "", year: "" });
    setEndParts({ day: "", month: "", year: "" });
    setAppliedStart("");
    setAppliedEnd("");
  };

  const searchDisabled = isPartialDate(startParts) || isPartialDate(endParts) || (selectedStartDate && selectedEndDate && new Date(selectedStartDate) > new Date(selectedEndDate));

  let content = null;

  if (loading) {
    content = (
      <div className="empty-state">
        <div className="empty-icon loading">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="15" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <p className="empty-text">{t("summary.loading", { defaultValue: "กำลังโหลดข้อมูล..." })}</p>
      </div>
    );
  } else if (rowsToRender.length === 0) {
    content = (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <p className="empty-text">{t("summary.notFound", { defaultValue: "ไม่พบข้อมูลสรุปในช่วงวันที่ที่เลือก" })}</p>
      </div>
    );
  } else {
    content = (
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">{t("summary.tableTitle", { defaultValue: "รายงานรายวัน" })}</h3>
          <div className="table-badge">
            {rowsToRender.length} {t("summary.items", { defaultValue: "รายการ" })}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="summary-table">
            <thead>
              <tr>
                <th className="th-date">{t("summary.col.date", { defaultValue: "วันที่" })}</th>
                <th className="th-amount">{t("summary.col.deposit", { defaultValue: "ยอดฝาก" })}</th>
                <th className="th-amount">{t("summary.col.withdraw", { defaultValue: "ยอดถอน" })}</th>
                <th className="th-amount">{t("summary.col.transfer", { defaultValue: "ยอดโอน" })}</th>
                {showReceiveColumn && <th className="th-amount">{t("summary.col.receive", { defaultValue: "ยอดรับ" })}</th>}
                <th className="th-total">{t("summary.col.total", { defaultValue: "รวมทั้งวัน" })}</th>
              </tr>
            </thead>

            <tbody>
              {rowsToRender.map((r) => {
                const total = r.deposit + r.receive - r.withdraw - r.transfer;
                const totalClass = total >= 0 ? "positive" : "negative";
                const totalPrefix = total >= 0 ? "+" : "";

                return (
                  <tr key={r.dateKey} className="table-row">
                    <td className="td-date">
                      <div className="date-cell">
                        <span className="date-day">{renderDateDay(r.dateObj)}</span>
                        <span className="date-month-year">{renderDateMonthYear(r.dateObj)}</span>
                      </div>
                    </td>

                    <td className="td-amount positive">+{formatMoney(r.deposit)}</td>
                    <td className="td-amount negative">-{formatMoney(r.withdraw)}</td>
                    <td className="td-amount negative">-{formatMoney(r.transfer)}</td>

                    {showReceiveColumn && <td className="td-amount positive">+{formatMoney(r.receive)}</td>}

                    <td className={`td-total ${totalClass}`}>
                      <span className="total-badge">
                        {totalPrefix}
                        {formatMoney(total)} {t("summary.baht", { defaultValue: "฿" })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-page">
      <div className="summary-container">
        <div className="summary-header">
          <h1 className="page-title">{t("summary.title", { defaultValue: "สรุปยอดรายการ" })}</h1>
          <p className="page-subtitle">{t("summary.subtitle", { defaultValue: "รายงานสรุปธุรกรรมรายวัน" })}</p>
        </div>

        <div className="date-filter-card">
          <div className="filter-section">
            <DateSelectGroup label={t("summary.fromDate", { defaultValue: "จากวันที่" })} parts={startParts} setParts={setStartParts} />
            <DateSelectGroup label={t("summary.toDate", { defaultValue: "ถึงวันที่" })} parts={endParts} setParts={setEndParts} />

            <button type="button" onClick={handleSearch} className="search-btn" disabled={searchDisabled}>
              {t("summary.search", { defaultValue: "ค้นหา" })}
            </button>


            <button type="button" onClick={handleClearDate} className="clear-date-btn">
              <span className="btn-icon">×</span>
              {t("summary.clearDate", { defaultValue: "ล้างวันที่" })}
            </button>
          </div>

          <div className="filter-hint">{t("summary.hint", { defaultValue: "💡 ถ้าไม่เลือกวันที่ จะแสดงข้อมูลทั้งหมด" })}</div>
        </div>

        {content}
      </div>
    </div>
  );
}
