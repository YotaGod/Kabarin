import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../lib/auth";
import { useRealtime } from "../lib/ws";
import api from "../lib/api";
import { Bell, SignOut, House, MapPin, Plus, ChartBar, Buildings, Users, FlowArrow, ShieldStar } from "@phosphor-icons/react";
import { toast } from "sonner";

const NAV_BY_ROLE = {
    citizen: [
        { to: "/citizen", label: "Dashboard", icon: House },
        { to: "/citizen/submit", label: "New Report", icon: Plus },
        { to: "/citizen/map", label: "City Map", icon: MapPin },
    ],
    officer: [
        { to: "/officer", label: "Queue", icon: House },
        { to: "/officer/map", label: "Map", icon: MapPin },
    ],
    admin: [
        { to: "/admin", label: "Analytics", icon: ChartBar },
        { to: "/admin/departments", label: "Departments", icon: Buildings },
        { to: "/admin/officers", label: "Officers", icon: Users },
        { to: "/admin/routing", label: "Routing", icon: FlowArrow },
        { to: "/admin/map", label: "Live Map", icon: MapPin },
    ],
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const [notifs, setNotifs] = useState([]);
    const [open, setOpen] = useState(false);

    const loadNotifs = async () => {
        try {
            const { data } = await api.get("/notifications");
            setNotifs(data);
        } catch {}
    };

    useEffect(() => { if (user) loadNotifs(); }, [user]);

    useRealtime((evt) => {
        if (evt.event === "notification") {
            setNotifs((prev) => [evt.data, ...prev]);
            toast(evt.data.title, { description: evt.data.body });
        } else if (evt.event === "report_updated") {
            // bubble event by re-emitting custom DOM event
            window.dispatchEvent(new CustomEvent("sc:report_updated", { detail: evt.data }));
        } else if (evt.event === "report_created") {
            window.dispatchEvent(new CustomEvent("sc:report_created", { detail: evt.data }));
        }
    });

    const unread = notifs.filter((n) => !n.read).length;

    const items = NAV_BY_ROLE[user?.role] || [];

    return (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border" data-testid="app-navbar">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
                <Link to={user ? roleHome(user.role) : "/"} className="flex items-center gap-2" data-testid="logo-link">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
                    <div className="leading-tight">
                        <div className="font-heading font-semibold text-sm">Smart City</div>
                        <div className="label-mono text-[9px]">& Public</div>
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-1 ml-4">
                    {items.map((it) => (
                        <NavLink
                            key={it.to}
                            to={it.to}
                            end={it.to.endsWith("/citizen") || it.to.endsWith("/officer") || it.to.endsWith("/admin")}
                            data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g,'-')}`}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    isActive ? "bg-primary text-white" : "text-foreground hover:bg-muted"
                                }`
                            }
                        >
                            <it.icon size={16} weight="bold" />
                            <span>{it.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-3">
                    {user && (
                        <div className="relative">
                            <button
                                data-testid="notifications-btn"
                                onClick={() => setOpen((v) => !v)}
                                className="relative p-2 rounded-md hover:bg-muted transition"
                            >
                                <Bell size={20} weight="bold" />
                                {unread > 0 && (
                                    <span className="absolute top-0.5 right-0.5 bg-brand-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {unread > 9 ? "9+" : unread}
                                    </span>
                                )}
                            </button>
                            {open && (
                                <div data-testid="notifications-dropdown" className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-lg shadow-lg overflow-hidden animate-fade-up">
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                                        <span className="font-heading font-semibold text-sm">Notifications</span>
                                        <button
                                            data-testid="mark-all-read-btn"
                                            onClick={async () => { await api.post("/notifications/read-all"); loadNotifs(); }}
                                            className="text-xs text-primary hover:underline"
                                        >Mark all read</button>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifs.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                                        ) : notifs.slice(0, 20).map((n) => (
                                            <div key={n.id} className={`px-4 py-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer ${!n.read ? "bg-blue-50/40" : ""}`}
                                                onClick={async () => { await api.post(`/notifications/${n.id}/read`); loadNotifs(); if (n.report_id) nav(`/reports/${n.report_id}`); setOpen(false); }}
                                            >
                                                <div className="font-semibold text-sm">{n.title}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right leading-tight">
                                <div className="text-sm font-semibold">{user.name}</div>
                                <div className="label-mono text-[9px]">{user.role}</div>
                            </div>
                            <button
                                data-testid="logout-btn"
                                onClick={() => { logout(); nav("/login"); }}
                                className="p-2 rounded-md hover:bg-muted transition"
                                title="Logout"
                            >
                                <SignOut size={20} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login" data-testid="login-link" className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-muted">Sign in</Link>
                            <Link to="/register" data-testid="register-link" className="text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary/90">Get started</Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile nav */}
            {user && (
                <div className="md:hidden border-t border-border bg-white">
                    <div className="flex overflow-x-auto px-2 py-1.5 gap-1">
                        {items.map((it) => (
                            <NavLink
                                key={it.to}
                                to={it.to}
                                end={it.to.endsWith("/citizen") || it.to.endsWith("/officer") || it.to.endsWith("/admin")}
                                data-testid={`mobile-nav-${it.label.toLowerCase().replace(/\s+/g,'-')}`}
                                className={({ isActive }) =>
                                    `flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                                        isActive ? "bg-primary text-white" : "text-foreground bg-muted/40"
                                    }`
                                }
                            >
                                <it.icon size={14} weight="bold" />
                                <span>{it.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}
