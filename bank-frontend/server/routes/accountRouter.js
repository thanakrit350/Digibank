const express = require("express");
const {
  addAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountsByMember,
} = require("../controllers/accountController");

const router = express.Router();

router.post("/", addAccount);
router.get("/", getAllAccounts);
router.get("/member/:memberId", getAccountsByMember);
router.get("/:accountId", getAccountById);
router.put("/:accountId", updateAccount);
router.delete("/:accountId", deleteAccount);

module.exports = router;
