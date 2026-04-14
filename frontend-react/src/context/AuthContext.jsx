import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const tokenKey = "token";
  const userKey = "user";

  useEffect(() => {
    // Khôi phục session từ localStorage
    const savedToken = localStorage.getItem(tokenKey);
    const savedUser = localStorage.getItem(userKey);
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem(tokenKey, userToken);
    localStorage.setItem(userKey, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  };

  const isAdmin = () => user && (user.role === 0 || user.role === "0");

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAdmin, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng trong AuthProvider");
  return ctx;
};

export default AuthContext;
