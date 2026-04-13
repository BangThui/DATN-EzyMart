import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Avatar, Dropdown, Button, message } from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  SearchOutlined,
  LogoutOutlined,
  OrderedListOutlined,
  ProfileOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { cartService } from "../../services/cartService";
import "./Navbar.css";

const Navbar = () => {
  const { user, login, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [loginVisible, setLoginVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const [productsOpen, setProductsOpen] = useState(false);
  const productsDropdownRef = useRef(null);

  // Fetch cart count
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await cartService.getCart(user?.user_id);
        setCartCount(Array.isArray(data) ? data.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    fetch();
    const t = setInterval(fetch, 6000);
    return () => clearInterval(t);
  }, [user]);

  const handleLogin = async e => {
    e.preventDefault();
    setLoginError("");
    setLoadingAuth(true);
    try {
      const res = await authService.login(loginData);

      // Xử lý tách riêng admin và khách hàng
      if (res.user.role === 1 || res.user.role === "1") {
        setLoadingAuth(false);
        setLoginError(
          "Tài khoản Quản trị. Vui lòng đăng nhập tại trang Admin!",
        );
        return;
      }

      login(res.user, res.token);
      message.success(`Xin chào, ${res.user.user_name}! 🎉`);
      setLoginVisible(false);
      setLoginData({ email: "", password: "" });
    } catch (err) {
      setLoginError(
        err.response?.data?.error || "Email hoặc mật khẩu không đúng",
      );
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setRegisterError("");
    setLoadingAuth(true);
    try {
      await authService.register(registerData);
      message.success("Đăng ký thành công! Mời bạn đăng nhập.");
      setRegisterVisible(false);
      setRegisterData({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
      });
      setLoginVisible(true);
    } catch (err) {
      setRegisterError(err.response?.data?.error || "Đăng ký thất bại");
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    if (searchText.trim())
      navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
  };

  const handleLogout = () => {
    logout();
    message.success("Đã đăng xuất thành công");
    navigate("/");
  };

  // User dropdown menu
  const userMenuItems = [
    {
      key: "greeting",
      label: (
        <div className="navbar-user-greeting-wrap">
          <div className="navbar-user-greeting-name">{user?.user_name}</div>
          <div className="navbar-user-greeting-email">{user?.user_email}</div>
        </div>
      ),
      disabled: true,
    },
    {
      key: "profile",
      icon: <ProfileOutlined />,
      label: <Link to="/profile">Hồ sơ cá nhân</Link>,
    },
    {
      key: "orders",
      icon: <OrderedListOutlined />,
      label: <Link to="/orders">Đơn hàng của tôi</Link>,
    },
    ...(isAdmin()
      ? [
          { type: "divider" },
          {
            key: "admin",
            icon: <DashboardOutlined />,
            label: (
              <Link to="/admin" className="navbar-menu-admin-link">
                Quản trị Admin
              </Link>
            ),
          },
        ]
      : []),
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: <span className="navbar-menu-logout">Đăng xuất</span>,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const productCategories = [
    { label: "Trái cây", icon: "🍎", path: "/category/1" },
    { label: "Rau củ", icon: "🥦", path: "/category/2" },
    { label: "Đồ uống", icon: "🧃", path: "/category/3" },
    { label: "Sữa các loại", icon: "🥛", path: "/category/4" },
    { label: "Thực phẩm khô", icon: "🍜", path: "/category/5" },
  ];

  const isActive = path => location.pathname === path;
  const isCategoryActive = () =>
    productCategories.some(c => location.pathname === c.path);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = e => {
      if (
        productsDropdownRef.current &&
        !productsDropdownRef.current.contains(e.target)
      ) {
        setProductsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <span>
              <PhoneOutlined className="navbar-top-icon" />
              0123-456-789
            </span>
            <span>|</span>
            <span>
              <EnvironmentOutlined className="navbar-top-icon" />
              Giao hàng toàn quốc
            </span>
          </div>
          <div className="topbar-right">
            {!user ? (
              <>
                <button
                  className="topbar-btn"
                  onClick={() => setLoginVisible(true)}
                >
                  <UserOutlined /> Đăng nhập
                </button>
                <div className="topbar-divider" />
                <button
                  className="topbar-btn"
                  onClick={() => setRegisterVisible(true)}
                >
                  Đăng ký
                </button>
              </>
            ) : (
              <span className="navbar-top-user-hello">
                👋 Xin chào, <strong>{user.user_name}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <div className="navbar-main">
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">🌿</div>
            <div className="navbar-logo-text">
              <span className="navbar-logo-name">EzyMart</span>
              <span className="navbar-logo-tagline">THỰC PHẨM SẠCH</span>
            </div>
          </Link>

          {/* Search */}
          <form className="navbar-search" onSubmit={handleSearch}>
            <div className="navbar-search-inner">
              <input
                className="navbar-search-input"
                placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              <button type="submit" className="navbar-search-btn">
                <SearchOutlined />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="navbar-actions">
            {/* Cart */}
            <Link to="/cart" className="navbar-action-btn navbar-cart-wrap">
              <ShoppingCartOutlined />
              {cartCount > 0 && (
                <span className="navbar-cart-count">{cartCount}</span>
              )}
            </Link>

            {/* User */}
            {user ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={["click"]}
                arrow={{ pointAtCenter: true }}
              >
                <div className="navbar-user-trigger">
                  <Avatar size={30} className="navbar-user-avatar">
                    {user.user_name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <span className="navbar-username">
                    {user.user_name?.split(" ").pop()}
                  </span>
                </div>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<UserOutlined />}
                onClick={() => setLoginVisible(true)}
                className="navbar-login-btn"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>

        {/* Nav Menu */}
        <div className="navbar-nav">
          <div className="navbar-nav-inner">
            {/* Trang chủ */}
            <Link
              to="/"
              className={`navbar-nav-link ${isActive("/") ? "active" : ""}`}
            >
              Trang chủ
            </Link>

            {/* Sản phẩm Dropdown */}
            <div
              className={`navbar-products-dropdown ${
                isCategoryActive() ? "active" : ""
              }`}
              ref={productsDropdownRef}
            >
              <button
                className={`navbar-nav-link navbar-products-trigger ${
                  productsOpen || isCategoryActive() ? "active" : ""
                }`}
                onClick={() => setProductsOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={productsOpen}
              >
                Sản phẩm
              </button>

              {productsOpen && (
                <div className="navbar-dropdown-menu">
                  {productCategories.map(cat => (
                    <Link
                      key={cat.path}
                      to={cat.path}
                      className={`navbar-dropdown-item ${
                        isActive(cat.path) ? "active" : ""
                      }`}
                      onClick={() => setProductsOpen(false)}
                    >
                      <span className="navbar-dropdown-icon">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tin tức */}
            <Link
              to="/news"
              className={`navbar-nav-link ${isActive("/news") ? "active" : ""}`}
            >
              Tin tức
            </Link>

            {/* Liên hệ */}
            <Link
              to="/contact"
              className={`navbar-nav-link ${isActive("/contact") ? "active" : ""}`}
            >
              Liên hệ
            </Link>

            {/* Giới thiệu */}
            <Link
              to="/about"
              className={`navbar-nav-link ${isActive("/about") ? "active" : ""}`}
            >
              Giới thiệu
            </Link>
          </div>
        </div>
      </div>

      {/* ══ LOGIN MODAL ══ */}
      {loginVisible && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setLoginVisible(false)}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">🔐 Đăng nhập</div>
              <div className="modal-subtitle">Chào mừng bạn trở lại!</div>
              <button
                className="modal-close"
                onClick={() => setLoginVisible(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleLogin}>
                {loginError && <div className="modal-error">{loginError}</div>}
                <div className="modal-form-group">
                  <label className="modal-label">Email</label>
                  <input
                    className="modal-input"
                    type="email"
                    placeholder="example@email.com"
                    value={loginData.email}
                    onChange={e =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Mật khẩu</label>
                  <input
                    className="modal-input"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={e =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="modal-btn"
                  disabled={loadingAuth}
                >
                  {loadingAuth ? "⏳ Đang xử lý..." : "🚀 Đăng nhập"}
                </button>
              </form>
              <div className="modal-footer-text">
                Chưa có tài khoản?{" "}
                <span
                  className="modal-footer-link"
                  onClick={() => {
                    setLoginVisible(false);
                    setRegisterVisible(true);
                  }}
                >
                  Đăng ký ngay
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ REGISTER MODAL ══ */}
      {registerVisible && (
        <div
          className="modal-overlay"
          onClick={e =>
            e.target === e.currentTarget && setRegisterVisible(false)
          }
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">📝 Tạo tài khoản</div>
              <div className="modal-subtitle">
                Tham gia ngay để nhận ưu đãi!
              </div>
              <button
                className="modal-close"
                onClick={() => setRegisterVisible(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleRegister}>
                {registerError && (
                  <div className="modal-error">{registerError}</div>
                )}
                {[
                  {
                    label: "Họ và tên *",
                    name: "name",
                    type: "text",
                    placeholder: "Nguyễn Văn A",
                  },
                  {
                    label: "Email *",
                    name: "email",
                    type: "email",
                    placeholder: "example@email.com",
                  },
                  {
                    label: "Số điện thoại *",
                    name: "phone",
                    type: "text",
                    placeholder: "0987 654 321",
                  },
                  {
                    label: "Địa chỉ *",
                    name: "address",
                    type: "text",
                    placeholder: "Số nhà, đường, quận, thành phố",
                  },
                  {
                    label: "Mật khẩu *",
                    name: "password",
                    type: "password",
                    placeholder: "Tối thiểu 6 ký tự",
                  },
                ].map(f => (
                  <div className="modal-form-group" key={f.name}>
                    <label className="modal-label">{f.label}</label>
                    <input
                      className="modal-input"
                      type={f.type}
                      placeholder={f.placeholder}
                      value={registerData[f.name]}
                      onChange={e =>
                        setRegisterData({
                          ...registerData,
                          [f.name]: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="modal-btn"
                  disabled={loadingAuth}
                >
                  {loadingAuth ? "⏳ Đang xử lý..." : "✅ Tạo tài khoản"}
                </button>
              </form>
              <div className="modal-footer-text">
                Đã có tài khoản?{" "}
                <span
                  className="modal-footer-link"
                  onClick={() => {
                    setRegisterVisible(false);
                    setLoginVisible(true);
                  }}
                >
                  Đăng nhập
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
