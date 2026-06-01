const { client, paypal } = require('../config/paypal');
const db = require('../config/db');
const { getIO } = require('../socket');

/**
 * API 1: POST /api/payment/paypal/create-order
 * Tiếp nhận order_id truyền lên từ Frontend.
 * Lấy số tiền VND, quy đổi USD và gọi PayPal SDK tạo Order.
 */
exports.createOrder = async (req, res) => {
    try {
        const { order_id } = req.body;
        if (!order_id) {
            return res.status(400).json({ error: 'Thiếu mã đơn hàng order_id.' });
        }

        // Truy vấn thông tin đơn hàng từ bảng orders
        const [orders] = await db.query('SELECT total_price FROM orders WHERE order_id = ?', [order_id]);
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy đơn hàng trong hệ thống.' });
        }

        const totalVND = Number(orders[0].total_price);
        // Quy đổi VND sang USD (tỷ giá 25,000) và làm tròn 2 chữ số thập phân
        const totalUSD = (totalVND / 25000).toFixed(2);

        // Tạo PayPal Order Request
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: totalUSD
                },
                description: `Thanh toán Ecomarket - Đơn hàng #${order_id}`
            }]
        });

        // Gọi API PayPal
        const response = await client.execute(request);

        res.status(200).json({
            id: response.result.id,
            status: response.result.status
        });
    } catch (err) {
        console.error('PayPal create order error:', err);
        res.status(500).json({ error: err.message || 'Lỗi kết nối hoặc tạo đơn hàng PayPal.' });
    }
};

/**
 * API 2: POST /api/payment/paypal/capture-order
 * Tiếp nhận paypalOrderId và order_id gửi từ Frontend.
 * Gọi PayPal capture, cập nhật database (payments & orders).
 */
exports.captureOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { paypalOrderId, order_id } = req.body;
        if (!paypalOrderId || !order_id) {
            return res.status(400).json({ error: 'Thiếu paypalOrderId hoặc order_id hệ thống.' });
        }

        // Gọi PayPal Capture Request
        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
        request.requestBody({});
        const response = await client.execute(request);

        const captureResult = response.result;
        
        if (captureResult.status === 'COMPLETED') {
            await connection.beginTransaction();

            // 1. Cập nhật bảng payments
            await connection.query(
                `UPDATE payments 
                 SET payment_status = 'paid', payment_method = 'PAYPAL', transaction_code = ?, payment_date = NOW() 
                 WHERE order_id = ?`,
                [paypalOrderId, order_id]
            );

            // 2. Cập nhật bảng orders
            await connection.query(
                `UPDATE orders 
                 SET order_status = 'confirmed' 
                 WHERE order_id = ?`,
                [order_id]
            );

            await connection.commit();

            // Lấy user_id để gửi socket
            const [orderRows] = await connection.query('SELECT user_id FROM orders WHERE order_id = ?', [order_id]);
            const userId = orderRows.length > 0 ? orderRows[0].user_id : null;

            // Gửi socket thông báo trạng thái đơn hàng thay đổi real-time
            try {
                const io = getIO();
                io.emit('order_status_updated', {
                    order_id: Number(order_id),
                    order_status: 'confirmed',
                    user_id: userId
                });
            } catch (socketErr) {
                console.warn('[Socket] Emit error (non-critical):', socketErr.message);
            }

            return res.status(200).json({
                message: 'Thanh toán đơn hàng qua PayPal thành công.',
                status: captureResult.status,
                order_id
            });
        } else {
            return res.status(400).json({ 
                error: `Giao dịch PayPal thất bại. Trạng thái hiện tại: ${captureResult.status}` 
            });
        }

    } catch (err) {
        await connection.rollback();
        console.error('PayPal capture order error:', err);
        res.status(500).json({ error: err.message || 'Lỗi xử lý xác nhận thanh toán PayPal.' });
    } finally {
        connection.release();
    }
};
