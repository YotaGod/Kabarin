import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = BACKEND_URL + "/api";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("sc_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (e) => {
        if (e.response?.status === 401) {
            const here = window.location.pathname;
            if (!here.startsWith("/login") && !here.startsWith("/register") && here !== "/") {
                localStorage.removeItem("sc_token");
                localStorage.removeItem("sc_user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(e);
    }
);

export default api;
