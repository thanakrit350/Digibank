import React, { useEffect, useState } from "react";
import "../../styles/admin_dashboard.css";
import { getTransactions, cancelTransaction } from "../../lib/api";

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

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    target: null,
  });

  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const txRes = await getTransactions();
        const txArray = toArray(txRes);

        const sortedTx = [...txArray].sort(
          (a, b) =>
            toTimeValue(b.transactionDate) - toTimeValue(a.transactionDate)
        );

        setTransactions(sortedTx);
      } catch (e) {
        console.error("LOAD TRANSACTIONS ERROR", e);
        setErrorModal({
          open: true,
          message: "ไม่สามารถโหลดรายการธุรกรรมได้",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openCancelTxConfirm = (tx) => {
    if (tx.status === "ยกเลิก") return;
    setConfirmModal({
      open: true,
      target: tx,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, target: null });
  };

  const closeErrorModal = () => {
    setErrorModal({ open: false, message: "" });
  };

  const handleConfirm = async () => {
    if (!confirmModal.target) return;

    try {
      await cancelTransaction(confirmModal.target.transientId);

      setTransactions((prev) =>
        prev.map((t) =>
          t.transientId === confirmModal.target.transientId
            ? { ...t, status: "ยกเลิก" }
            : t
        )
      );
    } catch (e) {
      console.error("CANCEL TRANSACTION ERROR", e);
      setErrorModal({
        open: true,
        message:
          e?.response?.data?.message ||
          "ไม่สามารถยกเลิกรายการธุรกรรมได้ กรุณาลองใหม่",
      });
    } finally {
      closeConfirmModal();
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        กำลังโหลดรายการธุรกรรม...
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">จัดการรายการธุรกรรมทั้งหมด</h1>
      <p className="admin-dashboard-subtitle">
        ตรวจสอบและยกเลิกรายการธุรกรรมในระบบ Digibank
      </p>

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
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-empty">
                  ยังไม่มีรายการธุรกรรม
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.transientId}>
                  <td>{t.transientId}</td>
                  <td>{t.type}</td>
                  <td>{t.fromAccount || "-"}</td>
                  <td>{t.toAccount || "-"}</td>
                  <td
                    className={
                      t.amount >= 0 ? "amount-positive" : "amount-negative"
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

      {confirmModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-icon error">!</div>
            <h2>ยืนยันการยกเลิกรายการ</h2>
            <p>
              ต้องการยกเลิกรายการธุรกรรม{" "}
              {confirmModal.target?.transientId || ""} ใช่หรือไม่?
            </p>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={closeConfirmModal}>
                ยกเลิก
              </button>
              <button className="next-btn" onClick={handleConfirm}>
                ยืนยัน
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
