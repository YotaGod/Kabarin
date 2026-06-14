import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import ReportCard from "../components/ReportCard";
import { useAuth } from "../lib/auth";
import api from "../lib/api";
import { Plus, ListBullets, MapPin, ArrowUp } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function CitizenDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState("mine");
    const [mine, setMine] = useState([]);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [m, f] = await Promise.all([
                api.get("/reports?mine=true&limit=100"),
                api.get("/reports?limit=50"),
            ]);
            setMine(m.data);
            setFeed(f.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const upvote = async (r) => {
        try {
            await api.post(`/reports/${r.id}/upvote`);
            toast.success("Voted");
            load();
        } catch (e) { toast.error("Could not vote"); }
    };

    const list = tab === "mine" ? mine : feed;

    return (
        <Layout>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <div className="label-mono mb-2">Citizen portal</div>
                    <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Hello, {user?.name?.split(" ")[0]}.</h1>
                    <p className="text-muted-foreground mt-1">Track your reports, see what's happening near you.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/citizen/map" data-testid="dashboard-map-btn" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border bg-white hover:bg-muted text-sm font-semibold">
                        <MapPin size={16} weight="bold" /> City map
                    </Link>
                    <Link to="/citizen/submit" data-testid="dashboard-new-report-btn" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-white hover:bg-primary/90 text-sm font-semibold">
                        <Plus size={16} weight="bold" /> New report
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <StatCard label="My reports" value={mine.length} testId="stat-my-reports" />
                <StatCard label="Active" value={mine.filter(r => !["Resolved", "Closed"].includes(r.status)).length} testId="stat-my-active" tone="warning" />
                <StatCard label="Resolved" value={mine.filter(r => ["Resolved", "Closed"].includes(r.status)).length} testId="stat-my-resolved" tone="success" />
            </div>

            <div className="flex items-center gap-1 mb-4 border-b border-border">
                <button data-testid="tab-mine" onClick={() => setTab("mine")}
                    className={`px-4 py-2.5 text-sm font-semibold relative ${tab === "mine" ? "text-primary" : "text-muted-foreground"}`}>
                    My reports ({mine.length})
                    {tab === "mine" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button data-testid="tab-feed" onClick={() => setTab("feed")}
                    className={`px-4 py-2.5 text-sm font-semibold relative ${tab === "feed" ? "text-primary" : "text-muted-foreground"}`}>
                    Nearby & community
                    {tab === "feed" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
            </div>

            {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="shimmer rounded-lg h-44" />)}
                </div>
            ) : list.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                    <ListBullets size={32} weight="duotone" className="text-muted-foreground mx-auto mb-3" />
                    <p className="font-heading font-semibold mb-1">No reports yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Be the first to report an issue in your area.</p>
                    <Link to="/citizen/submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold">
                        <Plus size={14} weight="bold" /> Submit a report
                    </Link>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="reports-grid">
                    {list.map((r) => (
                        <ReportCard key={r.id} report={r} linkBase="/reports" onUpvote={tab === "feed" ? upvote : null} currentUserId={user?.id} />
                    ))}
                </div>
            )}
        </Layout>
    );
}

function StatCard({ label, value, testId, tone }) {
    const c = tone === "warning" ? "text-brand-warning" : tone === "success" ? "text-brand-success" : "text-foreground";
    return (
        <div data-testid={testId} className="bg-white border border-border rounded-lg p-4">
            <div className="label-mono mb-1">{label}</div>
            <div className={`font-heading font-semibold text-3xl ${c}`}>{value}</div>
        </div>
    );
}
