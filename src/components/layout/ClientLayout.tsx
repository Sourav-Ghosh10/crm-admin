import React from "react";
import { Outlet } from "react-router-dom";
import ClientHeader from "./ClientHeader";
import Footer from "./Footer";

const ClientLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-muted/30">
            <ClientHeader />

            <main className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    {/* Passive Portal Indicator */}
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-tertiary">
                                Live Data Matrix • Authorization: Passive
                            </span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-surface border border-border shadow-sm">
                            <span className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">
                                System v4.1.0-readonly
                            </span>
                        </div>
                    </div>

                    <Outlet />
                </div>
            </main>

            <div className="max-w-7xl mx-auto px-4 md:px-8 border-t border-border mt-auto">
                <Footer />
            </div>
        </div>
    );
};

export default ClientLayout;
