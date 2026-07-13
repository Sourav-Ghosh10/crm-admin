import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Edit,
    GitBranch,
    CheckCircle2,
    XCircle,
    Trash2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import Button from "../../../components/common/Button";
import Table from "../../../components/common/Table";
import { departmentService } from "../../../services/departmentService";
import type { Department, OrganizationFilters, DepartmentInput } from "../../../types/organization.types";
import EmptyState from "../../../components/common/EmptyState/EmptyState";
import { useDebounce } from "../../../hooks/useDebounce";
import { useConfirmation } from "../../../hooks/useConfirmation";
import Modal from "../../../components/common/Modal/Modal";
import DepartmentForm from "./DepartmentForm";
import FilterDropdown from "../../../components/common/Filter/FilterDropdown";
import { SearchInput } from "../../../components/common/Search/SearchInput";
import Pagination from "../../../components/common/Pagination";
import { getErrorMessage } from "../../../utils/errorHandling";

const DepartmentsList: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [hasData, setHasData] = useState(true); // Track if any data exists
    const [error, setError] = useState<string | string[] | null>(null);

    const { confirm, ConfirmationDialog } = useConfirmation();

    // Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Partial<Department> | null>(null);

    const fetchDepartments = useCallback(async (currentPage: number) => {
        try {
            setLoading(true);
            const filters: OrganizationFilters = {
                page: currentPage,
                limit,
                search: debouncedSearchTerm || undefined,
                isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
            };
            const response = await departmentService.getAll(filters);
            setDepartments(response.data);
            setTotalPages(response.totalPages);

            // Only disable search if there's no data AND no active filters/search
            const hasActiveFilters = debouncedSearchTerm || statusFilter !== "all";
            if (!hasActiveFilters && response.total === 0) {
                setHasData(false);
            } else if (response.total > 0) {
                setHasData(true);
            }
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    }, [debouncedSearchTerm, statusFilter, limit]);

    useEffect(() => {
        fetchDepartments(1);
        setPage(1);
    }, [fetchDepartments]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchDepartments(newPage);
    };

    const handleToggleStatus = async (dept: Department) => {
        const action = dept.isActive ? "deactivate" : "activate";

        const confirmed = await confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Department`,
            message: `Are you sure you want to ${action} "${dept.name}"?`,
            confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
            variant: dept.isActive ? 'danger' : 'info'
        });

        if (confirmed) {
            try {
                await departmentService.update(dept._id, { isActive: !dept.isActive });
                fetchDepartments(page);
            } catch (error) {
                console.error(`Failed to ${action} department: `, error);

                const errorMessage = getErrorMessage(error, `Failed to ${action} department`);
                alert(errorMessage);
            }
        }
    };

    const handleDelete = async (dept: Department) => {
        const confirmed = await confirm({
            title: 'Delete Department',
            message: `Are you sure you want to PERMANENTLY delete "${dept.name}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger'
        });

        if (confirmed) {
            try {
                await departmentService.delete(dept._id);
                fetchDepartments(page);
            } catch (error) {
                console.error(`Failed to delete department: `, error);

                const errorMessage = getErrorMessage(error, "Failed to delete department");
                alert(errorMessage);
            }
        }
    };

    const handleEdit = (dept: Department) => {
        setCurrentDepartment(dept);
        setError(null);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setCurrentDepartment({ isActive: true });
        setError(null);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (data: DepartmentInput) => {
        try {
            setFormLoading(true);
            setError(null);
            if (currentDepartment?._id) {
                await departmentService.update(currentDepartment._id, data);
            } else {
                await departmentService.create(data);
            }
            setIsModalOpen(false);
            fetchDepartments(page);
        } catch (error) {
            console.error("Failed to save department:", error);

            const errorMessage = getErrorMessage(error, "Failed to save division configuration.");
            setError(errorMessage);
        } finally {
            setFormLoading(false);
        }
    };

    const columns = [
        {
            _id: "name",
            label: "Departments",
            format: (_: unknown, row: Department) => (
                <div className="flex items-center gap-4 py-1">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shadow-primary/5">
                        <GitBranch className="w-6 h-6" />
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
            _id: "description",
            label: "Description",
            format: (value: unknown) => (
                <span className="text-foreground-secondary text-xs line-clamp-1 max-w-xs">
                    {typeof value === 'string' ? value : "No description provided"}
                </span>
            ),
        },
        // {
        //     _id: "count",
        //     label: "Manpower",
        //     format: (_: unknown, row: Department) => (
        //         <div className="flex items-center gap-2">
        //             <div className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-xl flex items-center gap-2">
        //                 <Users className="w-3.5 h-3.5 text-primary" />
        //                 <span className="text-sm font-black text-primary">{row.employeeCount || 0}</span>
        //             </div>
        //         </div>
        //     ),
        // },
        {
            _id: "status",
            label: "Status",
            format: (_: unknown, row: Department) => (
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
            format: (_: unknown, row: Department) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary/10 hover:text-primary text-foreground-secondary transition-all"
                        title="Edit Department"
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
                        title="Delete Department"
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
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground-tertiary">Accessing Division Matrix...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in mt-6 fade-in duration-700 max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">Departments</h1>
                    <p className="text-foreground-tertiary mt-2 flex items-center gap-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Manage your organizational divisions and core teams.
                    </p>
                </div>
                <Button
                    onClick={handleAdd}
                    startIcon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
                >
                    Add Department
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search departments..."
                        disabled={!hasData}
                        className={!hasData ? "opacity-50 cursor-not-allowed bg-muted/30" : ""}
                    />
                </div>

                <FilterDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className="h-[42px] rounded-2xl border-border/50 font-black text-xs uppercase tracking-widest"
                    options={[
                        { value: "all", label: "All Status" },
                        { value: "active", label: "Active Only" },
                        { value: "inactive", label: "Inactive Only" },
                    ]}
                />
            </div>

            <div className="bg-surface rounded-xl sm:rounded-xl border border-border/40 shadow-2xl shadow-primary/5 overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing Structural Matrix...</p>
                    </div>
                )}
                <Table
                    columns={columns}
                    rows={departments}
                    className="border-none"
                    emptyState={
                        <EmptyState
                            title="Negative Data Flux"
                            description={searchTerm ? `The sector "${searchTerm}" cannot be detected.` : "Initialize your first division to expand the structural matrix."}
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
                title={currentDepartment?._id ? "Adjust Division Parameters" : "Initialize Structural Division"}
                maxWidth="md"
            >
                <DepartmentForm
                    initialValues={currentDepartment || {}}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    isLoading={formLoading}
                    error={error}
                />
            </Modal>
            {ConfirmationDialog}
        </div>
    );
};

export default DepartmentsList;
