const { spring } = require("../services/bankService");

const getAllTransactions = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const { data } = await spring.get("/transactions", {
      params: { limit, offset },
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const getTransactionById = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { data } = await spring.get(`/transactions/${transactionId}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const addTransaction = async (req, res, next) => {
  try {
    const body = req.body;
    const { data } = await spring.post("/transactions", body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const exportTransactionPdf = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    await spring.post(`/transactions/${transactionId}/pdf`,{},{ headers: { "Content-Type": "application/json" } });
    res.json({
      message: "ส่งสลิป PDF ไปยังอีเมลเรียบร้อยแล้ว",
    });
  } catch (e) {
    next(e);
  }
};


const updateTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const body = req.body;
    const { data } = await spring.put(`/transactions/${transactionId}`, body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const deleteTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { data } = await spring.delete(`/transactions/${transactionId}`);
    res.json({ message: "Deleted successfully" });
  } catch (e) {
    next(e);
  }
};

const getTransactionsByAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { data } = await spring.get(`/transactions/account/${accountId}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const deposit = async (req, res, next) => {
  try {
    const body = req.body; 
    const { data } = await spring.post("/transactions/deposit", body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const withdraw = async (req, res, next) => {
  try {
    const body = req.body;
    const { data } = await spring.post("/transactions/withdraw", body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const transfer = async (req, res, next) => {
  try {
    const body = req.body;
    const { data } = await spring.post("/transactions/transfer", body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  addTransaction,
  exportTransactionPdf,
  updateTransaction,
  deleteTransaction,
  getTransactionsByAccount,
  deposit,
  withdraw,
  transfer,
};
