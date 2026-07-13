import React, { useState, useEffect, useCallback } from "react";
import {
  Edit,
  Trash2,
  Calendar,
  User as UserIcon,
  CreditCard,
  History,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import Table from "../../../components/common/Table";
import payrollService, { type SalaryConfig, type AllowanceDeductionMaster } from "../../../services/payrollService";
import { userService } from "../../../services/userService";
import EmptyState from "../../../components/common/EmptyState/EmptyState";
import { useConfirmation } from "../../../hooks/useConfirmation";
import Modal from "../../../components/common/Modal/Modal";
import SalaryConfigForm from "./SalaryConfigForm";
import FilterDropdown from "../../../components/common/Filter/FilterDropdown";
import Pagination from "../../../components/common/Pagination";
import { getErrorMessage } from "../../../utils/errorHandling";
import { usePermissions } from "../../../hooks/usePermissions";
import { PERMISSIONS } from "../../../config/permissions";
import { format } from "date-fns";

const SalaryConfigList: React.FC = () => {
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { confirm, ConfirmationDialog } = useConfirmation();

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Partial<SalaryConfig> | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);

  const { hasPermission: canManage } = usePermissions(PERMISSIONS.PAYROLL_MANAGE);

  const fetchConfigs = useCallback(
    async (currentPage: number) => {
      try {
        setLoading(true);
        // 1. Fetch paginated active users (employees)
        const userResponse = await userService.getAll({
          page: currentPage,
          limit,
          isActive: true,
        });

        const users = userResponse.users || [];
        setTotalPages(userResponse.totalPages || 1);

        if (users.length === 0) {
          setConfigs([]);
          return;
        }

        // 2. Extract employee IDs
        const employeeIds = users.map(u => u._id).join(',');

        // 3. Fetch active configs for these employees
        const configResponse = await payrollService.getSalaryConfigs({
          limit: 100, // Fetch all configs for these users
          employeeIds,
          isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
        });

        const configsData = configResponse.data || [];

        // 4. Map configs back to users. If no config exists, create a dummy "UNSET" one
        const mergedConfigs: any[] = users.map(user => {
          // Find if user has a config
          const userConfig = configsData.find((c: any) => 
            (typeof c.employeeId === 'object' ? c.employeeId._id : c.employeeId) === user._id
          );

          if (userConfig) {
            // Replace the populated employeeId with the full user object from our users array
            return {
              ...userConfig,
              employeeId: user
            };
          } else {
            // Return dummy "UNSET" config structure
            return {
              _id: `unset-${user._id}`,
              employeeId: user,
              monthlyCTC: 0,
              effectiveFrom: null,
              isActive: false,
              items: [],
              isUnset: true
            };
          }
        });

        // If filtering by active/inactive configs, we might want to hide users? 
        // But the user requested "all employee name show here".
        // Let's just show all employees. If statusFilter is active, it only fetches active configs.
        setConfigs(mergedConfigs);
        
      } catch (error) {
        console.error("Failed to fetch salary configs:", error);
      } finally {
        setLoading(false);
        setIsInitialLoading(false);
      }
    },
    [statusFilter, limit]
  );

  useEffect(() => {
    fetchConfigs(1);
    setPage(1);
  }, [fetchConfigs]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchConfigs(newPage);
  };


  const handleEdit = (config: SalaryConfig) => {
    setCurrentConfig(config);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsFormLoading(true);
      setFormError(null);
      if (currentConfig?._id) {
        await payrollService.updateSalaryConfig(currentConfig._id, data);
      } else {
        await payrollService.createSalaryConfig(data);
      }
      setIsModalOpen(false);
      fetchConfigs(page);
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to save configuration");
      setFormError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDelete = async (config: SalaryConfig) => {
    const confirmed = await confirm({
      title: "Delete Configuration",
      message: `Are you sure you want to delete this salary configuration?`,
      confirmLabel: "Delete",
      variant: "danger",
    });

    if (confirmed) {
      try {
        await payrollService.deleteSalaryConfig(config._id);
        fetchConfigs(page);
      } catch (error) {
        const errorMessage = getErrorMessage(error, "Failed to delete configuration");
        alert(errorMessage);
      }
    }
  };

  const columns = [
    {
      _id: "employee",
      label: "Employee",
      format: (_: unknown, row: SalaryConfig) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shadow-primary/5">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-foreground text-base tracking-tight flex items-center gap-2">
              {typeof row.employeeId === 'object' 
                ? `${(row.employeeId as any).personalInfo?.firstName} ${(row.employeeId as any).personalInfo?.lastName}` 
                : "Unknown User"}
              {typeof row.employeeId === 'object' && (row.employeeId as any).employment?.employmentType && (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                  {(row.employeeId as any).employment.employmentType}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest bg-muted px-2 py-0.5 rounded-lg border border-border/50 w-fit">
                ID: {typeof row.employeeId === 'object' && (row.employeeId as any).employeeId ? (row.employeeId as any).employeeId : row._id.slice(-6).toUpperCase()}
              </div>
              {(row.uanNumber || (typeof row.employeeId === 'object' && (row.employeeId as any).employment?.uanNumber)) && (
                <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest bg-muted px-2 py-0.5 rounded-lg border border-border/50 w-fit">
                  UAN: {row.uanNumber || (row.employeeId as any).employment?.uanNumber}
                </div>
              )}
              {(row.esiNumber || (typeof row.employeeId === 'object' && (row.employeeId as any).employment?.esiNumber)) && (
                <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest bg-muted px-2 py-0.5 rounded-lg border border-border/50 w-fit">
                  ESI: {row.esiNumber || (row.employeeId as any).employment?.esiNumber}
                </div>
              )}
              {(row.bankName || (typeof row.employeeId === 'object' && (row.employeeId as any).employment?.bankName)) && (
                <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest bg-muted px-2 py-0.5 rounded-lg border border-border/50 w-fit">
                  {row.bankName || (row.employeeId as any).employment?.bankName} - {row.bankAccountNo || (row.employeeId as any).employment?.bankAccountNo || 'N/A'}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      _id: "monthlyCTC",
      label: "Monthly (CTC)",
      format: (val: any, row: any) => {
        if (row.isUnset) return <span className="text-foreground-tertiary text-lg font-black">—</span>;
        const displayVal = val || row.basicSalary || 0;
        return (
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-success" />
            <span className="font-black text-foreground text-lg">₹{displayVal.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      _id: "effectiveFrom",
      label: "Effective From",
      format: (val: any, row: any) => {
        if (row.isUnset) return <span className="text-foreground-tertiary font-bold">—</span>;
        return (
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Calendar className="w-4 h-4" />
            <span className="font-bold">{format(new Date(val), "dd MMM yyyy")}</span>
          </div>
        );
      }
    },
    {
      _id: "components",
      label: "Components",
      format: (_: unknown, row: any) => {
        if (row.isUnset) return <span className="text-foreground-tertiary font-bold">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {row.items.filter((i: any) => i.isActive).map((item: any, idx: number) => {
              const master = item.masterId as AllowanceDeductionMaster;
              return (
                <span key={idx} className={cn(
                  "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border",
                  (master?.type as string) === 'ALLOWANCE' ? "bg-success/5 text-success border-success/10" : "bg-error/5 text-error border-error/10"
                )}>
                  {master?.code || "???"}: {item.overrideValue != null ? `₹${item.overrideValue}` : 'Default'}
                </span>
              );
            })}
          </div>
        );
      }
    },
    {
      _id: "status",
      label: "Status",
      format: (val: any, row: any) => {
        if (row.isUnset) {
          return (
            <span className="px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border border-warning/20 bg-warning/10 text-warning">
              UNSET
            </span>
          );
        }
        return (
          <span className={cn(
            "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all",
            val ? "bg-success/10 text-success border-success/20" : "bg-muted text-foreground-tertiary border-border"
          )}>
            {val ? "Active" : "Archived"}
          </span>
        );
      }
    },
    {
      _id: "actions",
      label: "Actions",
      align: "right" as const,
      format: (_: unknown, row: any) => {
        if (row.isUnset) {
          return (
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  // Pre-fill the form with this user
                  setCurrentConfig({ isActive: true, employeeId: row.employeeId._id });
                  setFormError(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all"
              >
                Set Salary
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary/10 hover:text-primary text-foreground-secondary transition-all"
            title="Edit Configuration"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error/10 hover:text-error text-foreground-secondary transition-all"
            title="Delete Configuration"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          </div>
        );
      },
    },
  ];

  const displayColumns = canManage ? columns : columns.filter((col) => col._id !== "actions");

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground-tertiary">Accessing Salary Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in mt-6 fade-in duration-700 w-full px-4 lg:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">Salary Configurations</h1>
          <p className="text-foreground-tertiary mt-2 flex items-center gap-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Manage dynamic salary structures and component overrides for employees.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-4 items-center p-4 rounded-[2rem] border border-border/50 bg-surface/50 backdrop-blur-md shadow-sm">
        <div className="flex-1 w-full text-foreground-tertiary font-bold text-sm px-4 flex items-center gap-3">
           <History className="w-5 h-5 opacity-40 text-primary" />
           Salary Structure Records
        </div>

        <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            className="h-[42px] rounded-2xl border-border/50 font-black text-xs uppercase tracking-widest w-full lg:w-[200px]"
            options={[
              { value: "all", label: "All Configs" },
              { value: "active", label: "Active Only" },
              { value: "inactive", label: "Archived Only" },
            ]}
          />
        </div>
      </div>

      <div className="bg-surface rounded-xl sm:rounded-xl border border-border/40 shadow-2xl shadow-primary/5 overflow-hidden relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing Structural Matrix...</p>
          </div>
        )}
        <Table
          columns={displayColumns}
          rows={configs}
          className="border-none"
          emptyState={
            <EmptyState
              title="Negative Data Flux"
              description="No salary configurations detected in the current sector."
              className="py-24"
              icon={<History className="w-12 h-12 text-foreground-tertiary/20" />}
            />
          }
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 pb-8">
        <div className="flex items-center gap-4">
          <div className="px-5 py-2.5 rounded-2xl bg-muted/50 border border-border/30 text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
            Page <span className="text-primary">{page}</span> of {totalPages || 1}
          </div>
        </div>

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentConfig?._id ? "Edit Salary Configuration" : "New Salary Configuration"}
        maxWidth="xl"
      >
        <SalaryConfigForm
          initialValues={currentConfig || {}}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isFormLoading}
          error={formError}
        />
      </Modal>

      {ConfirmationDialog}
    </div>
  );
};

export default SalaryConfigList;
