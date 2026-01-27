const { spring } = require("../services/bankService");

const loginAdmin = async (req, res, next) => {
  try {
    const { data } = await spring.post("/admins/login", req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const updateAccountStatus = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { status } = req.body;
    const { data } = await spring.post(`/admins/accounts/${accountId}/status`, {
      status,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const cancelTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
   const { data } = await spring.post(`/admins/transactions/${transactionId}/cancel`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  loginAdmin,
  updateAccountStatus,
  cancelTransaction,
};
