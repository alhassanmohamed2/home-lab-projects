import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));

    useEffect(() => {
        if (token) {
            api.get("/auth/me")
                .then((res) => setUser(res.data))
                .catch(() => logout());
        }
    }, [token]);

    const login = async (username, password) => {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        const res = await api.post("/auth/token", formData);
        localStorage.setItem("token", res.data.access_token);
        setToken(res.data.access_token);
    };

    const signup = async (username, email, password) => {
        await api.post("/auth/signup", { username, email, password });
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
