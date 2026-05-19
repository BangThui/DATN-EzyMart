const paypal = require('@paypal/checkout-server-sdk');

// Cấu hình môi trường Sandbox cho PayPal
const clientId = process.env.PAYPAL_CLIENT_ID || 'your_paypal_sandbox_client_id';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'your_paypal_sandbox_client_secret';

if (clientId === 'your_paypal_sandbox_client_id' || clientSecret === 'your_paypal_sandbox_client_secret') {
    console.warn('⚠️ Cảnh báo: Bạn chưa cấu hình PAYPAL_CLIENT_ID hoặc PAYPAL_CLIENT_SECRET thực tế trong file .env');
}

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

module.exports = {
    client,
    paypal
};
