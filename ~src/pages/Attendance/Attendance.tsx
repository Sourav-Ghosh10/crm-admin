import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Clock,
    CheckCircle2
} from "lucide-react";
import type { Attendance as AttendanceType, AttendanceFilters } from "../../types/attendance.types";
import { attendanceService } from "../../services/attendanceService";
import { departmentService } from "../../services/departmentService";
import { designationService } from "../../services/designationService";
import type { Department, Designation } from "../../types/organization.types";
import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "../../lib/utils";
import Table from "../../components/common/Table";
import GlobalLoader from "../../components/common/LoadingSpinner/GlobalLoader";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import UnifiedFilter from "../../components/common/Filter/UnifiedFilter";
import FilterDropdown from "../../components/common/Filter/FilterDropdown";
import Pagination from "../../components/common/Pagination";
import { SearchInput } from "../../components/common/Search/SearchInput";
import { useAppSelector } from "../../store/hooks";
import TimezoneDualView from "../../components/common/TimezoneDualView";

// Extended interface, though AttendanceType now includes _id, we keep this for safety or extended UI props
// Extended interface, though AttendanceType now includes _id, we keep this for safety or extended UI props
type AttendanceRow = AttendanceType;

const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
        present: "bg-success/10 text-success border-success/20",
        absent: "bg-error/10 text-error border-error/20",
        late: "bg-warning/10 text-warning border-warning/20",
        "half-day": "bg-blue-500/10 text-blue-600 border-blue-500/20",
        "on-leave": "bg-purple-500/10 text-purple-600 border-purple-500/20",
        holiday: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        weekend: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    };

    return (
        <span
            className={cn(
                "px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                variants[status.toLowerCase()] || "bg-muted text-foreground-tertiary border-border"
            )}
        >
            {status}
        </span>
    );
};

