import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { PickerMap } from "../components/MapView";
import { UrgencyBadge, StatusBadge } from "../components/Badges";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";
import { MapPin, Camera, Lightning, ArrowsClockwise, Crosshair, Sparkle } from "@phosphor-icons/react";

export default function SubmitReport() {
    const nav = useNavigate();
    const [form, setForm] = useState({
        title: "", description: "", address: "",
        latitude: null, longitude: null,
    });
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileBase64, setFileBase64] = useState(null);
    const [aiPreview, setAiPreview] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [busy, setBusy] = useState(false);
    const [classifying, setClassifying] = useState(false);

    const useMyLocation = () => {
        if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
            () => toast.error("Could not get location"),
        );
    };

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);
        setFilePreview(URL.createObjectURL(f));
        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target.result;
                const b64 = result.split(",")[1];
                setFileBase64(b64);
            };
            reader.readAsDataURL(f);
        } else {
            setFileBase64(null);
        }
    };

    const runAIPreview = async () => {
        if (!form.title || !form.description) { toast.error("Add title & description first"); return; }
        setClassifying(true);
        try {
            const { data } = await api.post("/ai/classify-preview", {
                title: form.title, description: form.description,
                latitude: form.latitude || 0, longitude: form.longitude || 0,
                image_base64: fileBase64,
            });
            setAiPreview(data);
            toast.success("AI analyzed your report");
        } catch (e) {
            toast.error("AI preview failed");
        } finally { setClassifying(false); }
    };

    const checkDup = async () => {
        if (!form.title || form.latitude == null) return;
        try {
            const { data } = await api.post("/reports/check-duplicate", {
                title: form.title, description: form.description,
                latitude: form.latitude, longitude: form.longitude,
            });
            setDuplicates(data.duplicates || []);
        } catch {}
    };

    const submit = async (e) => {
        e.preventDefault();
        if (form.latitude == null || form.longitude == null) {
            toast.error("Pick a location on the map or use My Location");
            return;
        }
        setBusy(true);
        try {
            // Upload file first
            let media_urls = [];
            if (file) {
                const fd = new FormData();
                fd.append("file", file);
                const { data: up } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
                media_urls = [up.path];
            }
            const { data } = await api.post("/reports", {
                title: form.title,
                description: form.description,
                address: form.address,
                latitude: form.latitude,
                longitude: form.longitude,
                media_urls,
                image_base64: fileBase64,
            });
            toast.success("Report submitted!");
            nav(`/reports/${data.id}`);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Submission failed");
        } finally { setBusy(false); }
    };

    return (
        <Layout>
            <div className="mb-8">
                <div className="label-mono mb-2">New report</div>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Tell the city what's wrong.</h1>
                <p className="text-muted-foreground mt-1">AI classifies and routes your report automatically. Adding a photo helps.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <form onSubmit={submit} className="lg:col-span-2 space-y-5" data-testid="submit-report-form">
                    <div className="bg-white border border-border rounded-lg p-6 space-y-4">
                        <div>
                            <label className="label-mono block mb-1.5">Title</label>
                            <input data-testid="report-title-input" required value={form.title} onBlur={checkDup}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Massive pothole on MG Road"
                                className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                        </div>
                        <div>
                            <label className="label-mono block mb-1.5">Description</label>
                            <textarea data-testid="report-description-input" required value={form.description}
                                onBlur={checkDup}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={4}
                                placeholder="Describe the issue, what's affected, how long it's been there..."
                                className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                        </div>
                        <div>
                            <label className="label-mono block mb-1.5">Photo or video</label>
                            <label data-testid="report-file-label" className="block border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/40 transition text-center">
                                <input type="file" accept="image/*,video/*" capture="environment" className="hidden"
                                    data-testid="report-file-input"
                                    onChange={(e) => handleFile(e.target.files?.[0])} />
                                {filePreview ? (
                                    file?.type.startsWith("video/") ? (
                                        <video src={filePreview} controls className="max-h-48 mx-auto rounded" />
                                    ) : (
                                        <img src={filePreview} alt="preview" className="max-h-48 mx-auto rounded" />
                                    )
                                ) : (
                                    <div className="text-muted-foreground">
                                        <Camera size={28} className="mx-auto mb-2" weight="duotone" />
                                        <div className="text-sm font-semibold">Tap to capture or choose file</div>
                                        <div className="text-xs mt-1">JPG, PNG, WebP, MP4 · max 25MB</div>
                                    </div>
                                )}
                            </label>
                        </div>
                        <div>
                            <label className="label-mono block mb-1.5">Address (optional)</label>
                            <input data-testid="report-address-input" value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="MG Road, Sector 18"
                                className="w-full px-3 py-2.5 rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="label-mono">Location *</label>
                                <button type="button" data-testid="use-my-location-btn" onClick={useMyLocation}
                                    className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/70 font-semibold">
                                    <Crosshair size={12} weight="bold" /> My location
                                </button>
                            </div>
                            <PickerMap lat={form.latitude} lng={form.longitude}
                                onPick={(p) => setForm({ ...form, latitude: p.lat, longitude: p.lng })} />
                            {form.latitude != null && (
                                <div className="font-mono text-xs text-muted-foreground mt-2" data-testid="picked-coords">
                                    {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                                </div>
                            )}
                        </div>
                    </div>

                    {duplicates.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="duplicates-warning">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightning size={18} weight="fill" className="text-brand-warning" />
                                <h3 className="font-heading font-semibold">This issue may already exist</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{duplicates.length} similar report{duplicates.length > 1 ? "s" : ""} found nearby. Consider upvoting instead of duplicating.</p>
                            <div className="space-y-2">
                                {duplicates.slice(0, 3).map((d) => (
                                    <Link key={d.id} to={`/reports/${d.id}`} className="block bg-white border border-border rounded-md p-3 hover:bg-muted/40" data-testid={`dup-${d.id}`}>
                                        <div className="font-semibold text-sm">{d.title}</div>
                                        <div className="text-xs text-muted-foreground">{d.distance_m}m away · {Math.round((d.similarity || 0) * 100)}% similar</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button type="submit" data-testid="submit-report-btn" disabled={busy}
                            className="px-6 py-2.5 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-60">
                            {busy ? "Submitting..." : "Submit report"}
                        </button>
                        <button type="button" data-testid="ai-preview-btn" onClick={runAIPreview} disabled={classifying}
                            className="px-4 py-2.5 rounded-md border border-border bg-white font-semibold hover:bg-muted text-sm inline-flex items-center gap-2">
                            {classifying ? <ArrowsClockwise size={14} className="animate-spin" /> : <Sparkle size={14} weight="fill" />}
                            Preview AI analysis
                        </button>
                    </div>
                </form>

                <aside className="lg:col-span-1">
                    <div className="bg-white border border-border rounded-lg p-5 sticky top-24" data-testid="ai-panel">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkle size={18} weight="fill" className="text-primary" />
                            <h3 className="font-heading font-semibold">AI Analysis</h3>
                        </div>
                        {!aiPreview ? (
                            <p className="text-sm text-muted-foreground">Click <span className="font-semibold">Preview AI analysis</span> to see how the system will classify, prioritize, and route your report — before you submit.</p>
                        ) : (
                            <div className="space-y-3">
                                <Row label="Category" value={aiPreview.category} testId="ai-category" />
                                <Row label="Urgency" badge={<UrgencyBadge urgency={aiPreview.urgency} />} testId="ai-urgency" />
                                <Row label="Sentiment" value={aiPreview.sentiment} testId="ai-sentiment" />
                                <Row label="Confidence" value={`${aiPreview.confidence}%`} testId="ai-confidence" />
                                <div>
                                    <div className="label-mono mb-1.5">Auto-summary</div>
                                    <div className="text-sm leading-relaxed">{aiPreview.summary}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </Layout>
    );
}

function Row({ label, value, badge, testId }) {
    return (
        <div className="flex items-center justify-between" data-testid={testId}>
            <span className="label-mono">{label}</span>
            {badge ? badge : <span className="font-semibold text-sm">{value}</span>}
        </div>
    );
}
