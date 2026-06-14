import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { UrgencyBadge, StatusBadge, PriorityMeter } from "../components/Badges";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Warning, Clock, CheckCircle, ListBullets } from "@phosphor-icons/react";

export default function OfficerDashboard() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [filter, setFilter] = useState("active"); // active / critical / sla / all / resolved
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/reports?assigned_to_me=true&limit=500");
            setReports(data);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    useEffect(() => {
        const onUpdate = (e) => {
            const r = e.detail;
            if (r.assigned_officer_id === user?.id) {
                setReports((prev) => {
                    const i = prev.findIndex((x) => x.id === r.id);
                    if (i >= 0) { const c = [...prev]; c[i] = r; return c; }
                    return [r, ...prev];
                });
            }
        };
        window.addEventListener("sc:report_updated", onUpdate);
        window.addEventListener("sc:report_created", onUpdate);
        return () => {
            window.removeEventListener("sc:report_updated", onUpdate);
            window.removeEventListener("sc:report_created", onUpdate);
        };
    }, [user]);

    const now = new Date();
    const stats = useMemo(() => ({
        assigned: reports.length,
        active: reports.filter(r => !["Resolved", "Closed"].includes(r.status)).length,
        critical: reports.filter(r => r.urgency === "Critical" && !["Resolved", "Closed"].includes(r.status)).length,
        sla: reports.filter(r => !["Resolved", "Closed"].includes(r.status) && new Date(r.sla_deadline) < now).length,
        resolved: reports.filter(r => ["Resolved", "Closed"].includes(r.status)).length,
    }), [reports]);

    const list = useMemo(() => {
        let arr = reports;
        if (filter === "active") arr = arr.filter(r => !["Resolved", "Closed"].includes(r.status));
        else if (filter === "critical") arr = arr.filter(r => r.urgency === "Critical" && !["Resolved", "Closed"].includes(r.status));
        else if (filter === "sla") arr = arr.filter(r => !["Resolved", "Closed"].includes(r.status) && new Date(r.sla_deadline) < now);
        else if (filter === "resolved") arr = arr.filter(r => ["Resolved", "Closed"].includes(r.status));
        return [...arr].sort((a, b) => b.priority_score - a.priority_score);
    }, [reports, filter, now]);

    return (
        <Layout>
            <div className="mb-8">
                <div className="label-mono mb-2">Officer dashboard</div>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold">{user?.name} — your queue</h1>
                <p className="text-muted-foreground mt-1">Sorted by priority. Tap any report to update status.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <KPI label="Assigned" value={stats.assigned} icon={ListBullets} active={filter === "all"} onClick={() => setFilter("all")} testId="kpi-assigned" />
                <KPI label="Active" value={stats.active} icon={Clock} active={filter === "active"} onClick={() => setFilter("active")} testId="kpi-active" />
                <KPI label="Critical" value={stats.critical} icon={Warning} tone="danger" active={filter === "critical"} onClick={() => setFilter("critical")} testId="kpi-critical" />
                <KPI label="SLA breach" value={stats.sla} icon={Warning} tone="warning" active={filter === "sla"} onClick={() => setFilter("sla")} testId="kpi-sla" />
                <KPI label="Resolved" value={stats.resolved} icon={CheckCircle} tone="success" active={filter === "resolved"} onClick={() => setFilter("resolved")} testId="kpi-resolved" />
            </div>

            <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-2.5 label-mono">ID</th>
                                <th className="px-4 py-2.5 label-mono">Title</th>
                                <th className="px-4 py-2.5 label-mono">Citizen</th>
                                <th className="px-4 py-2.5 label-mono">Urgency</th>
                                <th className="px-4 py-2.5 label-mono">Status</th>
                                <th className="px-4 py-2.5 label-mono">Priority</th>
                                <th className="px-4 py-2.5 label-mono">SLA</th>
                                <th className="px-4 py-2.5 label-mono">Created</th>
                            </tr>
                        </thead>
                        <tbody data-testid="officer-reports-table">
                            {loading ? (
                                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Loading...</td></tr>
                            ) : list.length === 0 ? (
                                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No reports in this view</td></tr>
                            ) : list.map((r) => {
                                const overdue = !["Resolved", "Closed"].includes(r.status) && new Date(r.sla_deadline) < now;
                                return (
                                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition" data-testid={`officer-row-${r.id}`}>
                                        <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <Link to={`/reports/${r.id}`} className="font-semibold hover:text-primary">{r.title}</Link>
                                            <div className="text-xs text-muted-foreground">{r.category} · {r.address}</div>
                                        </td>
                                        <td className="px-4 py-3">{r.citizen_name}</td>
                                        <td className="px-4 py-3"><UrgencyBadge urgency={r.urgency} /></td>
                                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                        <td className="px-4 py-3"><PriorityMeter score={r.priority_score} /></td>
                                        <td className={`px-4 py-3 text-xs ${overdue ? "text-brand-danger font-semibold" : "text-muted-foreground"}`}>
                                            {overdue ? "Overdue " : ""}{formatDistanceToNow(parseISO(r.sla_deadline), { addSuffix: true })}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDistanceToNow(parseISO(r.created_at), { addSuffix: true })}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}

function KPI({ label, value, icon: Icon, tone, active, onClick, testId }) {
    const tones = {
        danger: "text-brand-danger",
        warning: "text-brand-warning",
        success: "text-brand-success",
    };
    return (
        <button onClick={onClick} data-testid={testId}
            className={`text-left bg-white border rounded-lg p-4 hover:-translate-y-0.5 transition ${active ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="label-mono">{label}</span>
                <Icon size={16} weight="bold" className={tones[tone] || "text-muted-foreground"} />
            </div>
            <div className={`font-heading font-semibold text-2xl ${tones[tone] || ""}`}>{value}</div>
        </button>
    );
}
