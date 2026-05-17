import React, { useState, useEffect, useCallback } from "react";
import { Badge, Popover, List, Typography, Empty, Button } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const { Text } = Typography;

const NotificationBell = ({ isAdmin = false }) => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  // Khôi phục thông báo từ LocalStorage ngay khi khởi tạo state để tránh race-condition trong React 18 StrictMode
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(
      isAdmin ? "admin_notifications" : "user_notifications",
    );
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Lỗi đọc LocalStorage:", err);
        return [];
      }
    }
    return [];
  });
  const [shake, setShake] = useState(false);
  const [visible, setVisible] = useState(false);

  // Lưu thông báo vào LocalStorage khi state thay đổi
  useEffect(() => {
    localStorage.setItem(
      isAdmin ? "admin_notifications" : "user_notifications",
      JSON.stringify(notifications),
    );
  }, [notifications, isAdmin]);

  const addNotification = useCallback(newNotif => {
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Giữ tối đa 50 thông báo
    setShake(true);
    // Tắt hiệu ứng rung sau 1s
    setTimeout(() => setShake(false), 1000);
  }, []);

  // Lắng nghe Socket
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = data => {
      if (isAdmin) {
        addNotification({
          id: Date.now(),
          order_id: data.order_id,
          title: `🔔 Đơn hàng mới #${data.order_id}`,
          content: `Khách hàng ${data.customer_name} vừa đặt đơn hàng mới.`,
          time: new Date().toISOString(),
          isRead: false,
          type: "new_order",
        });
      }
    };

    const handleStatusUpdate = data => {
      if (isAdmin) {
        if (data.updated_by === "customer") {
          const isCompleted = data.order_status === "completed";
          addNotification({
            id: Date.now(),
            order_id: data.order_id,
            title: isCompleted
              ? `✅ Đơn hàng #${data.order_id} đã hoàn thành`
              : `⚠️ Đơn hàng #${data.order_id} đã hủy`,
            content: isCompleted
              ? `Khách hàng đã xác nhận nhận hàng.`
              : `Khách hàng vừa thực hiện hủy đơn hàng.`,
            time: new Date().toISOString(),
            isRead: false,
            type: "status_update",
          });
        }
      } else {
        addNotification({
          id: Date.now(),
          order_id: data.order_id,
          title: `📦 Cập nhật đơn hàng #${data.order_id}`,
          content: `Đơn hàng của bạn đã chuyển sang trạng thái: ${getStatusLabel(data.order_status)}`,
          time: new Date().toISOString(),
          isRead: false,
          type: "status_update",
        });
      }
    };

    socket.on("new_order_alert", handleNewOrder);
    socket.on("order_status_updated", handleStatusUpdate);

    return () => {
      socket.off("new_order_alert", handleNewOrder);
      socket.off("order_status_updated", handleStatusUpdate);
    };
  }, [socket, isAdmin, addNotification]);

  const getStatusLabel = status => {
    const map = {
      pending: "Chờ xác nhận",
      confirmed: "Đang xử lý",
      shipping: "Đang giao hàng",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return map[status] || status;
  };

  const handleMarkAsRead = id => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = notif => {
    handleMarkAsRead(notif.id);
    setVisible(false);

    if (isAdmin) {
      navigate(`/admin/orders`);
    } else {
      navigate(`/orders?openOrder=${notif.order_id}`);
    }
  };

  const formatTime = timeStr => {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
    return date.toLocaleDateString("vi-VN");
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const notificationContent = (
    <div className="notification-popover-content">
      <div className="notification-popover-header">
        <span>Thông báo</span>
        {unreadCount > 0 && (
          <span
            className="notification-mark-read-btn"
            onClick={handleMarkAllRead}
          >
            Đánh dấu tất cả là đã đọc
          </span>
        )}
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có thông báo nào"
            />
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-item ${notif.isRead ? "read" : "unread"}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className="notification-item-header">
                <span className="notification-item-title">{notif.title}</span>
                <span className="notification-item-time">
                  {formatTime(notif.time)}
                </span>
              </div>
              <div className="notification-item-desc">{notif.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="notification-bell-wrap">
      <Popover
        content={notificationContent}
        trigger="click"
        placement="bottomRight"
        open={visible}
        onOpenChange={setVisible}
        overlayClassName="notification-popover"
        arrow={{ pointAtCenter: true }}
      >
        <Badge count={unreadCount} size="small">
          <button className={`notification-bell-btn ${shake ? "shake" : ""}`}>
            <BellOutlined />
          </button>
        </Badge>
      </Popover>
    </div>
  );
};

export default NotificationBell;
