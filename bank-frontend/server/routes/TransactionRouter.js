const express = require("express");

const {
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
} = require("../controllers/TransactionController");

const router = express.Router();

router.get("/", getAllTransactions);
router.get("/:transactionId", getTransactionById);
router.post("/", addTransaction);
router.post("/:transactionId/pdf", exportTransactionPdf);
router.put("/:transactionId", updateTransaction);
router.delete("/:transactionId", deleteTransaction);
router.get("/account/:accountId", getTransactionsByAccount);
router.post("/deposit", deposit);
router.post("/withdraw", withdraw);
router.post("/transfer", transfer);

module.exports = router;
