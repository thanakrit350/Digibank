import React, { useEffect, useState } from "react";
import "../../styles/admin_dashboard.css";
import { getAccounts, updateAccountStatus } from "../../lib/api";

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
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

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const accRes = await getAccounts({ signal: controller.signal });
        let accArray = [];

        if (Array.isArray(accRes)) {
          accArray = accRes;
        } else if (accRes) {
          accArray = [accRes];
        }
        setAccounts(accArray);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("LOAD ACCOUNTS ERROR", e);
          setErrorModal({ open: true, message: "ไม่สามารถโหลดข้อมูลบัญชีได้" });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, []);


  const openFreezeConfirm = (acc) => {
    const mode = acc.status === "อายัดบัญชี" ? "unfreeze" : "freeze";
    setConfirmModal({
      open: true,
      mode,
      target: acc,
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
      const status =
        confirmModal.mode === "freeze" ? "อายัดบัญชี" : "เปิดใช้งาน";

      const updated = await updateAccountStatus(
        confirmModal.target.accountId,
        { status }
      );

      setAccounts((prev) =>
        prev.map((a) => (a.accountId === updated.accountId ? updated : a))
      );
    } catch (e) {
      console.error("UPDATE ACCOUNT STATUS ERROR", e);
      setErrorModal({
        open: true,
        message:
          e?.response?.data?.message ||
          "ไม่สามารถอัปเดตสถานะบัญชีได้ กรุณาลองใหม่",
      });
    } finally {
      closeConfirmModal();
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        กำลังโหลดข้อมูลบัญชี...
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">จัดการบัญชี</h1>
      <p className="admin-dashboard-subtitle">
        อายัด/ปลดอายัดบัญชีของลูกค้าในระบบ Digibank
      </p>

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
            {accounts.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-empty">
                  ยังไม่มีข้อมูลบัญชี
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
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
