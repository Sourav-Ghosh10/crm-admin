import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
    Clock, 
    CheckCircle2, 
    Users, 
    CheckCircle, 
    UserMinus, 
    AlertCircle
} from "lucide-react";
import { startOfToday, endOfDay as getEndOfDay, startOfDay as getStartOfDay, format } from "date-fns";
import StatCard from "../../components/common/Stats/StatCard";

import type { Attendance as AttendanceType, AttendanceFilters } from "../../types/attendance.types";
import { attendanceService } from "../../services/attendanceService";
import { departmentService } from "../../services/departmentService";
import { designationService } from "../../services/designationService";
import type { Department, Designation } from "../../types/organization.types";
import { reportService } from "../../services/reportService";
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
import TimezoneToggle from "../../components/common/TimezoneToggle";
import { getOfficeTimezone } from "../../utils/dateUtils";

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
    const [searchParams, setSearchParams] = useSearchParams();

    // Get filters from URL or defaults
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const debouncedSearchTerm = useDebounce(searchTerm, 700);
    const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
    const [departmentFilter, setDepartmentFilter] = useState<string>(searchParams.get("dept") || "all");
    const [designationFilter, setDesignationFilter] = useState<string>(searchParams.get("desig") || "all");
    const initialPage = Number(searchParams.get("page")) || 1;

    const [records, setRecords] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [isExporting, setIsExporting] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        onLeave: 0,
        halfDay: 0
    });

    // Pagination State
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(Number(searchParams.get("limit")) || 10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        const params: Record<string, string> = {
            limit: limit.toString()
        };
        if (debouncedSearchTerm) params.search = debouncedSearchTerm;
        if (statusFilter !== "all") params.status = statusFilter;
        if (departmentFilter !== "all") params.dept = departmentFilter;
        if (designationFilter !== "all") params.desig = designationFilter;
        if (page > 1) params.page = page.toString();
        
        setSearchParams(params, { replace: true });
    }, [debouncedSearchTerm, statusFilter, departmentFilter, designationFilter, page, limit, setSearchParams]);

    // Data helpers
    const authUser = useAppSelector((state) => state.auth.user);

    // Determine start/end date 
    const getActiveRange = () => {
        const today = startOfToday();
        const start = getStartOfDay(today);
        const end = getEndOfDay(today);
        return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    };

    const fetchRecords = useCallback(async (currentPage: number) => {
        try {
            setLoading(true);

            const { startDate, endDate } = getActiveRange();

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

            // Normalization: Ensure status goes to API correctly
            if (statusFilter !== "all") {
                // To be resilient, capitalize the status as some backends expect 'Present' vs 'present'
                const normalizedStatus = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase();
                
                if (statusFilter === 'late') {
                    // Specific handling for 'Late' as it might be a property of 'Present' status
                    (filters as any).status = 'Present';
                    (filters as any).isLate = true;
                    (filters as any).punctuality = 'Late';
                } else {
                    filters.status = normalizedStatus;
                }
            }

            if (designationFilter !== "all") {
                filters.designation = designationFilter;
            }

            if (!authUser?.isAdmin) {
                filters.userId = authUser?._id || authUser?.id;
            }

            // Fetch Stats and Summary in parallel
            // We use getSummary instead of getAll to ensure we see all employees (including absent ones)
            const [resp, statsResp] = await Promise.all([
                attendanceService.getSummary(filters),
                attendanceService.getStats({
                    date: startDate,
                    department: departmentFilter !== "all" ? departmentFilter : undefined,
                    designation: designationFilter !== "all" ? designationFilter : undefined
                })
            ]);

            // Map response to ensure _id exists for Table
            let items = (resp.attendances || []).map((r) => {
                const isLate = r.punctuality === "Late" || r.isLate || (r.sessions && r.sessions.length > 0 && r.sessions.some(s => s.isLate));
                return {
                    ...r,
                    _id: r._id || r.employeeId?._id || r.employeeId || r.date,
                    isLate
                };
            });

            // Frontend fallback filter: if the backend didn't respect the 'late' filter, we do it here
            // This ensures the user doesn't see 'On Time' arrivals when looking for 'Late' ones
            if (statusFilter === 'late') {
                items = items.filter(r => r.isLate);
            }

            setRecords(items as AttendanceRow[]);
            setTotal(resp.total || 0);
            setTotalPages(resp.totalPages || 0);
            setStats(statsResp);
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

    const handleExportReport = async () => {
        try {
            setIsExporting(true);
            const { startDate, endDate } = getActiveRange();

            // Normalization for report generation
            const apiStatus = ['present', 'absent', 'late', 'half-day'].includes(statusFilter.toLowerCase())
                ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase()
                : statusFilter;

            await reportService.generateReport({
                type: 'attendance',
                format: 'pdf',
                startDate,
                endDate,
                // Pass status Filter - try 'all' explicitly if the backend handles it to return everyone
                status: apiStatus, 
                department: departmentFilter !== 'all' ? departmentFilter : undefined,
                designation: designationFilter !== 'all' ? designationFilter : undefined,
                search: debouncedSearchTerm.trim() || undefined,
                // Ensure high limit to download all employees, not just the current page
                limit: 100000 
            });
        } catch (error) {
            console.error("Failed to export attendance report:", error);
        } finally {
            setIsExporting(false);
        }
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
                                const userId = emp?._id || (typeof emp === 'string' ? emp : '');
                                if (userId) {
                                    navigate(`/attendance/${userId}`);
                                } else {
                                    console.error("No valid userId found for navigation", emp);
                                }
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
            _id: "department",
            label: "Department",
            format: (value: unknown, row: AttendanceRow) => {
                const deptValue = typeof value === 'string' ? value : (row.employeeId?.employment?.department || "-");
                return (
                    <div className="text-sm font-medium text-foreground-secondary">
                        {deptValue}
                    </div>
                );
            }
        },
        {
            _id: "date",
            label: "Date",
            format: (value: unknown) => {
                const dateStr = typeof value === 'string' ? value : String(value || "");
                return (
                    <div className="text-sm font-medium text-foreground-secondary">
                        {dateStr ? new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "-"}
                    </div>
                );
            }
        },

        {
            _id: "checkIn",
            label: "Check In",
            minWidth: 180,
            format: (_: unknown, row: AttendanceRow) => {
                const emp = row.employeeId;
                const employeeTimezone = emp?.employment?.timezone || 'Asia/Kolkata';
                const adminTimezone = getOfficeTimezone();
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
                const adminTimezone = getOfficeTimezone();
                const sessions = row.sessions || [];
                const isCurrentlyWorking = sessions.length > 0 && !sessions[sessions.length - 1].checkOut;

                if (isCurrentlyWorking) {
                    return (
                        <div className="flex items-center gap-2">
                             <span className="text-primary font-black uppercase tracking-widest text-[9px] bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg animate-pulse shadow-sm shadow-primary/10">
                                Working
                            </span>
                        </div>
                    );
                }

                // Get the checkout time from root or last recorded session
                const checkOutTime = row.checkOut?.time || (sessions.length > 0 ? sessions[sessions.length - 1].checkOut?.time : null);

                if (!checkOutTime) return <span className="text-foreground-tertiary">--:--</span>;

                return (
                    <div className="relative inline-block group/session">
                        <TimezoneDualView
                            startTime={checkOutTime}
                            primaryTimezone={employeeTimezone}
                            secondaryTimezone={adminTimezone}
                            variant="minimal"
                        />
                        {sessions.length > 1 && (
                            <div className="absolute -top-2 -right-2 flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-[10px] font-black text-white shadow-lg ring-2 ring-surface animate-in zoom-in duration-300 z-10">
                                {sessions.length > 2 ? '2+' : '2'}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            _id: "totalHours",
            label: "Duration",
            format: (_: unknown, row: AttendanceRow) => {
                const sessions = row.sessions || [];
                const isCurrentlyWorking = sessions.length > 0 && !sessions[sessions.length - 1].checkOut;
                
                // Show Net duration primarily, but include Gross for transparency
                // Backend now sends totalDurationString (Net) and totalGrossDurationString (Gross)
                const netDuration = row.netDurationString || row.totalDurationString || "0S";
                const grossDuration = (row as any).totalGrossDurationString;

                return (
                    <div className="flex flex-col">
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground-secondary uppercase text-xs">
                                Net: {netDuration}
                            </span>
                            {grossDuration && grossDuration !== netDuration && (
                                <span className="text-[9px] text-foreground-tertiary uppercase font-medium">
                                    Gross: {grossDuration}
                                </span>
                            )}
                        </div>
                        {isCurrentlyWorking && (
                            <span className="text-[10px] text-primary font-black uppercase tracking-tighter animate-pulse mt-1">
                                Working
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            _id: "breakTime",
            label: "Breaks",
            format: (value: unknown, row: AttendanceRow) => {
                const breaks = row.breaks || [];
                // Use totalBreakDurationString if available, otherwise calculate from breakTime
                const durationStr = row.totalBreakDurationString;
                const breakMinutes = typeof value === 'number' ? value : (parseFloat(value as string) || 0);

                if ((!durationStr || durationStr === "0S") && breakMinutes === 0 && breaks.length === 0) {
                    return <span className="text-foreground-tertiary">-</span>;
                }

                const displayStr = durationStr || (() => {
                    const h = Math.floor(breakMinutes / 60);
                    const m = Math.round(breakMinutes % 60);
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                })();

                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-foreground-secondary uppercase">
                            {displayStr}
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
            format: (value: unknown, row: AttendanceRow) => {
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 relative z-40">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">Attendance Log</h1>
                    <p className="text-sm sm:base text-foreground-tertiary mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Daily attendance and working hours tracking.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <TimezoneToggle variant="horizontal" />
                    <button
                        disabled={isExporting}
                        className="rounded-2xl border-border px-3 sm:px-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-surface border hover:bg-muted transition-all h-10 disabled:opacity-50"
                        onClick={handleExportReport}
                    >
                        {isExporting ? 'Generating...' : 'Export Report'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Employees"
                    value={stats.total}
                    icon={<Users className="w-6 h-6" />}
                    color="info"
                    className={cn(
                        "cursor-pointer hover:border-info",
                        statusFilter === "all" && "ring-2 ring-info"
                    )}
                    onClick={() => setStatusFilter("all")}
                />
                <StatCard
                    title="Present Today"
                    value={stats.present}
                    icon={<CheckCircle className="w-6 h-6" />}
                    color="success"
                    className={cn(
                        "cursor-pointer hover:border-success",
                        statusFilter === "present" && "ring-2 ring-success"
                    )}
                    onClick={() => setStatusFilter("present")}
                />
                <StatCard
                    title="Late Arrivals"
                    value={stats.late}
                    icon={<Clock className="w-6 h-6" />}
                    color="warning"
                    className={cn(
                        "cursor-pointer hover:border-warning",
                        statusFilter === "late" && "ring-2 ring-warning"
                    )}
                    onClick={() => setStatusFilter("late")}
                />
                <StatCard
                    title="Absent"
                    value={stats.absent}
                    icon={<UserMinus className="w-6 h-6" />}
                    color="error"
                    className={cn(
                        "cursor-pointer hover:border-error",
                        statusFilter === "absent" && "ring-2 ring-error"
                    )}
                    onClick={() => setStatusFilter("absent")}
                />
                <StatCard
                    title="On Leave"
                    value={stats.onLeave}
                    icon={<AlertCircle className="w-6 h-6" />}
                    color="primary"
                    className={cn(
                        "cursor-pointer hover:border-primary",
                        statusFilter === "on-leave" && "ring-2 ring-primary"
                    )}
                    onClick={() => setStatusFilter("on-leave")}
                />
            </div>


            <div className="relative z-10 flex flex-col lg:flex-row gap-4 items-center p-4 rounded-[2rem] border border-border/50 bg-surface/50 backdrop-blur-md shadow-sm">
                <div className="flex-1 w-full">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        searchKey="attendance"
                        placeholder="Search by employee name..."
                    />
                </div>

                <div className="shrink-0 flex items-center justify-end gap-2">
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
                <Table
                    columns={columns}
                    rows={records}

                    isRowClickable={(row) => {
                        const status = (row as AttendanceRow).status?.toLowerCase();
                        return !['absent', 'holiday', 'weekend', 'scheduled'].includes(status);
                    }}
                    className="border-none"
                    tableClassName="min-w-[640px]"
                    emptyState={
                        <EmptyState
                            title="No attendance records"
                            description={searchTerm ? `No results for "${searchTerm}"` : "No attendance data found for today."}
                            className="py-20"
                        />
                    }
                />
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
