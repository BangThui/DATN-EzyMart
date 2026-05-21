-- ============================================================
-- Migration: Thêm các trường Click & Collect vào bảng orders
-- Chạy script này 1 lần duy nhất trên database
-- ============================================================

-- Thêm cột shipping_method: 'delivery' (giao tận nơi) | 'pickup' (nhận tại cửa hàng)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS shipping_method ENUM('delivery', 'pickup') NOT NULL DEFAULT 'delivery'
    AFTER note;

-- Thêm cột pickup_time: thời gian khách hẹn đến lấy hàng (NULL nếu là giao tận nơi)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS pickup_time DATETIME DEFAULT NULL
    AFTER shipping_method;

-- Thêm cột pickup_status: trạng thái chuẩn bị hàng tại quầy
--   'none'     - Không áp dụng (đơn giao tận nơi)
--   'waiting'  - Đang chuẩn bị (mặc định khi đặt đơn pickup)
--   'prepared' - Đã soạn xong, chờ khách đến
--   'received' - Đã giao cho khách thành công
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS pickup_status ENUM('none', 'waiting', 'prepared', 'received') NOT NULL DEFAULT 'none'
    AFTER pickup_time;

-- Cập nhật dữ liệu cũ: các đơn hàng cũ mặc định là delivery + none
UPDATE orders
SET shipping_method = 'delivery',
    pickup_status   = 'none'
WHERE shipping_method IS NULL OR shipping_method = '';

-- Tạo index để tìm kiếm nhanh các đơn pickup đang chờ
CREATE INDEX IF NOT EXISTS idx_orders_shipping_method
    ON orders (shipping_method);

CREATE INDEX IF NOT EXISTS idx_orders_pickup_status
    ON orders (pickup_status);

-- Kiểm tra kết quả
SELECT
    COUNT(*) AS total_orders,
    SUM(CASE WHEN shipping_method = 'pickup' THEN 1 ELSE 0 END) AS pickup_orders,
    SUM(CASE WHEN shipping_method = 'delivery' THEN 1 ELSE 0 END) AS delivery_orders
FROM orders;
