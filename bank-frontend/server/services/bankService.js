const axios = require("axios");

const spring = axios.create({
  baseURL: "http://localhost:8083",
  timeout: 10000,
});

module.exports = { spring };
