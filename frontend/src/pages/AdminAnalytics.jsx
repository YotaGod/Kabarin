import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line, Legend,
} from "recharts";
import { ChartLineUp, Warning, Clock, CheckCircle, ChartBar, TrendUp } from "@phosphor-icons/react";

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#6366F1", "#14B8A6"];

export default function AdminAnalytics() {
    const [kpis, setKpis] = useState(null);
    const [byCategory, setByCategory] = useState([]);
    const [byStatus, setByStatus] = useState([]);
    const [byDept, setByDept] = useState([]);
    const [trends, setTrends] = useState([]);
    const [officerPerf, setOfficerPerf] = useState([]);

    useEffect(() => {
        Promise.all([
            api.get("/analytics/kpis"),
            api.get("/analytics/by-category"),
            api.get("/analytics/by-status"),
            api.get("/analytics/by-department"),
            api.get("/analytics/trends?days=30"),
            api.get("/analytics/officer-performance"),
        ]).then(([k, c, s, d, t, o]) => {
            setKpis(k.data); setByCategory(c.data); setByStatus(s.data); setByDept(d.data); setTrends(t.data); setOfficerPerf(o.data);
        }).catch(() => {});
    }, []);

    return (
        <Layout>
            <div className="mb-8">
                <div className="label-mono mb-2">Admin · Control room</div>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Citywide analytics</h1>
                <p className="text-muted-foreground mt-1">Real-time operations overview.</p>
            </div>

            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                    <KPI label="Total" value={kpis.total_reports} icon={ChartBar} testId="kpi-total" />
                    <KPI label="Active" value={kpis.active_reports} icon={Clock} testId="kpi-active" tone="warning" />
                    <KPI label="Resolved" value={kpis.resolved_reports} icon={CheckCircle} testId="kpi-resolved" tone="success" />
                    <KPI label="Resolution rate" value={`${kpis.resolution_rate}%`} icon={TrendUp} testId="kpi-rate" />
                    <KPI label="Avg response" value={`${kpis.avg_response_time_hours}h`} icon={ChartLineUp} testId="kpi-response" />
                    <KPI label="Critical open" value={kpis.critical_open} icon={Warning} testId="kpi-critical" tone="danger" />
                    <KPI label="SLA breaches" value={kpis.sla_breaches} icon={Warning} testId="kpi-sla" tone="danger" />
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
                <Panel title="Reports by category">
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={(d) => d.category.length > 12 ? d.category.slice(0, 12) + "…" : d.category}>
                                {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Panel>

                <Panel title="Reports by status">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={byStatus} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={110} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Panel>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
                <Panel title="Reports by department">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={byDept} margin={{ left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} height={70} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Panel>

                <Panel title="30-day trend">
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="created" stroke="#2563EB" strokeWidth={2} />
                            <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </Panel>
            </div>

            <Panel title="Officer performance">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-2.5 label-mono">Officer</th>
                                <th className="px-4 py-2.5 label-mono">Assigned</th>
                                <th className="px-4 py-2.5 label-mono">Resolved</th>
                                <th className="px-4 py-2.5 label-mono">Rate</th>
                            </tr>
                        </thead>
                        <tbody data-testid="officer-perf-table">
                            {officerPerf.map((o) => (
                                <tr key={o.officer_id} className="border-t border-border hover:bg-muted/30">
                                    <td className="px-4 py-2.5 font-semibold">{o.officer_name}</td>
                                    <td className="px-4 py-2.5 font-mono">{o.assigned}</td>
                                    <td className="px-4 py-2.5 font-mono">{o.resolved}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div style={{ width: `${o.resolution_rate}%`, background: "#10B981" }} className="h-full" />
                                            </div>
                                            <span className="font-mono text-xs">{o.resolution_rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </Layout>
    );
}

function Panel({ title, children }) {
    return (
        <div className="bg-white border border-border rounded-lg p-5">
            <h3 className="font-heading font-semibold mb-4">{title}</h3>
            {children}
        </div>
    );
}

function KPI({ label, value, icon: Icon, tone, testId }) {
    const tones = { danger: "text-brand-danger", warning: "text-brand-warning", success: "text-brand-success" };
    return (
        <div className="bg-white border border-border rounded-lg p-4" data-testid={testId}>
            <div className="flex items-center justify-between mb-1.5">
                <span className="label-mono">{label}</span>
                <Icon size={14} weight="bold" className={tones[tone] || "text-muted-foreground"} />
            </div>
            <div className={`font-heading font-semibold text-2xl ${tones[tone] || ""}`}>{value}</div>
        </div>
    );
}
