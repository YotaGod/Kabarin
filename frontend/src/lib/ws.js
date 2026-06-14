import { useEffect, useRef } from "react";

export function useRealtime(onEvent) {
    const wsRef = useRef(null);
    useEffect(() => {
        const token = localStorage.getItem("sc_token");
        if (!token) return;
        const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
        const wsUrl = BACKEND_URL.replace(/^http/, "ws") + `/api/ws?token=${encodeURIComponent(token)}`;
        let ws;
        try { ws = new WebSocket(wsUrl); } catch { return; }
        wsRef.current = ws;
        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                onEvent && onEvent(data);
            } catch {}
        };
        // Send periodic pings to keep alive
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 25000);
        return () => {
            clearInterval(interval);
            try { ws.close(); } catch {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
