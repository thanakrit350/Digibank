const express = require("express");
const { 
    loginAdmin,
    updateAccountStatus,
    cancelTransaction
 } = require("../controllers/adminController");

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/accounts/:accountId/status", updateAccountStatus);
router.post("/transactions/:transactionId/cancel", cancelTransaction);

module.exports = router;
