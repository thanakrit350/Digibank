const { spring } = require("../services/bankService");

const resetPassword = async (req, res, next) => {
  try {
    const { data } = await spring.post("/password/reset", req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  resetPassword,
};