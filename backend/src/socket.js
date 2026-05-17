/**
 * Socket.io Singleton Module
 * Dùng chung instance `io` trên toàn backend mà không bị circular dependency.
 * Cách dùng ở controller: const { getIO } = require('../socket');
 */

let _io = null;

const init = (server) => {
    const { Server } = require('socket.io');
    _io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    _io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // Khách hàng gửi user_id để join vào room riêng
        socket.on('register_user', (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);
                console.log(`[Socket] User ${userId} joined room user_${userId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return _io;
};

const getIO = () => {
    if (!_io) throw new Error('Socket.io chưa được khởi tạo. Gọi init(server) trước.');
    return _io;
};

module.exports = { init, getIO };
