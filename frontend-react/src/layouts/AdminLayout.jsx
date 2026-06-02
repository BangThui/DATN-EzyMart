import React, { useState } from "react";
import { Layout, Menu, Typography, Avatar, Button } from "antd";
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  InboxOutlined,
  ShopOutlined,
  FileTextOutlined,
  TagOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLayout.css";
import NotificationBell from "../components/layout/NotificationBell";

const { Sider, Header, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const allMenuItems = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Dashboard</Link>,
      roles: [0, 2], // Cả Admin và Nhân viên
    },
    {
      key: "/admin/orders",
      icon: <OrderedListOutlined />,
      label: <Link to="/admin/orders">Đơn hàng</Link>,
      roles: [0, 2],
    },
    {
      key: "/admin/users",
      icon: <TeamOutlined />,
      label: <Link to="/admin/users">Tài khoản</Link>,
      roles: [0], // Chỉ Admin
    },
    {
      key: "/admin/products",
      icon: <ShoppingOutlined />,
      label: <Link to="/admin/products">Sản phẩm</Link>,
      roles: [0, 2],
    },
    {
      key: "/admin/categories",
      icon: <AppstoreOutlined />,
      label: <Link to="/admin/categories">Danh mục</Link>,
      roles: [0],
    },
    {
      key: "/admin/brands",
      icon: <TagOutlined />,
      label: <Link to="/admin/brands">Thương hiệu</Link>,
      roles: [0],
    },
    {
      key: "/admin/stock",
      icon: <InboxOutlined />,
      label: <Link to="/admin/stock">Nhập kho</Link>,
      roles: [0, 2],
    },
    {
      key: "/admin/suppliers",
      icon: <ShopOutlined />,
      label: <Link to="/admin/suppliers">Nhà cung cấp</Link>,
      roles: [0],
    },
    {
      key: "/admin/news",
      icon: <FileTextOutlined />,
      label: <Link to="/admin/news">Bài viết / Tin tức</Link>,
      roles: [0],
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: <Link to="/admin/settings">Cài đặt</Link>,
      roles: [0], // Chỉ Admin
    },
  ];

  // Lọc menu dựa vào role của user đăng nhập
  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Layout className="admin-layout-wrap">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="admin-sider"
        trigger={null}
      >
        <div className="admin-sider-header">
          {!collapsed ? (
            <Title level={4} className="admin-sider-title">
              🛒 Admin
            </Title>
          ) : (
            <Text className="admin-sider-icon">🛒</Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="admin-menu"
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: "margin-left 0.2s ease" }}>
        <Header className="admin-header" style={{ left: collapsed ? 80 : 200, transition: "left 0.2s ease" }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div className="admin-header-right">
            <NotificationBell isAdmin={true} />
            <Avatar className="admin-avatar">
              {user?.user_name?.charAt(0)?.toUpperCase() || "A"}
            </Avatar>
            <Text strong className="admin-mr-md">
              {user?.user_name || "Admin"}
            </Text>
            <Button
              icon={<HomeOutlined />}
              onClick={() => window.open("/", "_blank")}
              className="admin-mr-sm"
            >
              Xem cửa hàng
            </Button>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              type="text"
              danger
            >
              Đăng xuất
            </Button>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
