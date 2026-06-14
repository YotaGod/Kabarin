import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { UrgencyBadge, StatusBadge, PriorityMeter } from "../components/Badges";
import MapView from "../components/MapView";
import api, { API_BASE } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { ArrowUp, Clock, MapPin, Buildings, User, Sparkle, ArrowsClockwise, ChatCircleText, CheckCircle, ArrowLeft } from "@phosphor-icons/react";
import { formatDistanceToNow, parseISO, format } from "date-fns";

const STATUSES = ["Submitted", "AI Classified", "Assigned", "In Progress", "Under Review", "Resolved", "Closed"];

export default function ReportDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user } = useAuth();
    const [report, setReport] = useState(null);
    const [history, setHistory] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("sc_token");

    const load = async () => {
        setLoading(true);
        try {
            const [r, h, c] = await Promise.all([
                api.get(`/reports/${id}`),
                api.get(`/reports/${id}/history`),
                api.get(`/reports/${id}/comments`),
            ]);
            setReport(r.data);
            setHistory(h.data);
            setComments(c.data);
        } catch {
            toast.error("Could not load report");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [id]);

    useEffect(() => {
        const onUpdate = (e) => { if (e.detail?.id === id) setReport(e.detail); };
        window.addEventListener("sc:report_updated", onUpdate);
        return () => window.removeEventListener("sc:report_updated", onUpdate);
    }, [id]);

    const upvote = async () => {
        try { await api.post(`/reports/${id}/upvote`); load(); }
        catch { toast.error("Could not vote"); }
    };

    const updateStatus = async (status) => {
        try {
            await api.put(`/reports/${id}/status`, { status, note: `Status changed to ${status}` });
            toast.success(`Marked as ${status}`);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Status update failed");
        }
    };

    const postComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.post(`/reports/${id}/comments`, { body: newComment });
            setNewComment("");
            const { data } = await api.get(`/reports/${id}/comments`);
            setComments(data);
        } catch { toast.error("Could not comment"); }
    };

    if (loading) return <Layout><div className="shimmer h-96 rounded-lg" /></Layout>;
    if (!report) return <Layout><div className="text-center py-12 text-muted-foreground">Report not found</div></Layout>;

    const canManage = user?.role === "officer" || user?.role === "admin";
    const upvoted = (report.upvoters || []).includes(user?.id);

    return (
        <Layout>
            <button onClick={() => nav(-1)} data-testid="back-btn" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft size={14} weight="bold" /> Back
            </button>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-border rounded-lg p-6" data-testid="report-detail-main">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <UrgencyBadge urgency={report.urgency} />
                                    <StatusBadge status={report.status} />
                                    <span className="label-mono">{report.category}</span>
                                </div>
                                <h1 className="font-heading text-2xl sm:text-3xl font-semibold">{report.title}</h1>
                            </div>
                            <button onClick={upvote} data-testid="detail-upvote-btn"
                                className={`flex flex-col items-center px-3 py-2 rounded-md transition ${upvoted ? "bg-primary text-white" : "bg-muted hover:bg-muted/70"}`}>
                                <ArrowUp size={16} weight="bold" />
                                <span className="font-mono text-sm font-semibold">{report.upvote_count}</span>
                            </button>
                        </div>

                        <p className="text-foreground/90 leading-relaxed mb-4">{report.description}</p>

                        {report.summary && (
                            <div className="bg-blue-50/60 border border-blue-100 rounded-md p-3 mb-4">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Sparkle size={12} weight="fill" className="text-primary" />
                                    <span className="label-mono text-[10px]">AI summary · {report.confidence}% confidence</span>
                                </div>
                                <p className="text-sm">{report.summary}</p>
                            </div>
                        )}

                        {report.media_urls && report.media_urls.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {report.media_urls.map((p, i) => (
                                    <a key={i} href={`${API_BASE}/files/${p}?auth=${token}`} target="_blank" rel="noreferrer">
                                        <img src={`${API_BASE}/files/${p}?auth=${token}`} alt="evidence" className="rounded-md w-full aspect-video object-cover" data-testid={`media-${i}`} />
                                    </a>
                                ))}
                            </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-3 text-sm pt-4 border-t border-border">
                            <Info icon={MapPin} label="Location" value={report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`} />
                            <Info icon={Buildings} label="Department" value={report.department_name || "Unassigned"} />
                            <Info icon={User} label="Citizen" value={report.citizen_name} />
                            <Info icon={User} label="Officer" value={report.assigned_officer_name || "Pending assignment"} />
                            <Info icon={Clock} label="Created" value={format(parseISO(report.created_at), "PPp")} />
                            <Info icon={Clock} label="SLA deadline" value={format(parseISO(report.sla_deadline), "PPp")} />
                        </div>

                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <span className="label-mono">Priority score</span>
                            <PriorityMeter score={report.priority_score} />
                        </div>
                    </div>

                    {canManage && (
                        <div className="bg-white border border-border rounded-lg p-6" data-testid="manage-panel">
                            <h3 className="font-heading font-semibold mb-3">Update status</h3>
                            <div className="flex flex-wrap gap-2">
                                {STATUSES.map((s) => (
                                    <button key={s} data-testid={`set-status-${s.toLowerCase().replace(/\s+/g,'-')}`} onClick={() => updateStatus(s)}
                                        disabled={s === report.status}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                                            s === report.status ? "bg-primary text-white border-primary cursor-default" : "bg-white border-border hover:bg-muted"
                                        }`}>{s}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    <div className="bg-white border border-border rounded-lg p-6">
                        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                            <ChatCircleText size={18} weight="bold" /> Comments ({comments.length})
                        </h3>
                        <div className="space-y-3 mb-4">
                            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet</p>}
                            {comments.map((c) => (
                                <div key={c.id} className="border-l-2 border-border pl-3" data-testid={`comment-${c.id}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm">{c.user_name}</span>
                                        <span className="label-mono text-[9px]">{c.user_role}</span>
                                        <span className="text-xs text-muted-foreground">· {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}</span>
                                    </div>
                                    <p className="text-sm">{c.body}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={postComment} className="flex gap-2" data-testid="comment-form">
                            <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                data-testid="comment-input"
                                className="flex-1 px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                            <button type="submit" data-testid="comment-submit" className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90">Post</button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <MapView reports={[report]} height={320} />
                    <div className="bg-white border border-border rounded-lg p-5">
                        <h3 className="font-heading font-semibold mb-4">Timeline</h3>
                        <div className="space-y-3">
                            {history.map((h, i) => (
                                <div key={h.id} className="flex gap-3" data-testid={`history-${i}`}>
                                    <div className="relative flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                                        {i < history.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                                    </div>
                                    <div className="flex-1 pb-3">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={h.to_status} />
                                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(h.created_at), { addSuffix: true })}</span>
                                        </div>
                                        {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                                        <p className="text-[10px] label-mono mt-0.5">by {h.changed_by_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function Info({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2">
            <Icon size={14} weight="bold" className="text-muted-foreground mt-0.5" />
            <div>
                <div className="label-mono">{label}</div>
                <div className="font-medium">{value}</div>
            </div>
        </div>
    );
}
