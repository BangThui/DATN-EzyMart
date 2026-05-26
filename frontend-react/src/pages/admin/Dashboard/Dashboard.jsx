import React, { useState, useEffect } from "react";
import { Row, Col, Card, Tag, Table, Spin, Typography, Empty, DatePicker } from "antd";
import dayjs from "dayjs";
import {
  ShoppingCartOutlined,
  DollarOutlined,
  TeamOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  FireOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  DollarCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axiosClient from "../../../services/axiosClient";
import { formatCurrency } from "../../../utils";
import "./Dashboard.css";

const { Title, Text } = Typography;

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:    { label: "Chờ xử lý",   color: "gold"    },
  processing: { label: "Đang xử lý",  color: "blue"    },
  shipping:   { label: "Đang giao",   color: "cyan"    },
  completed:  { label: "Hoàn thành",  color: "green"   },
  cancelled:  { label: "Đã hủy",      color: "red"     },
};

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="dashboard-custom-tooltip">
        <p className="dashboard-tooltip-label">{label}</p>
        <p className="dashboard-tooltip-value">
          {formatCurrency(payload[0].value)}
        </p>
        <p className="dashboard-tooltip-sub">
          {payload[1]?.value} đơn hàng
        </p>
      </div>
    );
  }
  return null;
};
// ─────────────────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [stats,         setStats]         = useState(null);
  const [chartData,     setChartData]     = useState([]);
  const [topProducts,   setTopProducts]   = useState([]);
  const [recentOrders,  setRecentOrders]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [dateRange,     setDateRange]     = useState([dayjs().startOf("month"), dayjs()]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const startDate = dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : "";
        const endDate = dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : "";
        const params = { startDate, endDate };

        const [statsRes, chartsRes, topRes, recentRes] = await Promise.allSettled([
          axiosClient.get("/dashboard/stats", { params }),
          axiosClient.get("/dashboard/charts", { params }),
          axiosClient.get("/dashboard/top-products", { params }),
          axiosClient.get("/dashboard/recent-orders", { params }),
        ]);

        if (statsRes.status  === "fulfilled") setStats(statsRes.value);
        if (chartsRes.status === "fulfilled") {
          setChartData(
            (chartsRes.value || []).map(item => ({
              ...item,
              date: formatDateShort(item.date),
              revenue: Number(item.revenue),
              order_count: Number(item.order_count),
            }))
          );
        }
        if (topRes.status    === "fulfilled") setTopProducts(topRes.value || []);
        if (recentRes.status === "fulfilled") setRecentOrders(recentRes.value || []);

        // Log lỗi từng API riêng lẻ để debug
        [statsRes, chartsRes, topRes, recentRes].forEach((r, i) => {
          if (r.status === "rejected") console.error(`Dashboard API [${i}] failed:`, r.reason);
        });
      } catch (err) {
        console.error("Lỗi tải dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
      </div>
    );
  }

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = [
    { label: "Tổng đơn hàng",    value: stats?.total_orders    || 0, icon: <ShoppingCartOutlined />, color: "#3b82f6", bg: "#eff6ff",  currency: false },
    { label: "Tổng doanh thu",   value: stats?.total_revenue   || 0, icon: <DollarOutlined />,       color: "#dc2626", bg: "#fef2f2",  currency: true  },
    { label: "Tổng lợi nhuận",   value: stats?.total_profit    || 0, icon: <DollarCircleOutlined />, color: "#52c41a", bg: "#f6ffed",  currency: true  },
    { label: "Tổng tiền nhập kho",  value: stats?.total_import_cost   || 0, icon: <InboxOutlined />,          color: "#f59e0b", bg: "#fffbeb",  currency: true  },
    { label: "Khách hàng",       value: stats?.total_customers || 0, icon: <TeamOutlined />,          color: "#10b981", bg: "#f0fdf4",  currency: false },
    { label: "Tổng sản phẩm",   value: stats?.total_products  || 0, icon: <AppstoreOutlined />,      color: "#8b5cf6", bg: "#faf5ff",  currency: false },
  ];

  // ── Top products table columns ───────────────────────────────────────────
  const topProductColumns = [
    {
      title: "#",
      dataIndex: "rank",
      width: 48,
      render: (_, __, index) => {
        const cls = index === 0 ? "dashboard-rank-1"
                  : index === 1 ? "dashboard-rank-2"
                  : index === 2 ? "dashboard-rank-3"
                  : "dashboard-rank-other";
        return <span className={`dashboard-rank-badge ${cls}`}>{index + 1}</span>;
      },
    },
    {
      title: "Sản phẩm",
      key: "product",
      render: (_, record) => (
        <div className="dashboard-top-product-cell">
          <img
            src={record.product_image || "/placeholder.png"}
            alt={record.product_name}
            className="dashboard-top-product-img"
            onError={e => { e.target.onerror = null; e.target.src = "/placeholder.png"; }}
          />
          <span className="dashboard-top-product-name">{record.product_name}</span>
        </div>
      ),
    },
    {
      title: "Đã bán",
      dataIndex: "total_sold",
      align: "center",
      render: val => <Tag color="orange">{Number(val).toLocaleString("vi-VN")} sp</Tag>,
    },
    {
      title: "Doanh thu",
      dataIndex: "total_revenue",
      align: "right",
      render: val => (
        <Text strong className="dashboard-product-revenue">
          {formatCurrency(val)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div className="dashboard-header-wrap">
        <Title level={2} className="dashboard-title">📊 Dashboard</Title>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates)}
          format="DD/MM/YYYY"
          allowClear={true}
          presets={[
            { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
            { label: '7 ngày gần đây', value: [dayjs().subtract(7, 'd'), dayjs()] },
            { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
          ]}
        />
      </div>

      {/* ── Khu vực 1: Stat Cards ── */}
      <Row gutter={[16, 16]}>
        {statCards.map((card, idx) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={idx} className="dashboard-stat-col">
            <Card className="dashboard-stat-card">
              <div className="dashboard-stat-inner">
                <div className="dashboard-stat-icon" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
                <div className="dashboard-stat-info">
                  <div className="dashboard-stat-label">{card.label}</div>
                  <div className="dashboard-stat-value" style={{ color: card.color }}>
                    {card.currency ? formatCurrency(card.value) : card.value.toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Khu vực 2: Biểu đồ + Đơn hàng mới nhất ── */}
      <Row gutter={[16, 16]} className="dashboard-row-mt">
        {/* Cột trái: Bar Chart */}
        <Col xs={24} lg={16}>
          <Card
            className="dashboard-section-card"
            title={
              <span className="dashboard-section-title">
                <RiseOutlined className="dashboard-icon-orange" />
                Doanh thu 30 ngày gần nhất
              </span>
            }
          >
            {chartData.length > 0 ? (
              <div className="dashboard-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#8c8c8c" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#8c8c8c" }}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v}
                      width={52}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue"     name="Doanh thu"   fill="#fa8c16" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="order_count" name="Đơn hàng"    fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="dashboard-chart-empty">Chưa có dữ liệu doanh thu</div>
            )}
          </Card>
        </Col>

        {/* Cột phải: 5 Đơn mới nhất */}
        <Col xs={24} lg={8}>
          <Card
            className="dashboard-section-card"
            title={
              <span className="dashboard-section-title">
                <ClockCircleOutlined className="dashboard-icon-blue" />
                Đơn hàng mới nhất
              </span>
            }
          >
            {recentOrders.length > 0 ? (
              recentOrders.map(order => {
                const status = STATUS_MAP[order.order_status] || { label: order.order_status, color: "default" };
                return (
                  <div key={order.order_id} className="dashboard-order-item">
                    <div>
                      <div className="dashboard-order-id">#{order.order_id}</div>
                      <div className="dashboard-order-customer">{order.customer_name}</div>
                      <div className="dashboard-order-date">
                        {new Date(order.order_date).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="dashboard-order-right">
                      <div className="dashboard-order-price">{formatCurrency(order.total_price)}</div>
                      <Tag color={status.color} className="dashboard-order-status-tag">
                        {status.label}
                      </Tag>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty description="Chưa có đơn hàng" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Khu vực 3: Top 5 Sản phẩm bán chạy ── */}
      <Row className="dashboard-row-mt">
        <Col span={24}>
          <Card
            className="dashboard-section-card"
            title={
              <span className="dashboard-section-title">
                <FireOutlined className="dashboard-icon-red" />
                Top 5 sản phẩm bán chạy nhất
              </span>
            }
          >
            <Table
              dataSource={topProducts}
              columns={topProductColumns}
              rowKey="product_id"
              pagination={false}
              size="middle"
              locale={{ emptyText: <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
