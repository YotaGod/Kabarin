import React, { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import MapView from "../components/MapView";
import api from "../lib/api";
import { UrgencyBadge } from "../components/Badges";

const CATEGORIES = ["All", "Road Damage", "Flood", "Garbage", "Traffic", "Public Lighting", "Water Leak", "Crime", "Vandalism", "Public Facility Damage", "Environmental Issue", "Other"];
const URGENCIES = ["All", "Critical", "High", "Medium", "Low"];
const STATUSES = ["All", "AI Classified", "Assigned", "In Progress", "Under Review", "Resolved", "Closed"];

export default function CityMap() {
    const [reports, setReports] = useState([]);
    const [cat, setCat] = useState("All");
    const [urg, setUrg] = useState("All");
    const [status, setStatus] = useState("All");

    useEffect(() => {
        api.get("/reports?limit=500").then((r) => setReports(r.data)).catch(() => {});
        const onCreated = (e) => setReports((prev) => [e.detail, ...prev]);
        const onUpdated = (e) => setReports((prev) => prev.map((r) => r.id === e.detail.id ? e.detail : r));
        window.addEventListener("sc:report_created", onCreated);
        window.addEventListener("sc:report_updated", onUpdated);
        return () => {
            window.removeEventListener("sc:report_created", onCreated);
            window.removeEventListener("sc:report_updated", onUpdated);
        };
    }, []);

    const filtered = useMemo(() => reports.filter((r) =>
        (cat === "All" || r.category === cat) &&
        (urg === "All" || r.urgency === urg) &&
        (status === "All" || r.status === status)
    ), [reports, cat, urg, status]);

    const stats = useMemo(() => ({
        critical: filtered.filter(r => r.urgency === "Critical").length,
        high: filtered.filter(r => r.urgency === "High").length,
        medium: filtered.filter(r => r.urgency === "Medium").length,
        low: filtered.filter(r => r.urgency === "Low").length,
    }), [filtered]);

    return (
        <Layout>
            <div className="mb-6">
                <div className="label-mono mb-2">City map</div>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Live citywide view</h1>
                <p className="text-muted-foreground mt-1">{filtered.length} reports on the map</p>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <MapView reports={filtered} height={600} />
                </div>
                <div className="space-y-4">
                    <div className="bg-white border border-border rounded-lg p-4">
                        <h3 className="label-mono mb-3">Filters</h3>
                        <Select label="Category" value={cat} onChange={setCat} options={CATEGORIES} testId="filter-category" />
                        <Select label="Urgency" value={urg} onChange={setUrg} options={URGENCIES} testId="filter-urgency" />
                        <Select label="Status" value={status} onChange={setStatus} options={STATUSES} testId="filter-status" />
                    </div>
                    <div className="bg-white border border-border rounded-lg p-4">
                        <h3 className="label-mono mb-3">By urgency</h3>
                        <div className="space-y-2">
                            <Bar label="Critical" count={stats.critical} total={filtered.length} color="#EF4444" />
                            <Bar label="High" count={stats.high} total={filtered.length} color="#F97316" />
                            <Bar label="Medium" count={stats.medium} total={filtered.length} color="#F59E0B" />
                            <Bar label="Low" count={stats.low} total={filtered.length} color="#10B981" />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function Select({ label, value, onChange, options, testId }) {
    return (
        <div className="mb-3">
            <label className="text-xs font-semibold mb-1 block">{label}</label>
            <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md border border-border bg-white text-sm">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function Bar({ label, count, total, color }) {
    const pct = total ? (count / total) * 100 : 0;
    return (
        <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
                <span>{label}</span>
                <span className="font-mono font-semibold">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div style={{ width: `${pct}%`, background: color }} className="h-full" />
            </div>
        </div>
    );
}
