const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const memberRoutes = require("./routes/memberRouter");
const accountRoutes = require("./routes/accountRouter");
const transactionRoutes = require("./routes/TransactionRouter");
const adminRoutes = require("./routes/adminRouter");
const PasswordRouter = require("./routes/PasswordRouter");

const app = express();

app.use(cors({ origin: ["http://localhost:3000","http://localhost:3001","http://localhost:3002"] }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/members", memberRoutes);
app.use("/accounts", accountRoutes);
app.use("/transactions", transactionRoutes);
app.use("/admins", adminRoutes);
app.use("/password", PasswordRouter);

app.use((err, req, res, next) => {
  const status = err?.response?.status || 500;
  const payload = err?.response?.data || { message: err.message || "BFF error" };
  console.error("[BFF ERROR]", status, JSON.stringify(payload));
  res.status(status).json(payload);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`BFF running at http://localhost:${PORT}`));
