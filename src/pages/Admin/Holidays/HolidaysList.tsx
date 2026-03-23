import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Edit,
    Calendar,
    CheckCircle2,
    XCircle,
    Trash2,
    Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "../../../utils/dateUtils";
import { cn } from "../../../lib/utils";
import Button from "../../../components/common/Button";
import Table from "../../../components/common/Table";
import { holidayService } from "../../../services/holidayService";
import type { Holiday, OrganizationFilters, HolidayInput } from "../../../types/organization.types";
import EmptyState from "../../../components/common/EmptyState/EmptyState";
import { useDebounce } from "../../../hooks/useDebounce";
import { useConfirmation } from "../../../hooks/useConfirmation";
import Modal from "../../../components/common/Modal/Modal";
import HolidayForm from "./HolidayForm";
import UnifiedFilter from "../../../components/common/Filter/UnifiedFilter";
import Pagination from "../../../components/common/Pagination";
import { SearchInput } from "../../../components/common/Search/SearchInput";
import { getErrorMessage } from "../../../utils/errorHandling";

const HolidaysList: React.FC = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [yearFilter, setYearFilter] = useState<string>("all");
    const [hasData, setHasData] = useState(true); // Track if any data exists
    const [error, setError] = useState<string | string[] | null>(null);

    const { confirm, ConfirmationDialog } = useConfirmation();

    // Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHoliday, setCurrentHoliday] = useState<Partial<Holiday> | null>(null);

    const fetchHolidays = useCallback(async (currentPage: number) => {
        try {
            setLoading(true);
            const filters: OrganizationFilters = {
                page: currentPage,
                limit,
                search: debouncedSearchTerm || undefined,
                isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
                month: monthFilter !== "all" ? monthFilter : undefined,
                year: yearFilter !== "all" ? yearFilter : undefined,
            };
            const response = await holidayService.getAll(filters);
            setHolidays(response.data);
            setTotalPages(response.totalPages);

            // Only disable search if there's no data AND no active filters/search
            const hasActiveFilters = debouncedSearchTerm || statusFilter !== "all";
            if (!hasActiveFilters && response.total === 0) {
                setHasData(false);
            } else if (response.total > 0) {
                setHasData(true);
            }
        } catch (error) {
            console.error("Failed to fetch holidays:", error);
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    }, [debouncedSearchTerm, statusFilter, monthFilter, yearFilter, limit]);

    useEffect(() => {
        fetchHolidays(1);
        setPage(1);
    }, [fetchHolidays]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchHolidays(newPage);
    };

    const handleToggleStatus = async (holiday: Holiday) => {
        const action = holiday.isActive ? "deactivate" : "activate";
        const confirmed = await confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Holiday`,
            message: `Are you sure you want to ${action} "${holiday.name}"?`,
            confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
            variant: holiday.isActive ? 'danger' : 'info'
        });

        if (confirmed) {
            try {
                await holidayService.update(holiday._id, { isActive: !holiday.isActive });
                fetchHolidays(page);
            } catch (error) {
                console.error(`Failed to ${action} holiday:`, error);

                const errorMessage = getErrorMessage(error, `Failed to ${action} holiday`);
                alert(errorMessage);
            }
        }
    };

    const handleDelete = async (holiday: Holiday) => {
        const confirmed = await confirm({
            title: 'Delete Holiday',
            message: `Are you sure you want to PERMANENTLY delete "${holiday.name}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger'
        });

        if (confirmed) {
            try {
                await holidayService.delete(holiday._id);
                fetchHolidays(page);
            } catch (error) {
                console.error(`Failed to delete holiday:`, error);

                const errorMessage = getErrorMessage(error, "Failed to delete holiday");
                alert(errorMessage);
            }
        }
    };

    const handleEdit = (holiday: Holiday) => {
        setCurrentHoliday(holiday);
        setError(null);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setCurrentHoliday({ isActive: true, isRecurring: false });
        setError(null);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (data: HolidayInput) => {
        try {
            setFormLoading(true);
            setError(null);
            if (currentHoliday?._id) {
                await holidayService.update(currentHoliday._id, data);
            } else {
                await holidayService.create(data);
            }
            setIsModalOpen(false);
            fetchHolidays(page);
        } catch (error) {
            console.error("Failed to save holiday:", error);

            const errorMessage = getErrorMessage(error, "Failed to save holiday.");
            setError(errorMessage);
        } finally {
            setFormLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(parseLocalDate(dateString), "MMM d, yyyy");
        } catch {
            return dateString;
        }
    };

    const getWeekday = (dateString: string) => {
        try {
            return format(parseLocalDate(dateString), "EEEE");
        } catch {
            return "";
        }
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = [
        { value: "all", label: "All Years" },
        ...Array.from({ length: 10 }, (_, i) => {
            const y = (currentYear - 2 + i).toString();
            return { value: y, label: y };
        })
    ];

    const monthOptions = [
        { value: "all", label: "All Months" },
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ];

    const columns = [
        {
            _id: "name",
            label: "Holiday Name",
            format: (_: unknown, row: Holiday) => (
                <div className="flex items-center gap-4 py-1">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shadow-primary/5">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="font-black text-foreground text-base tracking-tight">{row.name}</div>
                        {/* <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest bg-muted px-2 py-0.5 rounded-lg border border-border/50 w-fit mt-1">
                            ID: {row._id.slice(-6).toUpperCase()}
                        </div> */}
                    </div>
                </div>
            ),
        },
        {
            _id: "date",
            label: "Date",
            format: (_: unknown, row: Holiday) => (
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-0.5">
                        {getWeekday(row.date)}
                    </span>
                    <span className="text-foreground font-bold text-sm">
                        {formatDate(row.date)}
                    </span>
                    {row.isRecurring && (
                        <div className="flex items-center gap-1 mt-1 text-primary">
                            <Repeat className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Annual</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            _id: "description",
            label: "Description",
            format: (value: unknown) => (
                <span className="text-foreground-secondary text-xs line-clamp-1 max-w-xs">
                    {typeof value === 'string' ? value : "No description provided"}
                </span>
            ),
        },
        {
            _id: "status",
            label: "Status",
            format: (_: unknown, row: Holiday) => (
                <span
                    className={cn(
                        "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all",
                        row.isActive
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted text-foreground-tertiary border-border"
                    )}
                >
                    {row.isActive ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            _id: "actions",
            label: "Actions",
            align: "right" as const,
            format: (_: unknown, row: Holiday) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary/10 hover:text-primary text-foreground-secondary transition-all"
                        title="Edit Holiday"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleToggleStatus(row)}
                        className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                            row.isActive ? "hover:bg-warning/10 hover:text-warning" : "hover:bg-success/10 hover:text-success",
                            "text-foreground-secondary"
                        )}
                        title={row.isActive ? "Deactivate" : "Activate"}
                    >
                        {row.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error/10 hover:text-error text-foreground-secondary transition-all"
                        title="Delete Holiday"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (isInitialLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground-tertiary">Loading Holidays...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in mt-6 fade-in duration-700 max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">Holidays</h1>
                    <p className="text-foreground-tertiary mt-2 flex items-center gap-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Manage organizational holidays and observances.
                    </p>
                </div>
                <Button
                    onClick={handleAdd}
                    startIcon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
                >
                    Add Holiday
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <div className="lg:col-span-2">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search holidays..."
                        disabled={!hasData}
                        className={!hasData ? "opacity-50 cursor-not-allowed bg-muted/30" : ""}
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
                                    { value: "active", label: "Active Only" },
                                    { value: "inactive", label: "Inactive Only" },
                                ]
                            },
                            {
                                id: "month",
                                label: "Month",
                                value: monthFilter,
                                onChange: setMonthFilter,
                                options: monthOptions
                            },
                            {
                                id: "year",
                                label: "Year",
                                value: yearFilter,
                                onChange: setYearFilter,
                                options: yearOptions
                            }
                        ]}
                    />
                </div>
            </div>

            <div className="bg-surface rounded-xl sm:rounded-xl border border-border/40 shadow-2xl shadow-primary/5 overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing Calendar...</p>
                    </div>
                )}
                <Table
                    columns={columns}
                    rows={holidays}
                    className="border-none"
                    emptyState={
                        <EmptyState
                            title="No Holidays Found"
                            description={searchTerm ? `No holidays matching "${searchTerm}" found.` : "Add your first holiday to populate the calendar."}
                            className="py-24"
                        />
                    }
                />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4">
                    <div className="px-5 py-2.5 rounded-2xl bg-muted/50 border border-border/30 text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                        Page <span className="text-primary">{page}</span> of {totalPages || 1}
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

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentHoliday?._id ? "Edit Holiday" : "Add Holiday"}
                maxWidth="md"
            >
                <HolidayForm
                    initialValues={currentHoliday || {}}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    isLoading={formLoading}
                    error={error}
                />
            </Modal>
            {ConfirmationDialog}
        </div >
    );
};

export default HolidaysList;
