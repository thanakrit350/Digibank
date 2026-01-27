import React, { useEffect, useState, useMemo } from "react";
import { getAccountsByMember, deleteAccount } from "../../lib/api";
import "../../styles/checkaccount.css";
import { useTranslation } from "react-i18next";

export default function CheckAccount() {
  const { t, i18n } = useTranslation();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const locale = i18n.language === "en" ? "en-US" : "th-TH";

  const loadAccounts = async () => {
    try {
      const stored = localStorage.getItem("member");
      if (!stored) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const memberObj = JSON.parse(stored);
      const memberId = memberObj.memberId || memberObj.id || memberObj.member?.memberId;

      if (!memberId) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const accList = await getAccountsByMember(memberId);
      const list = Array.isArray(accList) ? accList : accList ? [accList] : [];

      const sorted = [...list].sort((a, b) => {
        const frozenA = a.status === "อายัดบัญชี" || a.status === "Frozen";
        const frozenB = b.status === "อายัดบัญชี" || b.status === "Frozen";
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

  useEffect(() => {
    loadAccounts();
  }, []);

  const getMemberFullName = (acc) => {
    const m = acc?.member;
    if (!m) return t("checkAccount.unknownOwner", { defaultValue: "ไม่ทราบชื่อเจ้าของบัญชี" });

    const thName = `${m.firstNameTh || ""} ${m.lastNameTh || ""}`.trim();
    const enName = `${m.firstNameEn || ""} ${m.lastNameEn || ""}`.trim();
    const fallback = (m.username || "").toString().trim();

    if (i18n.language === "en") return enName || thName || fallback || t("checkAccount.unknownOwner", { defaultValue: "Unknown owner" });
    return thName || enName || fallback || t("checkAccount.unknownOwner", { defaultValue: "ไม่ทราบชื่อเจ้าของบัญชี" });
  };

  const isFrozen = (status) => status === "อายัดบัญชี" || status === "Frozen";
  const isActive = (status) => status === "เปิดใช้งาน" || status === "Active";

  const statusLabel = (status) => {
    if (isFrozen(status)) return t("checkAccount.status.frozen", { defaultValue: "อายัดบัญชี" });
    if (isActive(status)) return t("checkAccount.status.active", { defaultValue: "เปิดใช้งาน" });
    return status || t("slip.dash", { defaultValue: "-" });
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

      setSuccessMessage(t("checkAccount.msg.deleteSuccess", { defaultValue: "ลบบัญชีเรียบร้อยแล้ว" }));
      setSuccessModalOpen(true);

      await loadAccounts();
    } catch (err) {
      console.error(err);
      setConfirmModalOpen(false);
      setErrorMessage(
        err?.response?.data?.message ||
          t("checkAccount.msg.deleteFailBalance", { defaultValue: "ไม่สามารถลบบัญชีได้ เนื่องจากยอดคงเหลือไม่เป็นศูนย์" })
      );
      setErrorModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="check-page">
        <div className="empty-state">
          <p>{t("checkAccount.loading", { defaultValue: "กำลังโหลดข้อมูลบัญชี..." })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="check-page">
      <h1 className="page-title">{t("checkAccount.title", { defaultValue: "ตรวจสอบบัญชีของฉัน" })}</h1>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <p>{t("checkAccount.empty", { defaultValue: "ยังไม่มีบัญชีในระบบ" })}</p>
        </div>
      ) : (
        <div className="account-list">
          {accounts.map((acc) => (
            <div
              key={acc.accountId}
              className={`account-card ${isFrozen(acc.status) ? "frozen-account" : ""}`}
            >
              <h3>{getMemberFullName(acc)}</h3>

              <p className="acc-number">
                {t("checkAccount.accountNo", { defaultValue: "เลขที่บัญชี: {{accountId}}", accountId: acc.accountId })}
              </p>

              <p className="acc-balance">
                {Number(acc.balance || 0).toLocaleString(locale, { minimumFractionDigits: 2 })}{" "}
                {t("slip.unit.baht", { defaultValue: "฿" })}
              </p>

              <p className={`acc-status ${isFrozen(acc.status) ? "frozen" : "active"}`}>
                {t("checkAccount.statusLabel", { defaultValue: "สถานะ: {{status}}", status: statusLabel(acc.status) })}
              </p>

              <button className="delete-btn" onClick={() => openDeleteModal(acc)}>
                {t("checkAccount.deleteBtn", { defaultValue: "ลบบัญชี" })}
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmModalOpen && deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>{t("checkAccount.modal.confirmTitle", { defaultValue: "ยืนยันการลบบัญชี" })}</h2>
            <p>
              {t("checkAccount.modal.confirmText", {
                defaultValue: "คุณต้องการลบบัญชี",
              })}
              <br />
              <strong>{deleteTarget.accountId}</strong>{" "}
              {t("checkAccount.modal.confirmText2", { defaultValue: "ใช่หรือไม่?" })}
            </p>

            <div className="modal-actions">
              <button className="delete-btn" onClick={handleConfirmDelete}>
                {t("checkAccount.modal.confirmDelete", { defaultValue: "ยืนยันลบ" })}
              </button>
              <button className="modal-cancel-btn" onClick={() => setConfirmModalOpen(false)}>
                {t("checkAccount.modal.cancel", { defaultValue: "ยกเลิก" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ color: "#ff4444" }}>{t("modal.errorTitle", { defaultValue: "เกิดข้อผิดพลาด" })}</h2>
            <p>{errorMessage}</p>

            <button className="login-button" onClick={() => setErrorModalOpen(false)}>
              {t("modal.ok", { defaultValue: "ตกลง" })}
            </button>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ color: "#00c853" }}>{t("modal.successTitle", { defaultValue: "สำเร็จ" })}</h2>
            <p>{successMessage}</p>

            <button className="login-button" onClick={() => setSuccessModalOpen(false)}>
              {t("modal.ok", { defaultValue: "ตกลง" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
