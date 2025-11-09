import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Orders from "./pages/Orders";
import AdminOrders from "./pages/AdminOrders";

export default function App(){
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:text-neutral-100 dark:bg-neutral-950">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="*" element={<div className="container-edge py-12">Página en construcción…</div>} />
      </Routes>
      <footer className="mt-12 border-t border-neutral-200 dark:border-neutral-800">
        <div className="container-edge py-8 text-sm flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="opacity-80">© {new Date().getFullYear()} PercyStore</p>
          <p className="font-semibold text-cruceño-green">A Santa Cruz no la para nadie</p>
        </div>
      </footer>
    </div>
  );
}
