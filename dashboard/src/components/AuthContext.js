import React, { createContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const urlToken = query.get("token");
    if (urlToken) {
      localStorage.setItem("authToken", urlToken);
      query.delete("token");
      const cleaned = `${window.location.pathname}${query.toString() ? `?${query.toString()}` : ''}`;
      window.history.replaceState(null, "", cleaned);
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((response) => {
        setUser(response.data.user);
      })
      .catch(() => {
        localStorage.removeItem("authToken");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("authToken", response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const signup = async (email, password) => {
    const response = await api.post("/auth/signup", { email, password });
    localStorage.setItem("authToken", response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
