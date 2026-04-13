import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Button } from 'antd';
import {
    DashboardOutlined, ShoppingOutlined, AppstoreOutlined,
    OrderedListOutlined, TeamOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined
} from '@ant-design/icons';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const { Sider, Header, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const menuItems = [
        { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">Dashboard</Link> },
        { key: '/admin/products', icon: <ShoppingOutlined />, label: <Link to="/admin/products">Sản phẩm</Link> },
        { key: '/admin/categories', icon: <AppstoreOutlined />, label: <Link to="/admin/categories">Danh mục</Link> },
        { key: '/admin/orders', icon: <OrderedListOutlined />, label: <Link to="/admin/orders">Đơn hàng</Link> },
        { key: '/admin/customers', icon: <TeamOutlined />, label: <Link to="/admin/customers">Khách hàng</Link> },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
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
                        <Title level={4} className="admin-sider-title">🛒 Admin</Title>
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

            <Layout>
                <Header className="admin-header">
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                    />
                    <div className="admin-header-right">
                        <Avatar className="admin-avatar">
                            {user?.user_name?.charAt(0)?.toUpperCase() || 'A'}
                        </Avatar>
                        <Text strong>{user?.user_name || 'Admin'}</Text>
                        <Button icon={<LogoutOutlined />} onClick={handleLogout} type="text" danger>
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
