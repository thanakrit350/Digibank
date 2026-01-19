import React, { useEffect, useState } from "react";
import "../../styles/admin_dashboard.css";
import {
  getAccounts,
  getTransactions,
  updateAccountStatus,
  cancelTransaction,
} from "../../lib/api";

const toTimeValue = (raw) => {
  if (!raw) return 0;
  if (Array.isArray(raw)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = raw;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  return new Date(raw).getTime();
};

const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res) return [res];
  return [];
};

const getTxStatusClass = (status) => {
  if (status === "สำเร็จ") return "badge-success";
  if (status === "ยกเลิก") return "badge-cancel";
  return "badge-pending";
};

export default function AdminDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    mode: "", 
    target: null,
  });

  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });

  const [activeTab, setActiveTab] = useState("accounts");

  const [accountSearch, setAccountSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, txRes] = await Promise.all([
          getAccounts(),
          getTransactions(),
        ]);

        const accArray = toArray(accRes);
        const txArray = toArray(txRes);

        const sortedTx = [...txArray].sort(
          (a, b) =>
            toTimeValue(b.transactionDate) - toTimeValue(a.transactionDate)
        );

        setAccounts(accArray);
        setTransactions(sortedTx);
      } catch (e) {
        console.error("LOAD ADMIN DASHBOARD ERROR", e);
        setErrorModal({
          open: true,
          message: "ไม่สามารถโหลดข้อมูลได้",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openFreezeConfirm = (acc) => {
    const mode = acc.status === "อายัดบัญชี" ? "unfreeze" : "freeze";
    setConfirmModal({
      open: true,
      mode,
      target: acc,
    });
  };

  const openCancelTxConfirm = (tx) => {
    if (tx.status === "ยกเลิก") return;
    setConfirmModal({
      open: true,
      mode: "cancelTx",
      target: tx,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, mode: "", target: null });
  };

  const closeErrorModal = () => {
    setErrorModal({ open: false, message: "" });
  };

  const handleConfirm = async () => {
    if (!confirmModal.target) return;

    try {
      if (confirmModal.mode === "freeze" || confirmModal.mode === "unfreeze") {
        const status =
          confirmModal.mode === "freeze" ? "อายัดบัญชี" : "เปิดใช้งาน";

        const updated = await updateAccountStatus(
          confirmModal.target.accountId,
          { status }
        );

        setAccounts((prev) =>
          prev.map((a) => (a.accountId === updated.accountId ? updated : a))
        );
      } else if (confirmModal.mode === "cancelTx") {
        await cancelTransaction(confirmModal.target.transientId);

        setTransactions((prev) =>
          prev.map((t) =>
            t.transientId === confirmModal.target.transientId
              ? { ...t, status: "ยกเลิก" }
              : t
          )
        );
      }
    } catch (e) {
      console.error("ADMIN ACTION ERROR", e);
      setErrorModal({
        open: true,
        message:
          e?.response?.data?.message ||
          "ไม่สามารถดำเนินการได้ กรุณาลองใหม่",
      });
    } finally {
      closeConfirmModal();
    }
  };

  const accountSearchLower = accountSearch.trim().toLowerCase();
  const filteredAccounts = accounts.filter((acc) => {
    if (!accountSearchLower) return true;
    const name = acc.member
      ? `${acc.member.firstNameTh} ${acc.member.lastNameTh}`.toLowerCase()
      : "";
    const id = (acc.accountId || "").toLowerCase();
    const status = (acc.status || "").toLowerCase();

    return (
      name.includes(accountSearchLower) ||
      id.includes(accountSearchLower) ||
      status.includes(accountSearchLower)
    );
  });

  const txSearchLower = txSearch.trim().toLowerCase();
  const filteredTransactions = transactions.filter((t) => {
    if (!txSearchLower) return true;
    const id = (t.transientId || "").toLowerCase();
    const type = (t.type || "").toLowerCase();
    const fromAcc = (t.fromAccount || "").toLowerCase();
    const toAcc = (t.toAccount || "").toLowerCase();
    const status = (t.status || "").toLowerCase();

    return (
      id.includes(txSearchLower) ||
      type.includes(txSearchLower) ||
      fromAcc.includes(txSearchLower) ||
      toAcc.includes(txSearchLower) ||
      status.includes(txSearchLower)
    );
  });

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        กำลังโหลดข้อมูลผู้ดูแลระบบ...
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">Admin Dashboard</h1>
      <p className="admin-dashboard-subtitle">
        จัดการบัญชีและรายการธุรกรรมของระบบ Digibank
      </p>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${
            activeTab === "accounts" ? "active" : ""
          }`}
          onClick={() => setActiveTab("accounts")}
        >
          จัดการบัญชี
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${
            activeTab === "transactions" ? "active" : ""
          }`}
          onClick={() => setActiveTab("transactions")}
        >
          รายการธุรกรรมทั้งหมด
        </button>
      </div>

      <div className="admin-dashboard-grid">
        {activeTab === "accounts" && (
          <section className="admin-section">
            <div className="admin-section-header">
              <h2>จัดการบัญชี</h2>

              <div className="admin-search">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="ค้นหาตามเลขบัญชี / ชื่อ / สถานะ"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-search-btn"
                  onClick={() => {}}
                >
                  ค้นหา
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>เลขที่บัญชี</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ยอดเงิน</th>
                    <th>สถานะ</th>
                    <th>ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="admin-empty">
                        ไม่พบบัญชีที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <tr key={acc.accountId}>
                        <td>{acc.accountId}</td>
                        <td>
                          {acc.member
                            ? `${acc.member.firstNameTh} ${acc.member.lastNameTh}`
                            : "-"}
                        </td>
                        <td>
                          {acc.balance?.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ฿
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              acc.status === "เปิดใช้งาน"
                                ? "badge-active"
                                : "badge-frozen"
                            }`}
                          >
                            {acc.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-btn freeze"
                            onClick={() => openFreezeConfirm(acc)}
                          >
                            {acc.status === "อายัดบัญชี"
                              ? "ปลดอายัด"
                              : "อายัดบัญชี"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "transactions" && (
          <section className="admin-section">
            <div className="admin-section-header">
              <h2>รายการธุรกรรมทั้งหมด</h2>

              <div className="admin-search">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="ค้นหาตามรหัส / ประเภท  / สถานะ"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-search-btn"
                  onClick={() => {}}
                >
                  ค้นหา
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>รหัสธุรกรรม</th>
                    <th>ประเภท</th>
                    <th>จาก</th>
                    <th>ไปยัง</th>
                    <th>จำนวนเงิน</th>
                    <th>วันที่ทำรายการ</th>
                    <th>สถานะ</th>
                    <th>ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="admin-empty">
                        ไม่พบธุรกรรมที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.transientId}>
                        <td>{t.transientId}</td>
                        <td>{t.type}</td>
                        <td>{t.fromAccount || "-"}</td>
                        <td>{t.toAccount || "-"}</td>
                        <td
                          className={
                            t.amount >= 0
                              ? "amount-positive"
                              : "amount-negative"
                          }
                        >
                          {t.amount >= 0 ? "+" : ""}
                          {t.amount?.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ฿
                        </td>
                        <td>
                          {t.transactionDate
                            ? new Date(
                                toTimeValue(t.transactionDate)
                              ).toLocaleString("th-TH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge ${getTxStatusClass(t.status)}`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-btn cancel"
                            disabled={t.status === "ยกเลิก"}
                            onClick={() => openCancelTxConfirm(t)}
                          >
                            ยกเลิกรายการ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {confirmModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-icon error">!</div>
            <h2>ยืนยันการดำเนินการ</h2>
            <p>
              {confirmModal.mode === "freeze" &&
                `ต้องการอายัดบัญชีเลขที่ ${confirmModal.target.accountId} ใช่หรือไม่?`}
              {confirmModal.mode === "unfreeze" &&
                `ต้องการปลดอายัดบัญชีเลขที่ ${confirmModal.target.accountId} ใช่หรือไม่?`}
              {confirmModal.mode === "cancelTx" &&
                `ต้องการยกเลิกรายการธุรกรรม ${confirmModal.target.transientId} ใช่หรือไม่?`}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="next-btn"
                onClick={handleConfirm}
              >
                ยืนยัน
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeConfirmModal}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-icon error">!</div>
            <h2>เกิดข้อผิดพลาด</h2>
            <p>{errorModal.message}</p>
            <button className="next-btn" onClick={closeErrorModal}>
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
