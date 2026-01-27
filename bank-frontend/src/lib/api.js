import axios from "axios";

const API_BASE =
  import.meta?.env?.VITE_API_BASE ??
  process.env.REACT_APP_API_BASE ??
  "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("member");
    if (stored) {
      const m = JSON.parse(stored);
      const memberId = m?.memberId || m?.id || m?.member?.memberId;
      if (memberId) config.headers["x-member-id"] = memberId;
    }
  } catch {}
  return config;
});

const unwrap = (d) => {
  const isObject = d && typeof d === "object";
  if (!isObject) return d;

  return "result" in d ? d.result : d;
};

// Member 
export const addMember = (body) =>
  api.post("/members", body).then((r) => unwrap(r.data));

export const updateMember = (id, body) =>
  api.put(`/members/${id}`, body).then((r) => unwrap(r.data));

export const getAllMembers = (params = {}) =>
  api.get("/members", { params }).then((r) => unwrap(r.data));

export const getMemberById = (id) =>
  api.get(`/members/${id}`).then((r) => unwrap(r.data));

export const getMemberByEmail = (email) =>
  api.get(`/members/email/${email}`).then((r) => unwrap(r.data));

export const getMemberByUsername = (username) =>
  api.get(`/members/username/${username}`).then((r) => unwrap(r.data));

export const loginMember = (body) =>
  api.post("/members/login", body).then((r) => unwrap(r.data));

// Account
export const getAccounts = (params = {}) =>
  api.get("/accounts", { params }).then((r) => unwrap(r.data));

export const getAccountsByMember = (memberId) =>
  api.get(`/accounts/member/${memberId}`).then((r) => unwrap(r.data));

export const addAccount = (body) =>
  api.post("/accounts", body).then((r) => unwrap(r.data));

export const deleteAccount = (accountId) =>
  api.delete(`/accounts/${accountId}`).then((r) => unwrap(r.data));

// Transaction
export const getTransactions = (params = {}) =>
  api.get("/transactions", { params }).then((r) => unwrap(r.data));

export const getTransactionsByAccount = (accountId) =>
  api.get(`/transactions/account/${accountId}`).then((r) => unwrap(r.data));

export const addTransaction = (body) =>
  api.post("/transactions", body).then((r) => unwrap(r.data));

export const exportTransactionPdf = (transactionId) =>
  api.post(`/transactions/${transactionId}/pdf`).then((r) => unwrap(r.data));

export const updateTransaction = (transactionId, body) =>
  api.put(`/transactions/${transactionId}`, body).then((r) => unwrap(r.data));

export const deleteTransaction = (transactionId) =>
  api.delete(`/transactions/${transactionId}`).then((r) => unwrap(r.data));

export const deposit = (body) =>
  api.post("/transactions/deposit", body).then((r) => unwrap(r.data));

export const withdraw = (body) =>
  api.post("/transactions/withdraw", body).then((r) => unwrap(r.data));

export const transfer = (body) =>
  api.post("/transactions/transfer", body).then((r) => unwrap(r.data));

// Admin
export const loginAdmin = (body) =>
  api.post("/admins/login", body).then((r) => unwrap(r.data));

export const updateAccountStatus = (accountId, body) =>
  api.post(`/admins/accounts/${accountId}/status`, body).then((r) => unwrap(r.data));

export const cancelTransaction = (transactionId) =>
  api.post(`/admins/transactions/${transactionId}/cancel`)
     .then((r) => unwrap(r.data));

// Password
export const resetPassword = (body) =>
  api.post("/password/reset", body).then((r) => unwrap(r.data));