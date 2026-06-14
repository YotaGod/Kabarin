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
                                <span className="label-mono text-[10px]">Dispatcher publik bertenaga AI</span>
                            </div>
                            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[0.95] mb-6">
                                Laporkan masalah.<br />
                                <span className="text-primary">Lihat kota merespons.</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                                Warga melaporkan masalah — lubang jalan, banjir, lampu rusak, sampah. AI kami mengklasifikasi, memprioritaskan,
                                dan merutekan setiap laporan ke dinas kota yang tepat dalam hitungan detik.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    to="/register"
                                    data-testid="landing-get-started-btn"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 active:scale-95 transition"
                                >
                                    Mulai Sekarang
                                    <span className="font-mono">→</span>
                                </Link>
                                <Link
                                    to="/login"
                                    data-testid="landing-signin-btn"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border bg-white font-semibold hover:bg-muted transition"
                                >
                                    Masuk
                                </Link>
                            </div>
                            <div className="mt-10 grid grid-cols-3 max-w-md gap-6">
                                <div>
                                    <div className="font-heading text-3xl font-semibold">7</div>
                                    <div className="label-mono">tahapan</div>
                                </div>
                                <div>
                                    <div className="font-heading text-3xl font-semibold text-brand-success">10</div>
                                    <div className="label-mono">dinas</div>
                                </div>
                                <div>
                                    <div className="font-heading text-3xl font-semibold text-brand-warning">{"<2j"}</div>
                                    <div className="label-mono">SLA banjir</div>
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
                                        <span className="label-mono text-[9px]">Langsung · baru saja</span>
                                    </div>
                                    <div className="font-heading font-semibold text-sm">Lubang di Jl. Sudirman</div>
                                    <div className="text-xs text-muted-foreground mt-1">→ Dinas Pekerjaan Umum · Otomatis</div>
                                </div>
                                <div className="absolute -top-4 -right-4 bg-primary text-white rounded-lg shadow-lg px-4 py-3 animate-fade-up">
                                    <div className="label-mono text-[9px] text-white/70">Kepercayaan AI</div>
                                    <div className="font-mono font-semibold text-2xl">92%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="max-w-[1400px] mx-auto px-4 md:px-8 pb-24">
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Camera, title: "Foto & kirim", desc: "Foto, lokasi, deskripsi. AI menangani kategori & urgensi." },
                            { icon: FlowArrow, title: "Rute pintar", desc: "Masalah dikirim ke dinas yang tepat dengan skor prioritas & SLA." },
                            { icon: ChartLineUp, title: "Pelacakan real-time", desc: "Warga, petugas, dan admin melihat progres secara langsung." },
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
