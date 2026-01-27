const express = require("express");

const { 
    resetPassword 
} = require("../controllers/PasswordController");

const router = express.Router();

router.post("/reset", resetPassword);

module.exports = router;