const Attendance: React.FC = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 700);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [designationFilter, setDesignationFilter] = useState<string>("all");
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Data helpers
    const authUser = useAppSelector((state) => state.auth.user);

    // Determine start/end date based on filter
    const getDateRange = (filter: string) => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        // Reset hours for start of day
        start.setHours(0, 0, 0, 0);
        // Set hours for end of day
        end.setHours(23, 59, 59, 999);

        if (filter === "today") {
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        if (filter === "week") {
            // Calculate start of week (Monday)
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);

            start.setDate(diff);
            end.setDate(start.getDate() + 6);

            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        if (filter === "month") {
            start.setDate(1); // 1st of current month
            end.setMonth(end.getMonth() + 1);
            end.setDate(0); // Last day of current month

            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        // For "all", return undefined
        return { startDate: undefined, endDate: undefined };
    };

    const fetchRecords = useCallback(async (currentPage: number) => {
        try {
            setLoading(true);

            const { startDate, endDate } = getDateRange("today");

            const filters: AttendanceFilters = {
                page: currentPage,
                limit,
                startDate,
                endDate,
            };

            if (departmentFilter !== "all") {
                filters.department = departmentFilter;
            }

            if (debouncedSearchTerm.trim()) {
                filters.search = debouncedSearchTerm.trim();
            }

            if (statusFilter !== "all") {
                filters.status = statusFilter;
            }

            if (designationFilter !== "all") {
                filters.designation = designationFilter;
            }

            if (!authUser?.isAdmin) {
                filters.userId = authUser?._id || authUser?.id;
            }

            const resp = await attendanceService.getAll(filters);

            // Map response to ensure _id exists for Table
            const items = (resp.attendances || []).map((r) => {
                const isLate = r.punctuality === "Late" || r.isLate || (r.sessions && r.sessions.length > 0 && r.sessions.some(s => s.isLate));
                return {
                    ...r,
                    _id: r._id || r.date,
                    isLate
                };
            });

            setRecords(items as AttendanceRow[]);
            setTotal(resp.total || 0);
            setTotalPages(resp.totalPages || 0);

        } catch (err) {
            console.error("Failed to fetch attendance:", err);
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    }, [debouncedSearchTerm, statusFilter, departmentFilter, designationFilter, limit, authUser]);

    // Fetch Departments & Designations
    useEffect(() => {
        const fetchDeps = async () => {
            try {
                const [depsResp, desigResp] = await Promise.all([
                    departmentService.getAll({ limit: 100 }),
                    designationService.getAll({ limit: 100 })
                ]);
                setDepartments(depsResp.data);
                setDesignations(desigResp.data);
            } catch (err) {
                console.error("Failed to fetch departments/designations:", err);
            }
        };
        fetchDeps();
    }, []);

    // Effects
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, statusFilter, departmentFilter, designationFilter]);

    useEffect(() => {
        fetchRecords(page);
    }, [fetchRecords, page]);

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchRecords(newPage);
    };

    const columns = [
        {
            _id: "employeeId", // Key used for data access, but we format it
            label: "Employee",
            format: (_: unknown, row: AttendanceRow) => {
                const emp = row.employeeId;
                const name = row.name || (emp?.personalInfo ? `${emp.personalInfo.firstName || ''} ${emp.personalInfo.lastName || ''}`.trim() || emp.username : "Unknown");
                const email = row.email || emp?.personalInfo?.email || "";
                return (
                    <div className="flex flex-col">
                        <span
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/attendance/${emp?._id}`);
                            }}
                        >
                            {name}
                        </span>
                        <span className="text-xs text-foreground-tertiary">{email}</span>
                    </div>
                );
            }
        },
        {
            _id: "date",
            label: "Date",
            format: (value: unknown) => (
                <div className="text-sm font-medium text-foreground-secondary">
                    {value ? new Date(String(value)).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "-"}
                </div>
            )
        },
        // {
        //     _id: "designation",
        //     label: "Designation",
        //     format: (_: unknown, row: AttendanceRow) => {
        //         const emp = row.employeeId;
        //         // Try to find designation in row or row.employeeId
        //         const designation = row.designation || (emp as any)?.employment?.designation || (emp as any)?.designation || "N/A";
        //         return (
        //             <div className="text-xs font-medium text-foreground-tertiary">
        //                 {designation}
        //             </div>
        //         );
        //     }
        // },
        {
            _id: "checkIn",
            label: "Check In",
            minWidth: 180,
            format: (_: unknown, row: AttendanceRow) => {
                const emp = row.employeeId;
                const employeeTimezone = emp?.employment?.timezone || 'Asia/Kolkata';
                const adminTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const sessions = row.sessions || [];
                const checkInTime = sessions.length > 0 ? sessions[0].checkIn.time : row.checkIn?.time;

                if (!checkInTime) return <span className="text-foreground-tertiary">-</span>;

                return (
                    <TimezoneDualView
                        startTime={checkInTime}
                        primaryTimezone={employeeTimezone}
                        secondaryTimezone={adminTimezone}
                        variant="minimal"
                    />
                );
            }
        },
        {
            _id: "checkOut",
            label: "Check Out",
            minWidth: 180,
            format: (_: unknown, row: AttendanceRow) => {
                const emp = row.employeeId;
                const employeeTimezone = emp?.employment?.timezone || 'Asia/Kolkata';
                const adminTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const sessions = row.sessions || [];

                // Get the last checkout time
                const checkOutTime = sessions.length > 0
                    ? sessions[sessions.length - 1].checkOut?.time
                    : row.checkOut?.time;

                if (!checkOutTime) return <span className="text-foreground-tertiary">--:--</span>;

                return (
                    <TimezoneDualView
                        startTime={checkOutTime}
                        primaryTimezone={employeeTimezone}
                        secondaryTimezone={adminTimezone}
                        variant="minimal"
                    />
                );
            }
        },
        {
            _id: "totalHours",
            label: "Duration",
            format: (value: unknown, row: AttendanceRow) => {
                const sessions = row.sessions || [];
                const isClockedOut = row.checkOut || (sessions.length > 0 && sessions[sessions.length - 1].checkOut);

                if (!isClockedOut || typeof value !== 'number' || value === 0) {
                    return <span className="text-foreground-tertiary">-</span>;
                }

                const h = Math.floor(value / 60);
                const m = Math.round(value % 60);
                return (
                    <span className="font-bold text-foreground-secondary">
                        {h > 0 ? `${h}h ` : ""}{m}m
                    </span>
                );
            }
        },
        {
            _id: "breakTime",
            label: "Breaks",
            format: (value: unknown, row: AttendanceRow) => {
                const breaks = row.breaks || [];
                if (typeof value !== 'number' || value === 0) return <span className="text-foreground-tertiary">-</span>;
                const h = Math.floor(value / 60);
                const m = Math.round(value % 60);
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-foreground-secondary">
                            {h > 0 ? `${h}h ` : ""}{m}m
                        </span>
                        {breaks.length > 0 && (
                            <span className="text-[10px] text-foreground-tertiary">
                                {breaks.length} {breaks.length === 1 ? 'break' : 'breaks'}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            _id: "punctuality",
            label: "Punctuality",
            format: (value: any, row: AttendanceRow) => {
                if (row.status !== 'present') return <span className="text-foreground-tertiary">-</span>;

                // Be resilient: check punctuality string, root isLate, and sessions
                const isLate = value === "Late" || row.isLate || (row.sessions && row.sessions.length > 0 && row.sessions.some(s => s.isLate));

                return (
                    <div className="flex items-center gap-2">
                        {isLate ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/10 text-warning border border-warning/20">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Late</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-success/10 text-success border border-success/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-wider">On Time</span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            _id: "status",
            label: "Status",
            format: (_: unknown, row: AttendanceRow) => (
                <div className="flex items-center gap-2">
                    {getStatusBadge(row.status)}
                </div>
            ),
        }
    ];

    if (isInitialLoading) {
        return <GlobalLoader fullScreen message="Loading Attendance Records..." />;
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 px-2 sm:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">Attendance Log</h1>
                    <p className="text-sm sm:base text-foreground-tertiary mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Daily attendance and working hours tracking.
                    </p>
                </div>
                {/* <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        className="rounded-2xl border-border px-3 sm:px-5 flex text-sm"
                        startIcon={<Download className="w-4 h-4" />}
                    >
                        Export Report
                    </Button>
                </div> */}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <div className="lg:col-span-2">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search by employee name..."
                    />
                </div>

                <div className="lg:col-span-2 flex justify-start gap-2">
                    <UnifiedFilter
                        filters={[
                            {
                                id: "status",
                                label: "Status",
                                value: statusFilter,
                                onChange: setStatusFilter,
                                options: [
                                    { value: "all", label: "All Status" },
                                    { value: "present", label: "Present" },
                                    { value: "late", label: "Late" },
                                    { value: "absent", label: "Absent" },
                                    { value: "half-day", label: "Half Day" },
                                    { value: "on-leave", label: "On Leave" },
                                    { value: "holiday", label: "Holiday" },
                                    { value: "weekend", label: "Weekend" },
                                ]
                            },
                            {
                                id: "department",
                                label: "Department",
                                value: departmentFilter,
                                onChange: setDepartmentFilter,
                                options: [
                                    { value: "all", label: "All Depts" },
                                    ...departments.map(dep => ({
                                        value: dep.name,
                                        label: dep.name
                                    }))
                                ]
                            },
                            {
                                id: "designation",
                                label: "Designation",
                                value: designationFilter,
                                onChange: setDesignationFilter,
                                options: [
                                    { value: "all", label: "All Desigs" },
                                    ...designations.map(des => ({
                                        value: des.title || des.name || "",
                                        label: des.title || des.name || "Unknown"
                                    }))
                                ]
                            }
                        ]}
                    />
                </div>
            </div>

            <div className="bg-surface rounded-xl sm:rounded-xl border border-border/40 shadow-2xl shadow-black/[0.03] overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">Syncing Records...</p>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <Table
                        columns={columns}
                        rows={records}
                        // onRowClick={(row: any) => navigate(`/attendance/record/${row.date}/${row.employeeId?._id || row.employeeId}`)}
                        isRowClickable={(row) => {
                            const status = (row as any).status?.toLowerCase();
                            return !['absent', 'holiday', 'weekend', 'scheduled'].includes(status);
                        }}
                        className="border-none min-w-[640px]"
                        emptyState={
                            <EmptyState
                                title="No attendance records"
                                description={searchTerm ? `No results for "${searchTerm}"` : "No attendance data found for today."}
                                className="py-20"
                            />
                        }
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-4">
                <div className="flex items-center gap-3">
                    <p className="text-xs sm:text-sm font-bold text-foreground-tertiary uppercase tracking-widest bg-muted/50 px-3 sm:px-4 py-2 rounded-2xl border border-border/30">
                        Page <span className="text-primary">{page}</span> of {totalPages || 1} (Total: {total})
                    </p>
                    <div className="relative group">
                        <FilterDropdown
                            value={limit.toString()}
                            options={[10, 20, 50, 100].map(v => ({ value: v.toString(), label: `${v} / Page` }))}
                            onChange={(v) => handleLimitChange(Number(v))}
                            className="
                            h-9 px-3 rounded-xl border-border/50
                            text-xs font-bold text-foreground-tertiary
                            pr-8
                            hover:text-foreground-tertiary
                            focus:text-foreground-tertiary
                            data-[state=open]:text-foreground-tertiary
                            "
                            align="start"
                        />
                    </div>
                </div>

                {totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    );
};

export default Attendance;
