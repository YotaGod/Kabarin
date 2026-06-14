import React from "react";

const URGENCY_CLASSES = {
    Critical: "pill-critical",
    High: "pill-high",
    Medium: "pill-medium",
    Low: "pill-low",
};

const STATUS_CLASSES = {
    "Submitted": "pill-submitted",
    "AI Classified": "pill-classified",
    "Assigned": "pill-assigned",
    "In Progress": "pill-inprogress",
    "Under Review": "pill-review",
    "Resolved": "pill-resolved",
    "Closed": "pill-closed",
};

export function UrgencyBadge({ urgency }) {
    return (
        <span
            data-testid={`urgency-badge-${urgency?.toLowerCase()}`}
            className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${URGENCY_CLASSES[urgency] || "pill-medium"}`}
        >
            {urgency}
        </span>
    );
}

export function StatusBadge({ status }) {
    return (
        <span
            data-testid={`status-badge-${status?.toLowerCase().replace(/\s+/g, "-")}`}
            className={`inline-flex items-center text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-md ${STATUS_CLASSES[status] || "pill-submitted"}`}
        >
            {status}
        </span>
    );
}

export function PriorityMeter({ score }) {
    const color = score >= 75 ? "#EF4444" : score >= 50 ? "#F59E0B" : score >= 25 ? "#FBBF24" : "#10B981";
    return (
        <div className="flex items-center gap-2" data-testid={`priority-meter-${score}`}>
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div style={{ width: `${score}%`, background: color }} className="h-full transition-all" />
            </div>
            <span className="font-mono text-xs text-muted-foreground">{score}</span>
        </div>
    );
}
