import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../lib/auth";
import { toast } from "sonner";
import { ShieldStar } from "@phosphor-icons/react";

export default function Login() {
    const { login, loading } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });

    const submit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(form.email, form.password);
            toast.success(`Welcome, ${user.name}`);
            nav(roleHome(user.role));
        } catch (err) {
            toast.error(err.response?.data?.detail || "Login failed");
        }
    };

    const quickLogin = (email, pwd) => setForm({ email, password: pwd });

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <div className="md:flex-1 bg-primary text-white relative overflow-hidden hidden md:block">
                <img
                    src="https://images.unsplash.com/photo-1520333789090-1afc82db536a?q=80&w=2071&auto=format&fit=crop"
                    alt="City"
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
                <div className="relative z-10 p-12 h-full flex flex-col">
                    <Link to="/" className="flex items-center gap-2" data-testid="login-logo">
                        <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-md object-cover" />
                        <div className="font-heading font-semibold">Smart City &amp; Public</div>
                    </Link>
                    <div className="mt-auto">
                        <h2 className="font-heading text-4xl font-semibold leading-tight mb-4">
                            Welcome back to<br />the control room.
                        </h2>
                        <p className="text-white/80 max-w-md">Officers and admins manage citizen reports in real time, with AI guidance.</p>
                    </div>
                </div>
            </div>

            <div className="md:flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
                <div className="w-full max-w-sm">
                    <h1 className="font-heading text-3xl font-semibold mb-2">Sign in</h1>
                    <p className="text-sm text-muted-foreground mb-8">No account? <Link to="/register" className="text-primary font-semibold hover:underline" data-testid="login-go-register">Create one</Link></p>

                    <form onSubmit={submit} className="space-y-4" data-testid="login-form">
                        <div>
                            <label className="label-mono block mb-1.5">Email</label>
                            <input
                                data-testid="login-email-input"
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="label-mono block mb-1.5">Password</label>
                            <input
                                data-testid="login-password-input"
                                type="password"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <button
                            data-testid="login-submit-btn"
                            disabled={loading}
                            type="submit"
                            className="w-full py-2.5 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-60"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border">
                        <div className="label-mono mb-3">Demo accounts</div>
                        <div className="space-y-2 text-xs">
                            <button data-testid="quick-admin" onClick={() => quickLogin("admin@smartcity.gov", "Admin@12345")} className="w-full text-left px-3 py-2 rounded-md bg-muted hover:bg-muted/70 transition">
                                <span className="font-semibold">Admin</span> · admin@smartcity.gov / Admin@12345
                            </button>
                            <button data-testid="quick-officer" onClick={() => quickLogin("officer1@smartcity.gov", "Officer@123")} className="w-full text-left px-3 py-2 rounded-md bg-muted hover:bg-muted/70 transition">
                                <span className="font-semibold">Officer</span> · officer1@smartcity.gov / Officer@123
                            </button>
                            <button data-testid="quick-citizen" onClick={() => quickLogin("citizen@smartcity.gov", "Citizen@123")} className="w-full text-left px-3 py-2 rounded-md bg-muted hover:bg-muted/70 transition">
                                <span className="font-semibold">Citizen</span> · citizen@smartcity.gov / Citizen@123
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
