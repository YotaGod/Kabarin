import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { toast } from "sonner";
import { Plus, User } from "@phosphor-icons/react";

export default function AdminOfficers() {
    const [officers, setOfficers] = useState([]);
    const [depts, setDepts] = useState([]);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", department_id: "" });

    const load = () => Promise.all([
        api.get("/officers"),
        api.get("/departments"),
    ]).then(([o, d]) => { setOfficers(o.data); setDepts(d.data); });
    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/officers?dept_id=${encodeURIComponent(form.department_id)}`, {
                name: form.name, email: form.email, password: form.password,
                phone: form.phone, role: "officer",
            });
            toast.success("Officer created");
            setCreating(false);
            setForm({ name: "", email: "", password: "", phone: "", department_id: "" });
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed");
        }
    };

    const reassign = async (off, deptId) => {
        try {
            await api.put(`/officers/${off.id}/department?dept_id=${encodeURIComponent(deptId)}`);
            toast.success("Updated");
            load();
        } catch { toast.error("Failed"); }
    };

    const deptName = (id) => depts.find((d) => d.id === id)?.name || "Unassigned";

    return (
        <Layout>
            <div className="flex items-end justify-between mb-8">
                <div>
                    <div className="label-mono mb-2">Admin</div>
                    <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Officers</h1>
                    <p className="text-muted-foreground mt-1">{officers.length} officers across {depts.length} departments.</p>
                </div>
                <button data-testid="new-officer-btn" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90">
                    <Plus size={16} weight="bold" /> Add officer
                </button>
            </div>

            <div className="bg-white border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                        <tr>
                            <th className="px-4 py-2.5 label-mono">Name</th>
                            <th className="px-4 py-2.5 label-mono">Email</th>
                            <th className="px-4 py-2.5 label-mono">Phone</th>
                            <th className="px-4 py-2.5 label-mono">Department</th>
                        </tr>
                    </thead>
                    <tbody data-testid="officers-table">
                        {officers.map((o) => (
                            <tr key={o.id} className="border-t border-border" data-testid={`officer-row-${o.id}`}>
                                <td className="px-4 py-3 font-semibold flex items-center gap-2"><User size={14} weight="bold" />{o.name}</td>
                                <td className="px-4 py-3">{o.email}</td>
                                <td className="px-4 py-3">{o.phone || "—"}</td>
                                <td className="px-4 py-3">
                                    <select value={o.department_id || ""} onChange={(e) => reassign(o, e.target.value)}
                                        data-testid={`reassign-${o.id}`}
                                        className="px-2 py-1 rounded-md border border-border bg-white text-sm">
                                        <option value="">Unassigned</option>
                                        {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {creating && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="officer-modal">
                    <form onSubmit={save} className="bg-white rounded-lg w-full max-w-md p-6 animate-fade-up">
                        <h2 className="font-heading text-xl font-semibold mb-4">New officer</h2>
                        <div className="space-y-3">
                            <input data-testid="officer-name" required placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                            <input data-testid="officer-email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                            <input data-testid="officer-password" required type="password" placeholder="Initial password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                            <input data-testid="officer-phone" placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                            <select data-testid="officer-dept" required value={form.department_id} onChange={(e) => setForm({...form, department_id: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white">
                                <option value="">Choose department...</option>
                                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-md border border-border hover:bg-muted text-sm">Cancel</button>
                            <button type="submit" data-testid="officer-save-btn" className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </Layout>
    );
}
