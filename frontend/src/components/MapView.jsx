import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { UrgencyBadge, StatusBadge } from "./Badges";

// Fix leaflet default icon paths (CRA bundling issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const URGENCY_COLOR = {
    Critical: "#EF4444",
    High: "#F97316",
    Medium: "#F59E0B",
    Low: "#10B981",
};

function FitBounds({ reports }) {
    const map = useMap();
    useEffect(() => {
        if (!reports || reports.length === 0) return;
        const points = reports.map((r) => [r.latitude, r.longitude]);
        try {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        } catch {}
    }, [reports, map]);
    return null;
}

export default function MapView({ reports = [], center = [28.6139, 77.2090], height = 520, onPick, pickMode = false }) {
    return (
        <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                whenReady={(e) => {
                    if (pickMode && onPick) {
                        e.target.on("click", (ev) => {
                            onPick({ lat: ev.latlng.lat, lng: ev.latlng.lng });
                        });
                    }
                }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {reports.length > 0 && <FitBounds reports={reports} />}
                {reports.map((r) => (
                    <CircleMarker
                        key={r.id}
                        center={[r.latitude, r.longitude]}
                        radius={r.urgency === "Critical" ? 11 : 8}
                        pathOptions={{
                            color: URGENCY_COLOR[r.urgency] || "#64748B",
                            fillColor: URGENCY_COLOR[r.urgency] || "#64748B",
                            fillOpacity: r.status === "Resolved" || r.status === "Closed" ? 0.35 : 0.75,
                            weight: 2,
                        }}
                    >
                        <Popup>
                            <div className="min-w-[200px]" data-testid={`map-popup-${r.id}`}>
                                <div className="font-heading font-semibold text-sm mb-1">{r.title}</div>
                                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                    <UrgencyBadge urgency={r.urgency} />
                                    <StatusBadge status={r.status} />
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">{r.category} · {r.department_name}</div>
                                <Link
                                    to={`/reports/${r.id}`}
                                    className="text-xs text-primary font-semibold hover:underline"
                                    data-testid={`map-view-report-${r.id}`}
                                >
                                    View details →
                                </Link>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}

export function PickerMap({ lat, lng, onPick }) {
    const center = [lat || 28.6139, lng || 77.2090];
    return (
        <div className="rounded-lg overflow-hidden border border-border" style={{ height: 320 }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <PickerInner lat={lat} lng={lng} onPick={onPick} />
            </MapContainer>
        </div>
    );
}

function PickerInner({ lat, lng, onPick }) {
    const map = useMap();
    useEffect(() => {
        const handler = (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        map.on("click", handler);
        return () => map.off("click", handler);
    }, [map, onPick]);
    if (lat == null || lng == null) return null;
    return <Marker position={[lat, lng]} />;
}
