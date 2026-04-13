const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Không có token xác thực' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 1) {
        return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };
