import React, { useEffect, useState, useMemo } from "react";
import { getTransactions, getAccountsByMember } from "../../lib/api";
import "../../styles/summary.css";

export default function Summary() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
        const memberId =
          memberObj.memberId || memberObj.id || memberObj.member?.memberId;

        if (!memberId) {
          setAllRows([]);
          setLoading(false);
          return;
        }

        const [txList, accList] = await Promise.all([
          getTransactions(),
          getAccountsByMember(memberId),
        ]);

        const activeAccountIds = new Set(
          accList
            .filter((acc) => acc.status === "เปิดใช้งาน")
            .map((acc) => acc.accountId)
        );

        const primaryAccountId = localStorage.getItem("primaryAccountId");

        const mapped = txList
          .map((tx) => ({
            type: mapTypeToThai(tx.type),
            amount: tx.amount,
            date: tx.transactionDate,
            accountId: tx.accountId || tx.account?.accountId,
          }))
          .filter((t) => t.accountId && activeAccountIds.has(t.accountId));

        const filteredByAccount = primaryAccountId
          ? mapped.filter((t) => t.accountId === primaryAccountId)
          : mapped;

        const agg = {};

        filteredByAccount.forEach((t) => {
          const timeValue = toTimeValue(t.date);
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

          const amountAbs = Math.abs(t.amount || 0);

          if (t.type === "ฝากเงิน" || t.type === "deposit") {
            agg[key].deposit += amountAbs;
          } else if (t.type === "ถอนเงิน" || t.type === "withdraw") {
            agg[key].withdraw += amountAbs;
          } else if (t.type === "โอนเงิน" || t.type === "transfer") {
            agg[key].transfer += amountAbs;
          } else if (t.type === "รับเงิน" || t.type === "receive") {
            agg[key].receive += amountAbs;
          }
        });

        const rowsSorted = Object.values(agg).sort(
          (a, b) => a.dateObj - b.dateObj
        );

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

  const filteredRows = useMemo(() => {
    if (!allRows.length) return [];

    let start = null;
    let end = null;

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    return allRows.filter((r) => {
      if (start && r.dateObj < start) return false;
      if (end && r.dateObj > end) return false;
      return true;
    });
  }, [allRows, startDate, endDate]);

  const rowsToRender = filteredRows;

  const handleClearDate = () => {
    setStartDate("");
    setEndDate("");
  };

  const showReceiveColumn = rowsToRender.some((row) => row.receive > 0);

  return (
    <div className="summary-page">
      <div className="summary-container">
        <div className="summary-header">
          <h1 className="page-title">สรุปยอดรายการ</h1>
          <p className="page-subtitle">รายงานสรุปธุรกรรมรายวัน</p>
        </div>

        <div className="date-filter-card">
          <div className="filter-section">
            <div className="date-input-group">
              <label className="date-label">จากวันที่</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="date-input-group">
              <label className="date-label">ถึงวันที่</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>

            <button
              type="button"
              onClick={handleClearDate}
              className="clear-date-btn"
            >
              <span className="btn-icon">×</span>
              ล้างวันที่
            </button>
          </div>

          <div className="filter-hint">
            💡 ถ้าไม่เลือกวันที่ จะแสดงข้อมูลทั้งหมด
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon loading">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="60"
                  strokeDashoffset="15"
                  strokeLinecap="round"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            </div>
            <p className="empty-text">กำลังโหลดข้อมูล...</p>
          </div>
        ) : rowsToRender.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <p className="empty-text">ไม่พบข้อมูลสรุปในช่วงวันที่ที่เลือก</p>
          </div>
        ) : (
          <div className="table-card">
            <div className="table-header">
              <h3 className="table-title">รายงานรายวัน</h3>
              <div className="table-badge">{rowsToRender.length} รายการ</div>
            </div>

            <div className="table-wrapper">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th className="th-date">วันที่</th>
                    <th className="th-amount">ยอดฝาก</th>
                    <th className="th-amount">ยอดถอน</th>
                    <th className="th-amount">ยอดโอน</th>
                    {showReceiveColumn && (
                      <th className="th-amount">ยอดรับ</th>
                    )}
                    <th className="th-total">รวมทั้งวัน</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsToRender.map((r) => {
                    const total =
                      r.deposit + r.receive - r.withdraw - r.transfer;
                    return (
                      <tr key={r.dateKey} className="table-row">
                        <td className="td-date">
                          <div className="date-cell">
                            <span className="date-day">
                              {r.dateObj.toLocaleDateString("th-TH", {
                                day: "2-digit",
                              })}
                            </span>
                            <span className="date-month-year">
                              {r.dateObj.toLocaleDateString("th-TH", {
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="td-amount positive">
                          +{r.deposit.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="td-amount negative">
                          -{r.withdraw.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="td-amount negative">
                          -{r.transfer.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        {showReceiveColumn && (
                          <td className="td-amount positive">
                            +{r.receive.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        )}
                        <td
                          className={`td-total ${
                            total >= 0 ? "positive" : "negative"
                          }`}
                        >
                          <span className="total-badge">
                            {total >= 0 ? "+" : ""}
                            {total.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            ฿
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
