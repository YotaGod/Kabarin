import React from "react";
import { Link } from "react-router-dom";
import { UrgencyBadge, StatusBadge, PriorityMeter } from "./Badges";
import { MapPin, ChatCircleText, ArrowUp, Clock } from "@phosphor-icons/react";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function ReportCard({ report, linkBase = "/reports", onUpvote, currentUserId }) {
    const created = report.created_at ? formatDistanceToNow(parseISO(report.created_at), { addSuffix: true }) : "";
    const upvoted = (report.upvoters || []).includes(currentUserId);
    return (
        <Link
            to={`${linkBase}/${report.id}`}
            data-testid={`report-card-${report.id}`}
            className="block bg-white border border-border rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-heading font-semibold text-base line-clamp-2 flex-1">{report.title}</h3>
                <UrgencyBadge urgency={report.urgency} />
            </div>
            <div className="text-sm text-muted-foreground mb-3 line-clamp-2">{report.summary || report.description}</div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <StatusBadge status={report.status} />
                <span className="label-mono text-[9px]">{report.category}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><MapPin size={12} weight="bold" />{report.address || "—"}</span>
                    <span className="flex items-center gap-1"><Clock size={12} weight="bold" />{created}</span>
                </div>
                <div className="flex items-center gap-3">
                    {onUpvote && (
                        <button
                            data-testid={`upvote-btn-${report.id}`}
                            onClick={(e) => { e.preventDefault(); onUpvote(report); }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${upvoted ? "bg-primary text-white" : "bg-muted hover:bg-muted/70"}`}
                        >
                            <ArrowUp size={12} weight="bold" />
                            <span className="font-mono">{report.upvote_count}</span>
                        </button>
                    )}
                    <span className="flex items-center gap-1"><ChatCircleText size={12} weight="bold" />{report.comment_count}</span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="label-mono text-[9px]">Priority</span>
                <PriorityMeter score={report.priority_score} />
            </div>
        </Link>
    );
}
