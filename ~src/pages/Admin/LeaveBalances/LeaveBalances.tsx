import React, { useState, useEffect, useCallback } from "react";
import {
    User as UserIcon,
    Calendar,
    ChevronRight,
    Search as SearchIcon,
    Briefcase
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/common/Card";
import { userService } from "../../../services/userService";
import { leaveService } from "../../../services/leaveService";
import type { User } from "../../../types/user.types";
import type { LeaveBalanceDetails } from "../../../types/leave.types";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce";
import Avatar from "../../../components/common/Avatar";

const LeaveBalances: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [detailedBalances, setDetailedBalances] = useState<LeaveBalanceDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Fetch all leave types once

    const fetchUserBalance = useCallback(async (user: User) => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await leaveService.getEmployeeBalance(user._id || user.id);
            const balances = data.balances || [];

            setDetailedBalances(balances);
            setSelectedUser(user);
            setShowResults(false);
            setSearchTerm("");

            const targetId = user._id || user.id;
            // Update URL if not already there
            if (!userId || userId !== targetId) {
                navigate(`/admin/leave-balances/${targetId}`, { replace: true });
            }
        } catch (error) {
            console.error("Failed to fetch user balance:", error);
            toast.error("Could not retrieve leave balances for this user.");
        } finally {
            setLoading(false);
        }
    }, [userId, navigate]);

    // Initial load from URL param
    useEffect(() => {
        const loadUserFromParam = async () => {
            const currentSelectedId = selectedUser?._id || selectedUser?.id;
            if (userId && currentSelectedId !== userId) {
                try {
                    const user = await userService.getById(userId);
                    fetchUserBalance(user);
                } catch (error) {
                    console.error("Failed to load user from param:", error);
                }
            }
        };
        loadUserFromParam();
    }, [userId, selectedUser, fetchUserBalance]);

    // Fetch users when debounced search changes
    useEffect(() => {
        const fetchUsers = async () => {
            if (debouncedSearch.length < 2) {
                setUsers([]);
                setShowResults(false);
                return;
            }

            setSearching(true);
            try {
                const response = await userService.getAll({ search: debouncedSearch, limit: 10 });
                setUsers(response.users);
                setShowResults(true);
            } catch (error) {
                console.error("Failed to search users:", error);
            } finally {
                setSearching(false);
            }
        };

        fetchUsers();
    }, [debouncedSearch]);




    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && users.length > 0) {
            fetchUserBalance(users[0]);
        }
    };

    return (
        <div className="space-y-8 animate-in mt-6 fade-in duration-700 max-w-7xl mx-auto px-4 lg:px-6 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">Leave Balances</h1>
                    <p className="text-foreground-tertiary mt-2 flex items-center gap-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        View current available leave quotas.
                    </p>
                </div>
            </div>

            {/* User Selection Section */}
            <div className="relative max-w-2xl mx-auto md:mx-0">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <SearchIcon className="w-5 h-5 text-foreground-tertiary group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search for an employee to manage..."
                        className="w-full pl-12 pr-4 py-4 bg-surface border border-border/50 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold shadow-xl shadow-primary/5"
                    />
                    {searching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {showResults && users.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-surface border border-border rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl max-h-[400px] overflow-y-auto">
                        {users.map((user) => (
                            <button
                                key={user._id}
                                onClick={() => fetchUserBalance(user)}
                                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-primary/5 transition-all group text-left border-b border-border/30 last:border-none"
                            >
                                <Avatar
                                    src={user.personalInfo.profilePicture}
                                    firstName={user.personalInfo.firstName}
                                    lastName={user.personalInfo.lastName}
                                    size="lg"
                                    className="rounded-2xl shadow-lg shadow-primary/20 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-foreground group-hover:text-primary transition-colors truncate">
                                        {user.personalInfo.firstName} {user.personalInfo.lastName}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary truncate">
                                        {user.employment.designation} • {user.employment.department}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-foreground-tertiary group-hover:text-primary transition-transform group-hover:translate-x-1" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Fetching Balances...</p>
                </div>
            ) : selectedUser ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* User Card */}
                    <div className="lg:col-span-4 gap-6 flex flex-col">
                        <Card className="rounded-xl sm:rounded-xl border-border/50 shadow-2xl overflow-hidden bg-surface relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
                            <CardContent className="pt-10 text-center">
                                <Avatar
                                    src={selectedUser.personalInfo.profilePicture}
                                    firstName={selectedUser.personalInfo.firstName}
                                    lastName={selectedUser.personalInfo.lastName}
                                    className="w-24 h-24 mx-auto mb-6 shadow-2xl shadow-primary/20 rounded-[2rem]"
                                />
                                <h3 className="text-2xl font-black text-foreground tracking-tight">
                                    {selectedUser.personalInfo.firstName} {selectedUser.personalInfo.lastName}
                                </h3>
                                <p className="text-foreground-tertiary text-sm font-bold mt-1">@{selectedUser.username}</p>

                                <div className="mt-8 flex flex-col gap-3">
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30 text-left">
                                        <Briefcase className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest">Employee ID</p>
                                            <p className="text-sm font-black text-foreground">{selectedUser.employeeId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30 text-left">
                                        <Calendar className="w-5 h-5 text-accent" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest">Department</p>
                                            <p className="text-sm font-black text-foreground">{selectedUser.employment.department}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Adjustment Form */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <Card className="rounded-xl sm:rounded-xl border-border/50 shadow-2xl bg-surface">
                            <CardHeader className="border-b border-border/30 px-8 py-6 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-xl font-black tracking-tight uppercase">Employee Balances</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-muted/30 border-b border-border/30">
                                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">Leave Type</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">Code</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">Annual Allowance</th>
                                                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">Current Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {detailedBalances.length > 0 ? (
                                                detailedBalances.map((type) => {
                                                    const current = type.currentBalance ?? 0;
                                                    const isUnpaid = !type.isPaid;

                                                    return (
                                                        <tr key={type.leaveTypeId || type.code} className="hover:bg-muted/10 transition-colors">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-2 h-2 rounded-full",
                                                                        type.isPaid ? "bg-primary" : "bg-foreground-tertiary"
                                                                    )} />
                                                                    <span className="font-bold text-foreground text-sm">{type.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6 text-center">
                                                                <span className="px-2 py-1 rounded-lg bg-muted text-[10px] font-black uppercase border border-border/50 text-foreground-tertiary">
                                                                    {type.code}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-6 text-center font-black text-sm text-foreground-tertiary">
                                                                {type.totalAllocated ? `${type.totalAllocated} Days` : "N/A"}
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center justify-end gap-3">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest mb-1">
                                                                            {isUnpaid ? "Information" : "Available"}
                                                                        </span>
                                                                        <div className="relative w-32">
                                                                            {isUnpaid ? (
                                                                                <div className="w-full px-4 py-2 text-right bg-muted/20 border border-border/30 rounded-2xl font-black text-sm text-foreground-tertiary">
                                                                                    Unpaid
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-full px-4 py-2 text-right bg-muted/20 border border-border/30 rounded-2xl font-black text-sm text-foreground">
                                                                                    {current} Days
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-8 py-12 text-center text-sm font-bold text-foreground-tertiary">
                                                        No leave balances found for this employee.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-surface rounded-[3rem] border border-dashed border-border/50">
                    <div className="w-20 h-20 bg-muted/30 rounded-[2rem] flex items-center justify-center text-foreground-tertiary mb-6 border border-border/50">
                        <UserIcon className="w-10 h-10 opacity-30" />
                    </div>
                    <h3 className="text-xl font-black text-foreground tracking-tight uppercase">No Employee Selected</h3>
                    <p className="text-foreground-tertiary mt-2 text-sm font-medium">Use the search bar above to select an employee and manage their balances.</p>
                </div>
            )}
        </div>
    );
};

export default LeaveBalances;
