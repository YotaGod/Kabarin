import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem("sc_user") || "null"); }
        catch { return null; }
    });
    const [loading, setLoading] = useState(false);

    const setSession = (token, u) => {
        localStorage.setItem("sc_token", token);
        localStorage.setItem("sc_user", JSON.stringify(u));
        setUser(u);
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setSession(data.token, data.user);
            return data.user;
        } finally { setLoading(false); }
    };

    const register = async (payload) => {
        setLoading(true);
        try {
            const { data } = await api.post("/auth/register", payload);
            setSession(data.token, data.user);
            return data.user;
        } finally { setLoading(false); }
    };

    const logout = () => {
        localStorage.removeItem("sc_token");
        localStorage.removeItem("sc_user");
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem("sc_token");
        if (token && !user) {
            api.get("/auth/me")
                .then((r) => { setUser(r.data); localStorage.setItem("sc_user", JSON.stringify(r.data)); })
                .catch(() => {});
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

export const roleHome = (role) => {
    if (role === "admin") return "/admin";
    if (role === "officer") return "/officer";
    return "/citizen";
};
