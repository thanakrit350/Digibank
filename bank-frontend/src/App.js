import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/member/login";
import Register from "./pages/member/register";
import Transaction from "./pages/transactions/transaction";
import Layout from "./components/Layout";
import DashboardBank from "./pages/dashboard_bank";
import Profile from "./pages/member/profile";
import EditProfile from "./pages/member/edit_profile";
import Deposit from "./pages/transactions/transaction_deposit";
import Withdraw from "./pages/transactions/transaction_withdraw";
import Transfer from "./pages/transactions/transaction_transfer.jsx";
import Summary from "./pages/transactions/transaction_summary.jsx";
import ManageFavorites from "./pages/Account/favorites.jsx";
import CheckAccount from "./pages/Account/check_account.jsx";
import AdminLogin from "./pages/Admin/admin_login.jsx";
import AdminDashboard from "./pages/Admin/admin_dashboard.jsx";
import AdminAccounts from "./pages/Admin/admin_accounts.jsx";
import AdminTransactions from "./pages/Admin/admin_transactions.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes >
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardBank />} />
          <Route path="/transactions" element={<Transaction />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/favorites" element={<ManageFavorites />} />
          <Route path="/check-account" element={<CheckAccount />} />
        </Route>
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-accounts" element={<AdminAccounts />} />
        <Route path="/admin-transactions" element={<AdminTransactions />} />
      </Routes>
    </BrowserRouter>
  );
}
