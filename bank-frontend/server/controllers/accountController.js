const { spring } = require("../services/bankService");

const addAccount = async (req, res, next) => {
  try {
    const { data } = await spring.post("/accounts", req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const getAllAccounts = async (req, res, next) => {
  try {
    const { data } = await spring.get("/accounts");
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const getAccountById = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { data } = await spring.get(`/accounts/${accountId}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { data } = await spring.put(`/accounts/${accountId}`, req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    await spring.delete(`/accounts/${accountId}`);
    res.json({ message: "Deleted successfully" });
  } catch (e) {
    next(e);
  }
};

const getAccountsByMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { data } = await spring.get(`/accounts/member/${memberId}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  addAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountsByMember,
};
