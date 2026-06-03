const cron = require('node-cron');
const db = require('../config/db');
const OrderModel = require('../models/orderModel');
const { getIO } = require('../socket');

const initCronJobs = () => {
    // Chạy mỗi phút kiểm tra đơn hàng quá hạn lấy
    cron.schedule('* * * * *', async () => {
        try {
            const [orders] = await db.query(
                `SELECT order_id, user_id FROM orders 
                 WHERE shipping_method = 'pickup' 
                 AND order_status NOT IN ('cancelled', 'completed') 
                 AND pickup_status != 'received' 
                 AND pickup_time IS NOT NULL 
                 AND pickup_time < DATE_SUB(NOW(), INTERVAL 2 HOUR)`
            );

            if (orders.length > 0) {
                console.log(`[CRON] Found ${orders.length} overdue pickup orders. Cancelling...`);
                for (const order of orders) {
                    try {
                        const restoredItems = await OrderModel.cancelOrderWithStockRestore(order.order_id);
                        console.log(`[CRON] Cancelled order ${order.order_id} due to overdue pickup.`);
                        
                        // Cập nhật note để lưu vết lý do hủy
                        await db.query(
                            `UPDATE orders SET note = CONCAT(IFNULL(note, ''), '\\n[Hệ thống tự động hủy: Khách không đến lấy]') WHERE order_id = ?`,
                            [order.order_id]
                        );

                        // Phát sự kiện qua Socket
                        try {
                            const io = getIO();
                            if (Array.isArray(restoredItems)) {
                                for (const item of restoredItems) {
                                    io.emit('inventory_change', {
                                        variantId: item.variant_id,
                                        productId: item.product_id,
                                        newStock: item.newStock,
                                    });
                                }
                            }
                            io.emit('order_status_updated', {
                                order_id: Number(order.order_id),
                                order_status: 'cancelled',
                                updated_by: 'system_cron',
                                user_id: order.user_id,
                                cancel_reason: 'Khách không đến lấy'
                            });
                        } catch (socketErr) {
                            console.warn('[CRON Socket] Emit error (non-critical):', socketErr.message);
                        }

                    } catch (err) {
                        console.error(`[CRON] Error cancelling order ${order.order_id}:`, err);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Error checking overdue pickup orders:', error);
        }
    });

    console.log('[CRON] Started cron jobs.');
};

module.exports = { initCronJobs };
