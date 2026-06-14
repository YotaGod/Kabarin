import React from "react";
import Navbar from "./Navbar";
import { Toaster } from "./ui/sonner";

export default function Layout({ children, fullBleed }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            <main className={`flex-1 ${fullBleed ? "" : "max-w-[1400px] mx-auto w-full px-4 md:px-8 py-6 md:py-10"}`}>
                {children}
            </main>
            <Toaster richColors position="top-right" />
        </div>
    );
}
