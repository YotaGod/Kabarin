import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";

export default function AdminDepartments() {
    const [depts, setDepts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", contact_email: "", categories: [] });

    const load = () => api.get("/departments").then((r) => setDepts(r.data));
    useEffect(() => { load(); }, []);

    const startCreate = () => { setEditing({}); setForm({ name: "", description: "", contact_email: "", categories: [] }); };
    const startEdit = (d) => { setEditing(d); setForm({ name: d.name, description: d.description || "", contact_email: d.contact_email || "", categories: d.categories || [] }); };

    const save = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, categories: typeof form.categories === "string" ? form.categories.split(",").map(s => s.trim()).filter(Boolean) : form.categories };
            if (editing?.id) {
                await api.put(`/departments/${editing.id}`, payload);
                toast.success("Updated");
            } else {
                await api.post("/departments", payload);
                toast.success("Created");
            }
            setEditing(null);
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const remove = async (d) => {
        if (!confirm(`Delete ${d.name}?`)) return;
        await api.delete(`/departments/${d.id}`);
        toast.success("Deleted");
        load();
    };

    return (
        <Layout>
            <div className="flex items-end justify-between mb-8">
                <div>
                    <div className="label-mono mb-2">Admin</div>
                    <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Departments</h1>
                    <p className="text-muted-foreground mt-1">{depts.length} city departments configured.</p>
                </div>
                <button data-testid="new-department-btn" onClick={startCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90">
                    <Plus size={16} weight="bold" /> Add department
                </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {depts.map((d) => (
                    <div key={d.id} className="bg-white border border-border rounded-lg p-5" data-testid={`dept-card-${d.id}`}>
                        <h3 className="font-heading font-semibold mb-1">{d.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{d.description}</p>
                        {d.categories?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {d.categories.map((c) => (
                                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{c}</span>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{d.contact_email}</span>
                            <div className="flex gap-1">
                                <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-muted" data-testid={`edit-dept-${d.id}`}>
                                    <PencilSimple size={14} />
                                </button>
                                <button onClick={() => remove(d)} className="p-1.5 rounded hover:bg-muted text-brand-danger" data-testid={`del-dept-${d.id}`}>
                                    <Trash size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editing !== null && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" data-testid="dept-modal">
                    <form onSubmit={save} className="bg-white rounded-lg w-full max-w-md p-6 animate-fade-up">
                        <h2 className="font-heading text-xl font-semibold mb-4">{editing?.id ? "Edit" : "New"} department</h2>
                        <div className="space-y-3">
                            <input data-testid="dept-name" required placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                            <textarea data-testid="dept-desc" placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" rows={2} />
                            <input data-testid="dept-email" type="email" placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm({...form, contact_email: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                            <input data-testid="dept-cats" placeholder="Categories (comma-separated)" value={Array.isArray(form.categories) ? form.categories.join(", ") : form.categories} onChange={(e) => setForm({...form, categories: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border bg-white" />
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-md border border-border hover:bg-muted text-sm">Cancel</button>
                            <button type="submit" data-testid="dept-save-btn" className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </Layout>
    );
}
