import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Edit,
    Calendar,
    Briefcase,
    MapPin,
    Save,
} from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { cn } from "../../../lib/utils";
import { leaveService } from "../../../services/leaveService";
import { departmentService } from "../../../services/departmentService";
import { locationService } from "../../../services/locationService";
import type {
    AllEmployeeLeaveBalanceItem,
    EmployeeTypeBalanceItem,
    LeaveTypeSummary,
} from "../../../types/leave.types";
import type { Department, OfficeLocation } from "../../../types/organization.types";
import { useDebounce } from "../../../hooks/useDebounce";
import Avatar from "../../../components/common/Avatar";
import Button from "../../../components/common/Button";
import Table from "../../../components/common/Table";
import Modal, { ModalFooter } from "../../../components/common/Modal/Modal";
import GlobalLoader from "../../../components/common/LoadingSpinner/GlobalLoader";
import EmptyState from "../../../components/common/EmptyState/EmptyState";
import UnifiedFilter from "../../../components/common/Filter/UnifiedFilter";
import FilterDropdown from "../../../components/common/Filter/FilterDropdown";
import Pagination from "../../../components/common/Pagination";
import { SearchInput } from "../../../components/common/Search/SearchInput";
import { getErrorMessage } from "../../../utils/errorHandling";

interface EditModalEmployee {
    userId: string;
    name: string;
    employeeId?: string;
    department?: string;
    location?: string;
    email?: string;
    profilePicture?: string | null;
    isPaidLeaveApplicable?: boolean;
    balances: EmployeeTypeBalanceItem[];
}

const isUnpaidLeaveType = (lt: { name?: string; code?: string; isPaid?: boolean }) => {
    const nameLower = (lt.name || "").toLowerCase();
    const codeLower = (lt.code || "").toLowerCase();
    return lt.isPaid === false || codeLower === "lwp" || codeLower === "unpaid" || nameLower.includes("unpaid");
};

