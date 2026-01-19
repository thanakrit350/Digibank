import React, { useEffect, useState } from "react";
import { getAccountsByMember, deleteAccount } from "../../lib/api";
import "../../styles/checkaccount.css";

export default function CheckAccount() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const stored = localStorage.getItem("member");
      if (!stored) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const memberObj = JSON.parse(stored);
      const memberId =
        memberObj.memberId || memberObj.id || memberObj.member?.memberId;

      if (!memberId) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const accList = await getAccountsByMember(memberId);

      const sorted = [...accList].sort((a, b) => {
        const frozenA = a.status === "อายัดบัญชี";
        const frozenB = b.status === "อายัดบัญชี";
        if (frozenA === frozenB) return 0;
        return frozenA ? -1 : 1;
      });

      setAccounts(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (acc) => {
    setDeleteTarget(acc);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!deleteTarget) return;
      await deleteAccount(deleteTarget.accountId);
      setConfirmModalOpen(false);
      setDeleteTarget(null);
      await loadAccounts();
    } catch (err) {
      console.error(err);
      alert("ลบบัญชีไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="check-page">
        <div className="empty-state">
          <p>กำลังโหลดข้อมูลบัญชี...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="check-page">
      <h1 className="page-title">ตรวจสอบบัญชีของฉัน</h1>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <p>ยังไม่มีบัญชีในระบบ</p>
        </div>
      ) : (
        <div className="account-list">
          {accounts.map((acc) => (
            <div
              key={acc.accountId}
              className={`account-card ${
                acc.status === "อายัดบัญชี" ? "frozen-account" : ""
              }`}
            >
              <h3>
                {acc.member.firstNameTh} {acc.member.lastNameTh}
              </h3>

              <p className="acc-number">เลขที่บัญชี: {acc.accountId}</p>

              <p className="acc-balance">
                {acc.balance.toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}{" "}
                ฿
              </p>

              <p
                className={`acc-status ${
                  acc.status === "อายัดบัญชี" ? "frozen" : "active"
                }`}
              >
                สถานะ: {acc.status}
              </p>

              <button
                className="delete-btn"
                onClick={() => openDeleteModal(acc)}
              >
                ลบบัญชี
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmModalOpen && deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>ยืนยันการลบบัญชี</h2>
            <p>
              คุณต้องการลบบัญชี <br />
              <strong>{deleteTarget.accountId}</strong> ใช่หรือไม่?
            </p>

            <div className="modal-actions">
              <button className="delete-btn" onClick={handleConfirmDelete}>
                ยืนยันลบ
              </button>
              <button
                className="modal-cancel-btn"
                onClick={() => setConfirmModalOpen(false)}
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
