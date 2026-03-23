import React, { useState, useEffect } from "react";
import { Mail, Calendar, MapPin, ExternalLink, ShieldCheck } from "lucide-react";
import Avatar from "../../../components/common/Avatar";
import type { User as UserType } from "../../../types/user.types";
import { userService } from "../../../services/userService";
// import { cn } from "../../../lib/utils";

const AssignedTeam: React.FC = () => {
    const [team, setTeam] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                // In a real scenario, we'd fetch based on current client ID
                // For now, let's fetch first few users as a mock team
                const res = await userService.getAll({ limit: 4 });
                setTeam(res.users);
            } catch (err) {
                console.error("Failed to fetch assigned team", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-[280px] rounded-3xl bg-surface border border-border animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">Assigned Talent</h2>
                    <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest mt-1">
                        High-Performance Resources powering your account
                    </p>
                </div>
                <div className="flex -space-x-3">
                    {team.map((m) => (
                        <Avatar
                            key={m.id}
                            src={m.personalInfo.profilePicture}
                            name={`${m.personalInfo.firstName} ${m.personalInfo.lastName}`}
                            size="sm"
                            className="border-2 border-surface shadow-md"
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {team.map((member) => (
                    <div
                        key={member.id}
                        className="group relative bg-surface rounded-[2rem] border border-border/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 overflow-hidden"
                    >
                        {/* Status Ornament */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-success/10 rounded-full border border-success/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            <span className="text-[9px] font-black uppercase text-success tracking-widest">Active</span>
                        </div>

                        {/* Top Decoration */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <Avatar
                                    src={member.personalInfo.profilePicture}
                                    name={`${member.personalInfo.firstName} ${member.personalInfo.lastName}`}
                                    size="2xl"
                                    className="rounded-[2rem] shadow-xl border-4 border-surface group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-surface rounded-xl flex items-center justify-center shadow-lg text-primary border border-border">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-foreground uppercase tracking-tight mb-1">
                                {member.personalInfo.firstName} {member.personalInfo.lastName}
                            </h3>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-4">
                                {member.employment.designation || "Creative Technologist"}
                            </p>

                            <div className="w-full space-y-3 pt-4 border-t border-border/50">
                                <div className="flex items-center gap-3 text-foreground-tertiary">
                                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                                        <Mail className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-medium lowercase truncate flex-1 text-left">
                                        {member.personalInfo.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-foreground-tertiary">
                                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-medium text-left">
                                        {member.employment.location || member.personalInfo.address?.city || "Remote Matrix"}
                                    </span>
                                </div>
                            </div>

                            <button className="mt-6 w-full py-3 bg-muted/50 hover:bg-primary hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                                <ExternalLink className="w-3 h-3" />
                                Performance Log
                            </button>
                        </div>
                    </div>
                ))}

                {/* Growth Metric Card */}
                <div className="bg-primary/5 rounded-[2rem] border border-primary/20 p-6 flex flex-col items-center justify-center text-center transition-all hover:bg-primary/10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-2">Scale Team</h3>
                    <p className="text-[10px] text-foreground-tertiary font-medium leading-relaxed mb-6">
                        Need more high-bandwidth resources?
                    </p>
                    <button className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:shadow-xl transition-all">
                        Request Expansion
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignedTeam;
