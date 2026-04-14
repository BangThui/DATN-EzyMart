import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";

import { AuthProvider, useAuth } from "./context/AuthContext";

// Layout
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AdminLayout from "./layouts/AdminLayout";

// Public Pages
import Home from "./pages/Home/Home";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Category from "./pages/Category/Category";
import Cart from "./pages/Cart/Cart";
import Checkout from "./pages/Checkout/Checkout";
import Orders from "./pages/Orders/Orders";
import Search from "./pages/Search/Search";
import UserProfile from "./pages/UserProfile/UserProfile";

// Admin Pages
import Dashboard from "./pages/admin/Dashboard/Dashboard";
import AdminProducts from "./pages/admin/AdminProducts/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers/AdminCustomers";
import Login from "./pages/auth/Login";

// Admin Route Guard
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin()) return <Navigate to="/login" replace />;
  return children;
};

// Main layout wrapper
const MainLayout = ({ children }) => (
  <div className="app-container">
    <Navbar />
    <main className="main-content">{children}</main>
    <Footer />
  </div>
);

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/product/:id"
          element={
            <MainLayout>
              <ProductDetail />
            </MainLayout>
          }
        />
        <Route
          path="/category/:categoryId"
          element={
            <MainLayout>
              <Category />
            </MainLayout>
          }
        />
        <Route
          path="/search"
          element={
            <MainLayout>
              <Search />
            </MainLayout>
          }
        />
        <Route
          path="/cart"
          element={
            <MainLayout>
              <Cart />
            </MainLayout>
          }
        />
        <Route
          path="/checkout"
          element={
            <MainLayout>
              <Checkout />
            </MainLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <MainLayout>
              <Orders />
            </MainLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <MainLayout>
              <UserProfile />
            </MainLayout>
          }
        />

        {/* Login Route (No Layout) */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#16a34a",
          colorPrimaryHover: "#15803d",
          colorPrimaryActive: "#166534",
          colorLink: "#16a34a",
          colorLinkHover: "#15803d",
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif",
          fontSize: 14,
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f8fafc",
          colorBorder: "#e2e8f0",
          colorBorderSecondary: "#f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)",
          boxShadowSecondary: "0 4px 12px rgba(0,0,0,0.08)",
        },
        components: {
          Button: {
            borderRadius: 8,
            fontWeight: 600,
          },
          Input: {
            borderRadius: 8,
          },
          Card: {
            borderRadius: 12,
          },
          Table: {
            borderRadius: 12,
          },
          Modal: {
            borderRadius: 16,
          },
          Menu: {
            itemBorderRadius: 8,
          },
        },
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
