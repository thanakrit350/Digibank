const { spring } = require("../services/bankService");

const addMember = async (req, res, next) => {
  try {
    const { data } = await spring.post("/members", req.body);
    res.json(data);
  } catch (e) { 
    next(e); 
  }
};

const updateMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { data } = await spring.put(`/members/${memberId}`, req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};


const getAllMembers = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const { data } = await spring.get("/members", {
      params: { limit, offset },
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const getMemberById = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { data } = await spring.get(`/members/${memberId}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const getMemberByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { data } = await spring.get(`/members/email/${email}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const getMemberByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { data } = await spring.get(`/members/username/${username}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const loginMember = async (req, res, next) => {
  try {
    const { data } = await spring.post("/members/login", req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  addMember,
  updateMember,
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByUsername,
  loginMember,
};