const LeaveBalances: React.FC = () => {
    const { userId: paramUserId } = useParams<{ userId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters synced with URL
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [deptFilter, setDeptFilter] = useState<string>(searchParams.get("dept") || "all");
    const [locationFilter, setLocationFilter] = useState<string>(searchParams.get("location") || "all");
    const [page, setPage] = useState<number>(Number(searchParams.get("page")) || 1);
    const [limit, setLimit] = useState<number>(Number(searchParams.get("limit")) || 10);

    // List data
    const [leaveTypes, setLeaveTypes] = useState<LeaveTypeSummary[]>([]);
    const [rows, setRows] = useState<AllEmployeeLeaveBalanceItem[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

    // Filter options
    const [departments, setDepartments] = useState<Department[]>([]);
    const [locations, setLocations] = useState<OfficeLocation[]>([]);

    // Per-type Edit Modal state
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [editModalLoading, setEditModalLoading] = useState<boolean>(false);
    const [editEmployee, setEditEmployee] = useState<EditModalEmployee | null>(null);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [isSavingModal, setIsSavingModal] = useState<boolean>(false);

    // Sync filters to URL
    useEffect(() => {
        const params: Record<string, string> = {};
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (deptFilter !== "all") params.dept = deptFilter;
        if (locationFilter !== "all") params.location = locationFilter;
        if (page > 1) params.page = String(page);
        if (limit !== 10) params.limit = String(limit);
        setSearchParams(params, { replace: true });
    }, [debouncedSearch, deptFilter, locationFilter, page, limit, setSearchParams]);

    // Fetch departments and work locations once
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [deptRes, locRes] = await Promise.all([
                    departmentService.getAll({ limit: 100, isActive: true }),
                    locationService.getAll({ limit: 100 }),
                ]);
                setDepartments(deptRes.data || []);
                setLocations(locRes.data || []);
            } catch (err) {
                console.error("Failed to fetch filter options:", err);
            }
        };
        loadFilterOptions();
    }, []);

    // Fetch all employees' leave balances
    const fetchBalances = useCallback(async (targetPage: number) => {
        try {
            setLoading(true);
            const res = await leaveService.getAllEmployeeBalances({
                page: targetPage,
                limit,
                search: debouncedSearch.trim() || undefined,
                department: deptFilter !== "all" ? deptFilter : undefined,
                location: locationFilter !== "all" ? locationFilter : undefined,
            });
            setLeaveTypes((res.leaveTypes || []).filter((lt) => !isUnpaidLeaveType(lt)));
            setRows(res.data || []);
            setTotal(res.pagination?.total || 0);
            setTotalPages(res.pagination?.pages || 1);
        } catch (err) {
            console.error("Failed to fetch employee leave balances:", err);
            toast.error(String(getErrorMessage(err, "Failed to load leave balances")));
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    }, [debouncedSearch, deptFilter, locationFilter, limit]);

    // Reset to page 1 when filters/limit change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, deptFilter, locationFilter, limit]);

    useEffect(() => {
        fetchBalances(page);
    }, [fetchBalances, page]);

    // Open Edit Modal from a table row
    const openEditModalForRow = (row: AllEmployeeLeaveBalanceItem) => {
        const paidBalances = (row.leaveBalances || []).filter((b) => !isUnpaidLeaveType(b));
        const initialVals: Record<string, string> = {};
        paidBalances.forEach((b) => {
            initialVals[b.name] = String(b.allocated ?? 0);
        });
        setEditEmployee({
            userId: row.userId,
            name: `${row.personalInfo.firstName} ${row.personalInfo.lastName}`.trim(),
            employeeId: row.employeeId,
            department: row.employment.department,
            location: row.employment.location,
            email: row.personalInfo.email,
            profilePicture: row.personalInfo.profilePicture,
            isPaidLeaveApplicable: row.isPaidLeaveApplicable,
            balances: paidBalances,
        });
        setEditValues(initialVals);
        setEditModalLoading(false);
        setEditModalOpen(true);
    };

    // Open Edit Modal from URL param /:userId
    const openEditModalByUserId = useCallback(async (targetUserId: string) => {
        setEditModalOpen(true);
        setEditModalLoading(true);
        try {
            const data = await leaveService.getEmployeeBalance(targetUserId);
            const mappedBalances: EmployeeTypeBalanceItem[] = (data.balances || [])
                .filter((b) => !isUnpaidLeaveType(b))
                .map((b) => {
                const allocated = b.totalAllocated ?? 0;
                const used = b.used ?? 0;
                return {
                    leaveTypeId: b.leaveTypeId || b.code,
                    name: b.name,
                    code: b.code,
                    isPaid: b.isPaid,
                    allocated,
                    approved: used,
                    pending: 0,
                    used,
                    available: Math.max(0, Number((allocated - used).toFixed(2))),
                };
            });
            const initialVals: Record<string, string> = {};
            mappedBalances.forEach((b) => {
                initialVals[b.name] = String(b.allocated ?? 0);
            });
            setEditEmployee({
                userId: data.userId || targetUserId,
                name: data.name || "Employee",
                department: data.department,
                balances: mappedBalances,
            });
            setEditValues(initialVals);
        } catch (err) {
            console.error("Failed to fetch employee leave balances:", err);
            toast.error("Could not retrieve leave balances for this employee.");
            setEditModalOpen(false);
        } finally {
            setEditModalLoading(false);
        }
    }, []);

    useEffect(() => {
        if (paramUserId) {
            openEditModalByUserId(paramUserId);
        }
    }, [paramUserId, openEditModalByUserId]);

    const handleValueChange = (leaveTypeName: string, val: string) => {
        setEditValues((prev) => ({
            ...prev,
            [leaveTypeName]: val,
        }));
    };

    const handleSaveBalances = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();
        if (!editEmployee) return;

        const payloadMap: Record<string, number> = {};
        for (const item of editEmployee.balances) {
            const raw = editValues[item.name] ?? "0";
            const parsed = Number(raw);
            if (raw.trim() === "" || isNaN(parsed) || parsed < 0) {
                toast.error(`Please enter a valid non-negative balance for "${item.name}".`);
                return;
            }
            payloadMap[item.name] = parsed;
        }

        try {
            setIsSavingModal(true);
            await leaveService.updateEmployeeBalance(editEmployee.userId, payloadMap);
            toast.success(`Updated leave balances for ${editEmployee.name}`);
            setEditModalOpen(false);
            await fetchBalances(page);
        } catch (err) {
            console.error("Failed to update leave balances:", err);
            toast.error(String(getErrorMessage(err, "Failed to update leave balances")));
        } finally {
            setIsSavingModal(false);
        }
    };

    // Live totals inside modal
    const modalTotals = useMemo(() => {
        if (!editEmployee) return { totalQuota: 0, totalUsed: 0, totalAvailable: 0 };
        let totalQuota = 0;
        let totalUsed = 0;
        let totalAvailable = 0;
        editEmployee.balances.forEach((b) => {
            if (!b.isPaid) return;
            const raw = editValues[b.name];
            const val = raw !== undefined && raw !== "" && !isNaN(Number(raw)) ? Math.max(0, Number(raw)) : b.allocated;
            totalQuota += val;
            totalUsed += b.used;
            totalAvailable += Math.max(0, val - b.used);
        });
        return {
            totalQuota: Number(totalQuota.toFixed(2)),
            totalUsed: Number(totalUsed.toFixed(2)),
            totalAvailable: Number(totalAvailable.toFixed(2)),
        };
    }, [editEmployee, editValues]);

    // Build dynamic table columns (Employee + Dept/Location + Each active leave type + Actions)
    const columns = useMemo(() => {
        const dynamicTypeColumns = leaveTypes.map((lt) => ({
            _id: `lt_${lt._id || lt.code}`,
            label: `${lt.name} (${lt.code})`,
            format: (_: unknown, row: AllEmployeeLeaveBalanceItem) => {
                const entry = (row.leaveBalances || []).find(
                    (b) => b.leaveTypeId === lt._id || b.code === lt.code || b.name === lt.name
                );
                if (!entry) {
                    return <span className="text-xs text-foreground-tertiary">-</span>;
                }

                if (!entry.isPaid) {
                    return (
                        <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-muted text-foreground-tertiary border border-border inline-block">
                                Unpaid
                            </span>
                            <div className="text-[10px] font-medium text-foreground-tertiary">
                                Used: {entry.used}
                            </div>
                        </div>
                    );
                }

                const avail = entry.available ?? 0;
                return (
                    <div className="space-y-0.5">
                        <span
                            className={cn(
                                "px-2.5 py-0.5 rounded-lg text-xs font-black border inline-block",
                                avail > 0
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-error/10 text-error border-error/20"
                            )}
                        >
                            {avail} / {entry.allocated}
                        </span>
                        <div className="text-[10px] font-medium text-foreground-tertiary">
                            Used: {entry.used}
                            {entry.pending > 0 ? ` (${entry.pending} pend.)` : ""}
                        </div>
                    </div>
                );
            },
        }));

        return [
            {
                _id: "employee",
                label: "Employee",
                format: (_: unknown, row: AllEmployeeLeaveBalanceItem) => (
                    <div className="flex items-center gap-3 py-1">
                        <Avatar
                            src={row.personalInfo.profilePicture || undefined}
                            firstName={row.personalInfo.firstName}
                            lastName={row.personalInfo.lastName}
                            size="md"
                            className="shrink-0"
                        />
                        <div className="min-w-0">
                            <div className="font-bold text-foreground text-sm leading-snug truncate">
                                {row.personalInfo.firstName} {row.personalInfo.lastName}
                            </div>
                            <div className="text-xs font-medium text-foreground-tertiary flex items-center gap-1.5 mt-0.5">
                                <span className="bg-muted px-1.5 py-0.5 rounded-md border border-border/50 text-[10px] font-bold">
                                    {row.employeeId}
                                </span>
                                {!row.isPaidLeaveApplicable && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/20 text-[9px] font-black uppercase">
                                        Unpaid Only
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                _id: "department",
                label: "Dept & Location",
                format: (_: unknown, row: AllEmployeeLeaveBalanceItem) => (
                    <div className="space-y-1">
                        <div className="text-sm font-bold text-foreground">
                            {row.employment.department || "Unassigned"}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-foreground-tertiary">
                            {row.employment.designation && <span>{row.employment.designation}</span>}
                            {row.employment.location && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted border border-border/50 text-[10px] font-bold text-foreground-secondary">
                                    <MapPin className="w-3 h-3 text-primary" />
                                    {row.employment.location}
                                </span>
                            )}
                        </div>
                    </div>
                ),
            },
            ...dynamicTypeColumns,
            {
                _id: "actions",
                label: "Actions",
                align: "right" as const,
                format: (_: unknown, row: AllEmployeeLeaveBalanceItem) => (
                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModalForRow(row)}
                            className="h-8 px-3 rounded-xl border-primary/20 text-primary hover:bg-primary/5 text-xs font-bold whitespace-nowrap"
                            startIcon={<Edit className="w-3.5 h-3.5" />}
                        >
                            Edit Balances
                        </Button>
                    </div>
                ),
            },
        ];
    }, [leaveTypes]);

    if (isInitialLoading) {
        return <GlobalLoader fullScreen message="Loading Leave Balances..." />;
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 px-2 sm:px-0 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
                        Leave Balances
                    </h1>
                    <p className="text-sm sm:text-base text-foreground-tertiary mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        View and update individual leave type balances for all employees.
                    </p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="relative z-10 flex flex-col lg:flex-row gap-4 items-center p-4 rounded-[2rem] border border-border/50 bg-surface/50 backdrop-blur-md shadow-sm">
                <div className="flex-1 w-full">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        searchKey="leave-balances-search"
                        placeholder="Search by employee name, ID, or email..."
                    />
                </div>

                <div className="shrink-0 flex items-center justify-end gap-2">
                    <UnifiedFilter
                        filters={[
                            {
                                id: "dept",
                                label: "Department",
                                value: deptFilter,
                                onChange: setDeptFilter,
                                options: [
                                    { value: "all", label: "All Departments" },
                                    ...departments.map((d) => ({ value: d.name, label: d.name })),
                                ],
                            },
                            {
                                id: "location",
                                label: "Work Location",
                                value: locationFilter,
                                onChange: setLocationFilter,
                                options: [
                                    { value: "all", label: "All Locations" },
                                    ...locations.map((l) => ({ value: l.name, label: l.name })),
                                ],
                            },
                        ]}
                    />
                </div>
            </div>

            {/* Legend */}
            {leaveTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-2 text-xs text-foreground-tertiary font-medium">
                    <span>Showing <strong className="text-foreground">Available / Quota</strong> for each leave type.</span>
                </div>
            )}

            {/* All Employees Leave Balance Matrix Table */}
            <div className="bg-surface rounded-xl border border-border/40 shadow-2xl shadow-black/[0.03] overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">
                            Syncing Leave Balances...
                        </p>
                    </div>
                )}

                <Table
                    columns={columns}
                    rows={rows}
                    className="border-none"
                    tableClassName="min-w-[900px]"
                    emptyState={
                        <EmptyState
                            title="No employees found"
                            description={
                                searchTerm
                                    ? `No employees match "${searchTerm}".`
                                    : "No active employees found for the selected filters."
                            }
                            className="py-20"
                        />
                    }
                />
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-4">
                <div className="flex items-center gap-3">
                    <p className="text-xs sm:text-sm font-bold text-foreground-tertiary uppercase tracking-widest bg-muted/50 px-3 sm:px-4 py-2 rounded-2xl border border-border/30">
                        Page <span className="text-primary">{page}</span> of {totalPages || 1} (Total: {total})
                    </p>
                    <FilterDropdown
                        value={limit.toString()}
                        options={[10, 20, 50, 100].map((v) => ({
                            value: v.toString(),
                            label: `${v} / Page`,
                        }))}
                        onChange={(v) => setLimit(Number(v))}
                        className="h-9 px-3 rounded-xl border-border/50 text-xs font-bold text-foreground-tertiary"
                        align="start"
                    />
                </div>
                <Pagination
                    currentPage={page}
                    totalPages={totalPages || 1}
                    onPageChange={setPage}
                />
            </div>

            {/* Edit Individual Leave Type Balances Modal */}
            <Modal
                open={editModalOpen}
                onClose={() => !isSavingModal && setEditModalOpen(false)}
                title="Edit Leave Balances"
                maxWidth="md"
            >
                {editModalLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-primary">
                            Loading leave balances...
                        </p>
                    </div>
                ) : editEmployee ? (
                    <form
                        id="edit-leave-balances-form"
                        onSubmit={handleSaveBalances}
                        className="space-y-5"
                    >
                        {/* Employee Header */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border/50">
                            <Avatar
                                src={editEmployee.profilePicture || undefined}
                                firstName={editEmployee.name.split(" ")[0] || "E"}
                                lastName={editEmployee.name.split(" ").slice(1).join(" ") || ""}
                                size="lg"
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-lg text-foreground truncate">
                                    {editEmployee.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2.5 text-xs text-foreground-tertiary font-medium mt-0.5">
                                    {editEmployee.employeeId && (
                                        <span className="inline-flex items-center gap-1">
                                            <Briefcase className="w-3.5 h-3.5 text-primary" />
                                            {editEmployee.employeeId}
                                        </span>
                                    )}
                                    {editEmployee.department && (
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-accent" />
                                            {editEmployee.department}
                                        </span>
                                    )}
                                    {editEmployee.location && (
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                            {editEmployee.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Individual Leave Types Editor */}
                        <div className="rounded-xl border border-border/60 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border/50">
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground-tertiary">
                                            Leave Type
                                        </th>
                                        <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-foreground-tertiary">
                                            Used
                                        </th>
                                        <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-foreground-tertiary">
                                            Balance / Quota
                                        </th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-foreground-tertiary">
                                            Available
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {editEmployee.balances.length > 0 ? (
                                        editEmployee.balances.map((item) => {
                                            const rawVal = editValues[item.name] ?? "0";
                                            const numVal = rawVal !== "" && !isNaN(Number(rawVal)) ? Math.max(0, Number(rawVal)) : 0;
                                            const liveAvail = item.isPaid
                                                ? Math.max(0, Number((numVal - item.used).toFixed(2)))
                                                : null;

                                            return (
                                                <tr key={item.leaveTypeId || item.code} className="hover:bg-muted/10">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-foreground text-sm">
                                                            {item.name}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-black uppercase text-foreground-tertiary border border-border/50">
                                                                {item.code}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    "px-1.5 py-0.5 rounded text-[10px] font-black uppercase",
                                                                    item.isPaid
                                                                        ? "bg-primary/10 text-primary"
                                                                        : "bg-muted text-foreground-tertiary"
                                                                )}
                                                            >
                                                                {item.isPaid ? "Paid" : "Unpaid"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-foreground-secondary">
                                                        {item.used}
                                                        {item.pending > 0 && (
                                                            <div className="text-[10px] text-warning font-bold">
                                                                ({item.pending} pend.)
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            min="0"
                                                            aria-label={`${item.name} balance`}
                                                            value={rawVal}
                                                            onChange={(e) => handleValueChange(item.name, e.target.value)}
                                                            disabled={isSavingModal}
                                                            className="w-24 px-3 py-1.5 rounded-xl border border-border bg-surface text-foreground font-black text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {item.isPaid ? (
                                                            <span
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-xs font-black border inline-block",
                                                                    (liveAvail ?? 0) > 0
                                                                        ? "bg-primary/10 text-primary border-primary/20"
                                                                        : "bg-error/10 text-error border-error/20"
                                                                )}
                                                            >
                                                                {liveAvail} Days
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-foreground-tertiary">
                                                                Unpaid
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-xs text-foreground-tertiary">
                                                No active leave types configured.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Live Summary */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-bold">
                            <span className="text-foreground-secondary">
                                Total Paid Quota: <strong className="text-foreground text-sm">{modalTotals.totalQuota} Days</strong>
                            </span>
                            <span className="text-foreground-secondary">
                                Total Used: <strong className="text-foreground text-sm">{modalTotals.totalUsed} Days</strong>
                            </span>
                            <span className="text-primary">
                                Total Available: <strong className="text-sm">{modalTotals.totalAvailable} Days</strong>
                            </span>
                        </div>

                        <ModalFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditModalOpen(false)}
                                disabled={isSavingModal}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="edit-leave-balances-form"
                                onClick={(e) => {
                                    if (isSavingModal) return;
                                    handleSaveBalances(e);
                                }}
                                variant="default"
                                disabled={isSavingModal}
                                startIcon={<Save className="w-4 h-4" />}
                            >
                                {isSavingModal ? "Saving..." : "Save Balances"}
                            </Button>
                        </ModalFooter>
                    </form>
                ) : null}
            </Modal>
        </div>
    );
};

export default LeaveBalances;
