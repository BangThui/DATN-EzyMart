import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Avatar, Dropdown, Button, message, Typography, Divider, Steps, Input } from "antd";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../../services/authService";
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
import { cartService } from "../../services/cartService";
import { categoryService } from "../../services/categoryService";
import { buildCategoryTree, buildMenuItems } from "../../utils";
import "./Navbar.css";
import NotificationBell from "./NotificationBell";

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
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState(0); // 0: Nhập email, 1: Nhập OTP & MK mới
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  const [categories, setCategories] = useState([]);

  // Fetch categories from API
  useEffect(() => {
    categoryService
      .getAll()
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch cart count
  useEffect(() => {
    const fetch = async () => {
      if (!user?.user_id) {
        setCartCount(0);
        return;
      }
      try {
        const data = await cartService.getCart(user.user_id);
        setCartCount(Array.isArray(data) ? data.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    fetch();

    window.addEventListener("cart-updated", fetch);
    const t = setInterval(fetch, 6000);
    return () => {
      window.removeEventListener("cart-updated", fetch);
      clearInterval(t);
    };
  }, [user]);

  const handleLogin = async e => {
    e.preventDefault();
    setLoginError("");
    setLoadingAuth(true);
    try {
      const res = await authService.login(loginData);
      login(res.user, res.token);
      setLoginVisible(false);
      setLoginData({ email: "", password: "" });
      message.success(`Xin chào, ${res.user.user_name}! 🎉`);
    } catch (err) {
      setLoginError(
        err.response?.data?.error || "Email hoặc mật khẩu không đúng",
      );
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const res = await authService.googleLogin(credentialResponse.credential);
      login(res.user, res.token);
      setLoginVisible(false);
      message.success(`Xin chào, ${res.user.user_name}! 🎉`);
    } catch (err) {
      message.error(err.response?.data?.error || "Đăng nhập Google thất bại");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await authService.forgotPassword({ email: forgotEmail });
      message.success("Mã OTP đã được gửi vào Email của bạn. Vui lòng kiểm tra hộp thư!", 5);
      setForgotStep(1); // Chuyển sang bước nhập OTP
    } catch (err) {
      message.error(err.response?.data?.error || "Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      return message.error("Vui lòng nhập đủ 6 số OTP.");
    }
    setForgotLoading(true);
    try {
      await authService.verifyOtp({ email: forgotEmail, otp: otpCode });
      message.success("Xác thực thành công. Vui lòng nhập mật khẩu mới.");
      setForgotStep(2); // Chuyển sang bước điền mật khẩu
    } catch (err) {
      message.error(err.response?.data?.error || "Mã OTP không đúng hoặc đã hết hạn.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtpReset = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      return message.error("Hai mật khẩu không khớp!");
    }
    if (newPassword.length < 6) {
      return message.error("Mật khẩu phải có ít nhất 6 ký tự!");
    }
    setForgotLoading(true);
    try {
      await authService.verifyOtpReset({ email: forgotEmail, otp: otpCode, newPassword });
      message.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.", 5);
      // Đóng modal forgot và mở modal login, reset state
      setForgotVisible(false);
      setLoginVisible(true);
      setForgotStep(0);
      setForgotEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      message.error(err.response?.data?.error || "Mã OTP không đúng hoặc đã hết hạn.");
    } finally {
      setForgotLoading(false);
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

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`);
    setProductsOpen(false);
  };

  const categoryTree = buildCategoryTree(categories);
  const categoryMenuItems = buildMenuItems(categoryTree, handleCategoryClick);

  const isActive = path => location.pathname === path;
  const isCategoryActive = () =>
    categories.some(c => location.pathname === `/category/${c.category_id}`);

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
            <div className="navbar-logo-icon">
              <img
                src="/images/EzyMart_final.png"
                alt="EzyMart Logo"
                className="navbar-logo-image"
              />
            </div>
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
            {/* Notification */}
            {user && <NotificationBell isAdmin={false} />}

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
            <Dropdown
              menu={{ items: categoryMenuItems }}
              placement="bottomLeft"
              trigger={["hover"]}
              className={`navbar-products-dropdown ${isCategoryActive() ? "active" : ""}`}
            >
              <Link
                to="/category"
                className={`navbar-nav-link navbar-products-trigger ${
                  isCategoryActive() ? "active" : ""
                }`}
              >
                Sản phẩm
              </Link>
            </Dropdown>

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
                  <Typography.Link
                    style={{ float: "right", fontSize: "13px", color: "#8c8c8c", marginTop: 6 }}
                    onClick={() => {
                      setLoginVisible(false);
                      setForgotVisible(true);
                    }}
                  >
                    Quên mật khẩu?
                  </Typography.Link>
                </div>
                <button
                  type="submit"
                  className="modal-btn"
                  disabled={loadingAuth}
                >
                  {loadingAuth ? "⏳ Đang xử lý..." : "🚀 Đăng nhập"}
                </button>
              </form>

              <Divider style={{ margin: "16px 0", color: "#8c8c8c", fontSize: 13 }}>Hoặc tiếp tục với</Divider>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={() => message.error("Đăng nhập Google thất bại")}
                  width="100%"
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  locale="vi"
                />
              </div>

              <div className="modal-footer-text" style={{ marginTop: 16 }}>
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

      {/* ══ FORGOT PASSWORD MODAL ══ */}
      {forgotVisible && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setForgotVisible(false)}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">🔑 Quên mật khẩu</div>
              <div className="modal-subtitle">Nhập email để nhận liên kết khôi phục</div>
              <button className="modal-close" onClick={() => {
                setForgotVisible(false);
                setForgotStep(0);
                setOtpCode("");
                setNewPassword("");
                setConfirmPassword("");
              }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: "0 24px 24px" }}>
              <Steps 
                current={forgotStep} 
                style={{ marginBottom: 24, padding: "20px 0" }}
                items={[
                  { title: "Nhập Email" },
                  { title: "Xác thực OTP" },
                  { title: "Mật khẩu mới" }
                ]}
              />

              {forgotStep === 0 && (
                <form onSubmit={handleForgotPassword}>
                  <div className="modal-form-group">
                    <label className="modal-label">Địa chỉ Email của bạn</label>
                    <input
                      className="modal-input"
                      type="email"
                      placeholder="example@email.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="modal-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "⏳ Đang gửi..." : "📩 Gửi mã OTP khôi phục"}
                  </button>
                </form>
              )}

              {forgotStep === 1 && (
                <form onSubmit={handleVerifyOtp}>
                  <div className="modal-form-group" style={{ textAlign: "center" }}>
                    <label className="modal-label" style={{ display: "block", marginBottom: 12 }}>
                      Nhập mã OTP (6 số) gửi về email
                    </label>
                    <Input.OTP 
                      length={6} 
                      value={otpCode}
                      onChange={setOtpCode}
                      style={{ margin: "0 auto 16px" }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="modal-btn"
                    disabled={forgotLoading || otpCode.length !== 6}
                    style={{ marginTop: 8 }}
                  >
                    {forgotLoading ? "⏳ Đang xác thực..." : "✅ Xác thực OTP"}
                  </button>
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <Typography.Link onClick={() => setForgotStep(0)} style={{ fontSize: 13 }}>
                      ← Quay lại nhập email
                    </Typography.Link>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtpReset}>
                  <div className="modal-form-group">
                    <label className="modal-label">Mật khẩu mới</label>
                    <Input.Password
                      placeholder="Tối thiểu 6 ký tự"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ borderRadius: 8, height: 44 }}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label className="modal-label">Xác nhận mật khẩu</label>
                    <Input.Password
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{ borderRadius: 8, height: 44 }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="modal-btn"
                    disabled={forgotLoading}
                    style={{ marginTop: 8 }}
                  >
                    {forgotLoading ? "⏳ Đang xử lý..." : "🔑 Xác nhận đổi mật khẩu"}
                  </button>
                </form>
              )}

              {forgotStep === 0 && (
                <div className="modal-footer-text" style={{ marginTop: 16 }}>
                  Nhớ mật khẩu rồi?{" "}
                  <span
                    className="modal-footer-link"
                    onClick={() => {
                      setForgotVisible(false);
                      setLoginVisible(true);
                      setForgotStep(0);
                    }}
                  >
                    Đăng nhập
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
