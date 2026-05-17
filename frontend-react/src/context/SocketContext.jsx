import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Khởi tạo socket (chưa kết nối ngay)
        const socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Đã kết nối:', socket.id);
            setConnected(true);

            // Đăng ký room theo user_id để nhận thông báo riêng
            const userId = user?.user_id || user?.id;
            if (userId) {
                socket.emit('register_user', userId);
            }
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Mất kết nối, đang reconnect...');
            setConnected(false);
        });

        socket.on('reconnect', () => {
            console.log('[Socket] Đã reconnect thành công');
            // Re-register sau khi reconnect
            const userId = user?.user_id || user?.id;
            if (userId) {
                socket.emit('register_user', userId);
            }
        });

        // Kết nối ngay
        socket.connect();

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chỉ chạy 1 lần khi mount

    // Khi user đăng nhập/đăng xuất → re-register room
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !connected) return;
        const userId = user?.user_id || user?.id;
        if (userId) {
            socket.emit('register_user', userId);
        }
    }, [user, connected]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket phải được dùng bên trong <SocketProvider>');
    return ctx;
};
