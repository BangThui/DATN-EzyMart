const db = require('./src/config/db');

async function test() {
    try {
        const [orders] = await db.query(
            `SELECT order_id, pickup_time, order_status FROM orders WHERE shipping_method = 'pickup' ORDER BY order_id DESC LIMIT 1`
        );
        if (orders.length > 0) {
            const orderId = orders[0].order_id;
            console.log(`Đang cập nhật pickup_time cho đơn hàng #${orderId}...`);
            await db.query(
                `UPDATE orders SET pickup_time = DATE_SUB(NOW(), INTERVAL 3 HOUR) WHERE order_id = ?`,
                [orderId]
            );
            console.log(`Đã chỉnh giờ hẹn (pickup_time) của đơn hàng #${orderId} lùi lại 3 tiếng so với hiện tại.`);
            console.log(`Cron job sẽ tự động hủy đơn hàng này trong vòng tối đa 1 phút tới (do cron chạy 1 phút/lần)!`);
        } else {
            console.log('Không tìm thấy đơn hàng pickup nào!');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
test();
