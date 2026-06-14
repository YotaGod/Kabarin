import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { ShieldStar, ChartLineUp, MapPinLine, FlowArrow, Lightning, Camera } from "@phosphor-icons/react";

export default function Landing() {
    return (
        <Layout fullBleed>
            <div className="bg-grain relative">
                <section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-16 pb-24 md:pt-24 md:pb-32">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 animate-fade-up">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-border mb-6">
                                <Lightning size={14} weight="fill" className="text-brand-warning" />
                                <span className="label-mono text-[10px]">AI-powered civic dispatcher</span>
                            </div>
                            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[0.95] mb-6">
                                Report a problem.<br />
                                <span className="text-primary">Watch the city respond.</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                                Citizens submit issues — potholes, floods, broken lights, garbage. Our AI classifies, prioritizes,
                                and routes each report to the right city department in seconds.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    to="/register"
                                    data-testid="landing-get-started-btn"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 active:scale-95 transition"
                                >
                                    Get started
                                    <span className="font-mono">→</span>
                                </Link>
                                <Link
                                    to="/login"
                                    data-testid="landing-signin-btn"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border bg-white font-semibold hover:bg-muted transition"
                                >
                                    Sign in
                                </Link>
                            </div>
                            <div className="mt-10 grid grid-cols-3 max-w-md gap-6">
                                <div>
                                    <div className="font-heading text-3xl font-semibold">7</div>
                                    <div className="label-mono">stages</div>
                                </div>
                                <div>
                                    <div className="font-heading text-3xl font-semibold text-brand-success">10</div>
                                    <div className="label-mono">departments</div>
                                </div>
                                <div>
                                    <div className="font-heading text-3xl font-semibold text-brand-warning">{"<2h"}</div>
                                    <div className="label-mono">SLA flood</div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop"
                                    alt="City"
                                    className="rounded-lg w-full aspect-[4/5] object-cover"
                                />
                                <div className="absolute -bottom-6 -left-6 bg-white border border-border rounded-lg shadow-lg p-4 w-64 animate-fade-up">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-danger animate-pulse-soft" />
                                        <span className="label-mono text-[9px]">Live · just now</span>
                                    </div>
                                    <div className="font-heading font-semibold text-sm">Pothole on MG Road</div>
                                    <div className="text-xs text-muted-foreground mt-1">→ Public Works Dept · Auto-assigned</div>
                                </div>
                                <div className="absolute -top-4 -right-4 bg-primary text-white rounded-lg shadow-lg px-4 py-3 animate-fade-up">
                                    <div className="label-mono text-[9px] text-white/70">AI confidence</div>
                                    <div className="font-mono font-semibold text-2xl">92%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="max-w-[1400px] mx-auto px-4 md:px-8 pb-24">
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Camera, title: "Snap & submit", desc: "Photo, location, description. AI handles category & urgency." },
                            { icon: FlowArrow, title: "Smart routing", desc: "Issue goes to the right department with priority score & SLA." },
                            { icon: ChartLineUp, title: "Live tracking", desc: "Citizens, officers, and admins see real-time progress." },
                        ].map((f, i) => (
                            <div key={i} className="bg-white border border-border rounded-lg p-6 hover:-translate-y-1 hover:shadow-md transition-all">
                                <f.icon size={28} weight="duotone" className="text-primary mb-3" />
                                <h3 className="font-heading font-semibold text-lg mb-1">{f.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Layout>
    );
}
