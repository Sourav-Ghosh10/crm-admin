import React from "react";
import AssignedTeam from "./components/AssignedTeam";
import {
    Activity,
    ArrowUpRight,
    Zap,
    BarChart3,
    ShieldAlert
} from "lucide-react";

const TeamDashboard: React.FC = () => {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Header / Stats Overlay */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface p-6 rounded-[2rem] border border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest">Efficiency</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-foreground tracking-tighter">98.4%</span>
                        <div className="flex items-center text-success text-[10px] font-black mb-1.5">
                            <ArrowUpRight className="w-3 h-3" /> 2.1%
                        </div>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-[2rem] border border-border/50 shadow-sm group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest">Availability</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-foreground tracking-tighter">100%</span>
                        <span className="text-[10px] font-bold text-foreground-tertiary mb-1.5 lowercase">Uptime</span>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-[2rem] border border-border/50 shadow-sm group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest">Resource Load</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-foreground tracking-tighter">72%</span>
                        <div className="w-20 h-1.5 bg-muted rounded-full mb-3 ml-2 overflow-hidden">
                            <div className="h-full bg-warning w-[72%]" />
                        </div>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-[2rem] border border-border/50 shadow-sm group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest">Security</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-foreground tracking-tighter">Elite</span>
                        <span className="text-[10px] font-bold text-foreground-tertiary mb-1.5 uppercase ml-1">Verified</span>
                    </div>
                </div>
            </div>

            {/* Team Grid */}
            <AssignedTeam />

            {/* Active Projects Placeholder */}
            <div className="bg-black text-white p-12 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 via-transparent to-transparent opacity-50" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <h2 className="text-4xl font-black tracking-tighter uppercase mb-4 leading-none">Intelligence Stream</h2>
                        <p className="text-white/50 text-sm font-medium leading-relaxed">
                            Your account is currently receiving high-priority maintenance. All data streams are synchronized. Performance reports are generated every 24 hours.
                        </p>
                    </div>
                    <button className="px-10 py-5 bg-white text-black rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">
                        Detailed Analytics
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeamDashboard;
