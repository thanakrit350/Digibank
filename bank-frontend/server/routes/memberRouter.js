const express = require("express");
const {
  addMember,
  updateMember,
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByUsername,
  loginMember,
} = require("../controllers/memberController");

const router = express.Router();

router.post("/", addMember);
router.get("/", getAllMembers);
router.get("/:memberId", getMemberById);   
router.get("/email/:email", getMemberByEmail);
router.get("/username/:username", getMemberByUsername);
router.put("/:memberId", updateMember);     
router.post("/login", loginMember);

module.exports = router;
