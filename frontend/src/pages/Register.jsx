import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../lib/auth";
import { toast } from "sonner";

export default function Register() {
    const { register, loading } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "citizen" });

    const submit = async (e) => {
        e.preventDefault();
        try {
            const user = await register(form);
            toast.success("Account created");
            nav(roleHome(user.role));
        } catch (err) {
            toast.error(err.response?.data?.detail || "Registration failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="w-full max-w-md">
                <Link to="/" className="label-mono inline-block mb-6 hover:text-primary" data-testid="register-back-link">← Smart City &amp; Public</Link>
                <h1 className="font-heading text-3xl font-semibold mb-2">Create your account</h1>
                <p className="text-sm text-muted-foreground mb-8">Already have one? <Link to="/login" className="text-primary font-semibold hover:underline" data-testid="register-go-login">Sign in</Link></p>

                <form onSubmit={submit} className="space-y-4" data-testid="register-form">
                    <div>
                        <label className="label-mono block mb-1.5">Full name</label>
                        <input data-testid="register-name-input" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                            className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                        <label className="label-mono block mb-1.5">Email</label>
                        <input data-testid="register-email-input" type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                            className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                        <label className="label-mono block mb-1.5">Phone</label>
                        <input data-testid="register-phone-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                            className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                        <label className="label-mono block mb-1.5">Password</label>
                        <input data-testid="register-password-input" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}
                            className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                        <label className="label-mono block mb-1.5">Account type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[{ v: "citizen", label: "Citizen" }, { v: "officer", label: "Officer" }].map((r) => (
                                <button key={r.v} type="button"
                                    data-testid={`register-role-${r.v}`}
                                    onClick={() => setForm({ ...form, role: r.v })}
                                    className={`py-2.5 rounded-md border transition ${form.role === r.v ? "bg-primary text-white border-primary" : "bg-white border-border hover:bg-muted"}`}
                                >{r.label}</button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">Admin accounts are seeded; ask the system administrator for access.</p>
                    </div>
                    <button data-testid="register-submit-btn" disabled={loading} type="submit"
                        className="w-full py-2.5 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-60">
                        {loading ? "Creating..." : "Create account"}
                    </button>
                </form>
            </div>
        </div>
    );
}
