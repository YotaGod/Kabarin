import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { toast } from "sonner";
import { FlowArrow } from "@phosphor-icons/react";

const CATEGORIES = ["Road Damage", "Flood", "Garbage", "Traffic", "Public Lighting", "Water Leak", "Crime", "Vandalism", "Public Facility Damage", "Environmental Issue", "Other"];

export default function AdminRouting() {
    const [rules, setRules] = useState([]);
    const [depts, setDepts] = useState([]);

    const load = () => Promise.all([
        api.get("/routing-rules"),
        api.get("/departments"),
    ]).then(([r, d]) => { setRules(r.data); setDepts(d.data); });
    useEffect(() => { load(); }, []);

    const ruleFor = (category) => rules.find((r) => r.category === category);

    const update = async (category, deptId, slaHours) => {
        try {
            await api.post("/routing-rules", { category, department_id: deptId, sla_hours: Number(slaHours) });
            toast.success("Saved");
            load();
        } catch { toast.error("Save failed"); }
    };

    return (
        <Layout>
            <div className="mb-8">
                <div className="label-mono mb-2">Admin</div>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold flex items-center gap-3">
                    <FlowArrow size={28} weight="duotone" className="text-primary" /> Routing rules
                </h1>
                <p className="text-muted-foreground mt-1">Define which department handles each category and the SLA target.</p>
            </div>

            <div className="bg-white border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                        <tr>
                            <th className="px-4 py-2.5 label-mono">Category</th>
                            <th className="px-4 py-2.5 label-mono">Routes to</th>
                            <th className="px-4 py-2.5 label-mono">SLA (hours)</th>
                        </tr>
                    </thead>
                    <tbody data-testid="routing-table">
                        {CATEGORIES.map((cat) => {
                            const r = ruleFor(cat);
                            return (
                                <tr key={cat} className="border-t border-border" data-testid={`rule-row-${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                                    <td className="px-4 py-3 font-semibold">{cat}</td>
                                    <td className="px-4 py-3">
                                        <select value={r?.department_id || ""}
                                            data-testid={`rule-dept-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                                            onChange={(e) => update(cat, e.target.value, r?.sla_hours || 48)}
                                            className="px-2 py-1 rounded-md border border-border bg-white text-sm">
                                            <option value="">— pick department —</option>
                                            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="number" min={1} max={720} defaultValue={r?.sla_hours || 48}
                                            data-testid={`rule-sla-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                                            onBlur={(e) => update(cat, r?.department_id || depts[0]?.id, e.target.value)}
                                            className="w-24 px-2 py-1 rounded-md border border-border bg-white text-sm font-mono" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
}
