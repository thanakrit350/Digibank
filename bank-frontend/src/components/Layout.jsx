import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "../styles/layout.css";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="app-main">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
