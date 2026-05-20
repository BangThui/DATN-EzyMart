import React, { useState, useEffect, useMemo } from "react";
import { Tag, Typography, Empty, Button, Spin, Tabs, Drawer, Steps, List, Divider, message, Popconfirm, Space } from "antd";
import { Link, useLocation } from "react-router-dom";
import { orderService } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { formatCurrency } from "../../utils";
import { getImageUrl } from "../../utils/imageHelper";
import "./Orders.css";

const { Title, Text } = Typography;

const STATUS_MAP = {
  pending: { label: "Chờ xác nhận", color: "default" },
  confirmed: { label: "Đang xử lý", color: "processing" },
  shipping: { label: "Đang giao hàng", color: "warning" },
  completed: { label: "Hoàn thành", color: "success" },
  cancelled: { label: "Đã hủy", color: "error" },
};

const STEP_STATUS = {
  pending: 0,
  confirmed: 1,
  shipping: 2,
  completed: 3,
};

const Orders = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleOpenDrawer = (order) => {
    setSelectedOrder(order);
    setDrawerVisible(true);
  };

  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedOrder(null);
  };

  // Hàm tải lại danh sách đơn hàng dùng chung
  const refreshOrders = async () => {
    const userId = user?.user_id || user?.user_code || user?.id;
    if (!userId) return;
    const data = await orderService.getByUserCode(userId);
    const groups = {};
    (data || []).forEach(item => {
      if (!groups[item.mahang])
        groups[item.mahang] = { ...item, items: [] };
      groups[item.mahang].items.push(item);
    });
    const sortedGroups = Object.values(groups).sort(
      (a, b) => new Date(b.ngayDatHang) - new Date(a.ngayDatHang),
    );
    setGrouped(sortedGroups);
  };

  const handleConfirmReceived = async (mahang) => {
    try {
      await orderService.customerUpdateStatus(mahang);
      message.success("Đã xác nhận nhận hàng thành công!");
      await refreshOrders();
    } catch (error) {
      message.error(error.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại");
    }
  };

  const handleCancelOrder = async (mahang) => {
    try {
      await orderService.customerCancelOrder(mahang);
      message.success("Đơn hàng đã được hủy thành công.");
      await refreshOrders();
    } catch (error) {
      message.error(error.response?.data?.error || "Không thể hủy đơn hàng này.");
    }
  };

  // Tính toán tổng tiền hàng
  const calcSubtotal = (items) => {
    return items.reduce((acc, item) => acc + (item.variant_price || item.price || item.dongia || 0) * item.soluong, 0);
  };

  // Lắng nghe socket: Admin cập nhật trạng thái → UI tự cập nhật
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ order_id, order_status }) => {
      // Cập nhật danh sách đơn hàng
      setGrouped(prev =>
        prev.map(order =>
          order.mahang === order_id
            ? { ...order, order_status }
            : order,
        ),
      );

      // Nếu Drawer đang mở đúng đơn này → cập nhật luôn
      setSelectedOrder(prev =>
        prev && prev.mahang === order_id
          ? { ...prev, order_status }
          : prev,
      );
    };

    socket.on('order_status_updated', handleStatusUpdate);
    return () => socket.off('order_status_updated', handleStatusUpdate);
  }, [socket]);

  useEffect(() => {
    const userId = user?.user_id || user?.user_code || user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    orderService
      .getByUserCode(userId)
      .then(data => {
        // Group by mahang
        const groups = {};
        (data || []).forEach(item => {
          if (!groups[item.mahang])
            groups[item.mahang] = { ...item, items: [] };
          groups[item.mahang].items.push(item);
        });
        // Sắp xếp đơn hàng mới nhất lên đầu
        const sortedGroups = Object.values(groups).sort(
          (a, b) => new Date(b.ngayDatHang) - new Date(a.ngayDatHang),
        );
        setGrouped(sortedGroups);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openOrderId = params.get("openOrder");
    if (openOrderId && grouped.length > 0) {
      const found = grouped.find(o => String(o.mahang) === String(openOrderId));
      if (found) {
        setSelectedOrder(found);
        setDrawerVisible(true);
      }
    }
  }, [location.search, grouped]);

  // Lọc theo Tab
  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return grouped;
    return grouped.filter(order => order.order_status === activeTab);
  }, [grouped, activeTab]);

  if (!user)
    return (
      <div className="orders-not-logged-in">
        <Text>Vui lòng đăng nhập để xem đơn mua.</Text>
      </div>
    );

  if (loading)
    return (
      <div className="orders-loading">
        <Spin size="large" />
      </div>
    );

  const tabsItems = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" },
    { key: "confirmed", label: "Đang xử lý" },
    { key: "shipping", label: "Đang giao" },
    { key: "completed", label: "Hoàn thành" },
    { key: "cancelled", label: "Đã hủy" },
  ];

  return (
    <div className="orders-page-wrap">
      <Title level={2} className="orders-page-title">
        📦 Đơn hàng của tôi
      </Title>

      <div className="orders-tabs-wrapper">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabsItems} />
      </div>

      {filteredOrders.length === 0 ? (
        <Empty description="Không có đơn hàng nào" className="orders-empty-state">
          <Link to="/">
            <Button type="primary">Mua sắm ngay</Button>
          </Link>
        </Empty>
      ) : (
        <div className="order-card-list">
          {filteredOrders.map(order => {
            const statusObj =
              STATUS_MAP[order.order_status] || STATUS_MAP["pending"];
            const displayItems = order.items.slice(0, 2);
            const hiddenCount = order.items.length - 2;

            return (
              <div key={order.mahang} className="order-card">
                {/* Header */}
                <div className="order-card-header">
                  <div className="order-card-title">
                    <Text className="order-card-id">#{order.mahang}</Text>
                    <Text className="order-card-date">
                      {order.ngayDatHang
                        ? new Date(order.ngayDatHang).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "--"}
                    </Text>
                  </div>
                  <Space>
                    {(order.payment_method === 'PAYPAL' || order.payment_method === 'paypal') && (
                      <Tag color="purple">PayPal</Tag>
                    )}
                    <Tag className="custom-status-tag" color={statusObj.color}>
                      {statusObj.label}
                    </Tag>
                  </Space>
                </div>

                {/* Body */}
                <div className="order-card-body">
                  {displayItems.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <div className="order-item-info">
                        <img
                          src={getImageUrl(item.product_image)}
                          alt=""
                          className="order-item-img"
                        />
                        <div>
                          <div className="order-item-name">
                            {item.product_name}
                          </div>
                          <div className="order-item-quantity">
                            x{item.soluong}
                          </div>
                        </div>
                      </div>
                      <div className="order-item-price">
                        {formatCurrency(
                          item.variant_price || item.price || item.dongia || 0,
                        )}
                      </div>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <div className="order-more-items">
                      và {hiddenCount} sản phẩm khác
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="order-card-footer">
                  <div className="order-total-section">
                    <span className="order-total-label">Thành tiền:</span>
                    <span className="order-total-price">
                      {formatCurrency(order.tongDoanhThu)}
                    </span>
                  </div>
                  <div className="order-card-actions">
                    {/* Nút Hủy đơn: chỉ hiện khi đơn đang Chờ xác nhận */}
                    {order.order_status === "pending" && (
                      <Popconfirm
                        title="Hủy đơn hàng?"
                        description="Bạn có chắc muốn hủy đơn hàng này không?"
                        onConfirm={() => handleCancelOrder(order.mahang)}
                        okText="Hủy đơn"
                        okButtonProps={{ danger: true }}
                        cancelText="Quay lại"
                      >
                        <Button danger>Hủy đơn</Button>
                      </Popconfirm>
                    )}
                    {/* Nút Đã nhận được hàng: chỉ hiện khi đang giao */}
                    {order.order_status === "shipping" && (
                      <Popconfirm
                        title="Xác nhận nhận hàng?"
                        description="Bạn có chắc chắn đã nhận được đơn hàng này?"
                        onConfirm={() => handleConfirmReceived(order.mahang)}
                        okText="Đồng ý"
                        cancelText="Hủy"
                      >
                        <Button type="primary">Đã nhận được hàng</Button>
                      </Popconfirm>
                    )}
                    <Button className="order-detail-btn" onClick={() => handleOpenDrawer(order)}>Xem chi tiết</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAWER CHI TIẾT ĐƠN HÀNG */}
      <Drawer
        title={<span className="drawer-title-id">Chi tiết đơn hàng #{selectedOrder?.mahang}</span>}
        placement="right"
        width={500}
        onClose={handleCloseDrawer}
        open={drawerVisible}
        destroyOnClose
      >
        {selectedOrder && (
          <div className="drawer-content-wrap">
            {/* Thanh Tiến Trình (Trừ khi bị hủy) */}
            {selectedOrder.order_status !== "cancelled" ? (
              <Steps
                current={STEP_STATUS[selectedOrder.order_status] ?? 0}
                size="small"
                progressDot
                labelPlacement="vertical"
                className="drawer-steps-bar"
                items={[
                  { title: "Đã đặt" },
                  { title: "Đang xử lý" },
                  { title: "Đang giao" },
                  { title: "Hoàn thành" },
                ]}
              />
            ) : (
              <div className="drawer-steps-bar">
                <Tag color="error" className="drawer-cancelled-tag">Đơn hàng đã bị hủy</Tag>
              </div>
            )}

            {/* Thông tin nhận hàng */}
            <div className="drawer-order-info">
              <Text className="drawer-section-title">Thông tin nhận hàng</Text>
              <p><Text type="secondary">Người nhận:</Text> {selectedOrder.customer_name || user.name || "Khách hàng"}</p>
              <p><Text type="secondary">Số điện thoại:</Text> {selectedOrder.customer_phone || user.phone || "Không có"}</p>
              <p><Text type="secondary">Địa chỉ:</Text> {selectedOrder.customer_address || user.address || "Không có địa chỉ"}</p>
              <Divider className="drawer-divider" />
              <p>
                <Text type="secondary">Phương thức thanh toán:</Text>{" "}
                {selectedOrder.payment_method === "PAYPAL" || selectedOrder.payment_method === "paypal"
                  ? (selectedOrder.order_status === "pending" || selectedOrder.order_status === "cancelled" ? "Thanh toán qua PayPal (Chưa thanh toán)" : "Thanh toán qua PayPal (Đã thanh toán)")
                  : selectedOrder.payment_method === "BANK"
                  ? "Chuyển khoản (ATM)"
                  : selectedOrder.payment_method === "MOMO"
                  ? "Ví MoMo"
                  : selectedOrder.payment_method === "VNPAY"
                  ? "Cổng VNPAY"
                  : "Thanh toán khi nhận hàng (COD)"}
              </p>
            </div>

            {/* Danh sách sản phẩm */}
            <Text className="drawer-section-title">Sản phẩm ({selectedOrder.items.length})</Text>
            <List
              className="drawer-product-list"
              itemLayout="horizontal"
              dataSource={selectedOrder.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<img src={getImageUrl(item.product_image)} alt="product" className="drawer-item-img" />}
                    title={<span className="drawer-item-title">{item.product_name}</span>}
                    description={`Số lượng: x${item.soluong}`}
                  />
                  <div className="drawer-item-price-meta">{formatCurrency(item.variant_price || item.price || item.dongia || 0)}</div>
                </List.Item>
              )}
            />

            {/* Tổng kết tiền */}
            <div className="drawer-summary">
              <div className="drawer-summary-row">
                <span>Tiền hàng</span>
                <span>{formatCurrency(calcSubtotal(selectedOrder.items))}</span>
              </div>
              <div className="drawer-summary-row">
                <span>Phí vận chuyển</span>
                <span>Miễn phí</span>
              </div>
              <div className="drawer-summary-row total">
                <span>Tổng thanh toán</span>
                <span>{formatCurrency(selectedOrder.tongDoanhThu)}</span>
              </div>
            </div>

            {/* Hành động */}
            <div className="drawer-actions">
              {selectedOrder.order_status === "pending" && (
                <Button danger onClick={() => message.info("Tính năng Hủy đơn đang phát triển")}>Hủy đơn</Button>
              )}
              {selectedOrder.order_status === "completed" && (
                <>
                  <Button onClick={() => message.info("Tính năng Đánh giá đang phát triển")}>Đánh giá</Button>
                  <Button type="primary" onClick={() => message.info("Tính năng Mua lại đang phát triển")}>Mua lại</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Orders;
