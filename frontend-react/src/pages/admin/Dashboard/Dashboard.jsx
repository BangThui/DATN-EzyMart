import React, { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Typography, Spin } from "antd";
import {
  ShoppingCartOutlined,
  DollarOutlined,
  TeamOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import axiosClient from "../../../services/axiosClient";
import { formatCurrency } from "../../../utils";
import "../Admin.css";

const { Title } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/dashboard/stats")
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
      </div>
    );

  const cards = [
    {
      title: "Tổng đơn hàng",
      value: stats?.total_orders || 0,
      icon: <ShoppingCartOutlined />,
      color: "#3b82f6",
      isCurrency: false,
    },
    {
      title: "Tổng doanh thu",
      value: stats?.total_revenue || 0,
      icon: <DollarOutlined />,
      color: "#dc2626",
      isCurrency: true,
    },
    {
      title: "Khách hàng",
      value: stats?.total_customers || 0,
      icon: <TeamOutlined />,
      color: "#10b981",
      isCurrency: false,
    },
    {
      title: "Doanh thu tháng này",
      value: stats?.month_revenue || 0,
      icon: <CalendarOutlined />,
      color: "#f59e0b",
      isCurrency: true,
    },
    {
      title: "Tổng sản phẩm",
      value: stats?.total_products || 0,
      icon: <AppstoreOutlined />,
      color: "#8b5cf6",
      isCurrency: false,
    },
  ];

  return (
    <div>
      <Title level={2}>📊 Dashboard</Title>
      <Row gutter={[16, 16]}>
        {cards.map((card, idx) => (
          <Col xs={24} sm={12} lg={8} key={idx}>
            <Card
              className="dashboard-card"
              style={{ borderLeft: `4px solid ${card.color}` }}
            >
              <Statistic
                title={card.title}
                value={card.value}
                valueStyle={{ color: card.color, fontWeight: 700 }}
                prefix={card.icon}
                formatter={val => card.isCurrency ? formatCurrency(val) : val.toLocaleString('vi-VN')}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Dashboard;
