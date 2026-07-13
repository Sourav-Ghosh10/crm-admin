import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  User as UserIcon,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import Button from "../../../components/common/Button";
import Table from "../../../components/common/Table";
import payrollService from "../../../services/payrollService";
import type { Payslip } from "../../../services/payrollService";
import EmptyState from "../../../components/common/EmptyState/EmptyState";
import { useConfirmation } from "../../../hooks/useConfirmation";
import Modal from "../../../components/common/Modal/Modal";
import GeneratePayslipForm from "./GeneratePayslipForm";
import PayslipDetailsView from "./PayslipDetailsView";
import FilterDropdown from "../../../components/common/Filter/FilterDropdown";
import Pagination from "../../../components/common/Pagination";
import { getErrorMessage } from "../../../utils/errorHandling";
import { usePermissions } from "../../../hooks/usePermissions";
import { PERMISSIONS } from "../../../config/permissions";

const PayslipList: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>(currentMonth.toString());
  const [yearFilter, setYearFilter] = useState<string>(currentYear.toString());

  const { confirm, ConfirmationDialog } = useConfirmation();

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);

  const { hasPermission: canManage } = usePermissions(PERMISSIONS.PAYROLL_MANAGE);

  const fetchPayslips = useCallback(
    async (currentPage: number) => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          limit,
          status: statusFilter !== "all" ? statusFilter : undefined,
          month: monthFilter !== "all" ? Number(monthFilter) : undefined,
          year: yearFilter !== "all" ? Number(yearFilter) : undefined,
        };
        const response = await payrollService.getPayslips(params);
        setPayslips(response.data);
        setTotalPages(response.pagination.pages);
      } catch (error) {
        console.error("Failed to fetch payslips:", error);
      } finally {
        setLoading(false);
        setIsInitialLoading(false);
      }
    },
    [statusFilter, monthFilter, yearFilter, limit]
  );

  useEffect(() => {
    fetchPayslips(1);
    setPage(1);
  }, [fetchPayslips]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchPayslips(newPage);
  };

  const handleGenerateClick = () => {
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGenerateSubmit = async (data: any) => {
    try {
      setIsFormLoading(true);
      setFormError(null);
      await payrollService.generatePayslip(data);
      setIsModalOpen(false);
      fetchPayslips(page);
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to generate payslip");
      setFormError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleUpdateStatus = async (payslip: Payslip, newStatus: string) => {
    const confirmed = await confirm({
      title: "Update Status",
      message: `Are you sure you want to ${newStatus.toLowerCase()} this payslip?`,
      confirmLabel: "Update",
      variant: newStatus === 'CANCELLED' ? 'danger' : 'success'
    });

    if (confirmed) {
      try {
        await payrollService.updatePayslipStatus(payslip._id, newStatus);
        fetchPayslips(page);
      } catch (error) {
        const errorMessage = getErrorMessage(error, "Failed to update status");
        alert(errorMessage);
      }
    }
  };

  const columns = [
    {
      _id: "employee",
      label: "Employee",
      format: (_: unknown, row: Payslip) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-foreground text-base tracking-tight">
              {typeof row.employeeId === 'object'
                ? `${(row.employeeId as any).personalInfo?.firstName} ${(row.employeeId as any).personalInfo?.lastName}`
                : "Unknown User"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest bg-muted px-2 py-0.5 rounded-lg border border-border/50">
                {row.month}/{row.year}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      _id: "summary",
      label: "Earnings",
      format: (_: unknown, row: Payslip) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground-tertiary uppercase">Gross</span>
            <span className="font-black text-foreground text-sm">₹{row.grossEarnings.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground-tertiary uppercase">Net Pay</span>
            <span className="font-black text-success text-sm underline decoration-success/30 underline-offset-4">₹{row.netPay.toLocaleString()}</span>
          </div>
        </div>
      ),
    },
    {
      _id: "attendance",
      label: "Attendance",
      format: (_: unknown, row: Payslip) => (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-tighter">
            Days: {row.daysWorked} / {row.totalDays}
          </span>
          {row.lopDays > 0 && (
            <span className="text-[10px] font-bold text-error uppercase tracking-tighter">
              LOP: {row.lopDays} Days
            </span>
          )}
        </div>
      ),
    },
    {
      _id: "status",
      label: "Status",
      format: (val: any) => (
        <span className={cn(
          "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all flex items-center gap-2 w-fit",
          val === 'FINALIZED' ? "bg-success/10 text-success border-success/20" :
            val === 'DRAFT' ? "bg-warning/10 text-warning border-warning/20" :
              "bg-muted text-foreground-tertiary border-border"
        )}>
          {val === 'FINALIZED' ? <CheckCircle2 className="w-3 h-3" /> :
            val === 'DRAFT' ? <Clock className="w-3 h-3" /> :
              <AlertCircle className="w-3 h-3" />}
          {val}
        </span>
      ),
    },
    {
      _id: "actions",
      label: "Actions",
      align: "right" as const,
      format: (_: unknown, row: Payslip) => (
        <div className="flex items-center justify-end gap-2">
          {row.pdfUrl && (
            <button
              onClick={() => window.open(row.pdfUrl)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/5 hover:bg-primary/20 text-primary transition-all shadow-sm"
              title="Download PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          {canManage && (
            <>
              {row.status === 'DRAFT' && (
                <button
                  onClick={() => handleUpdateStatus(row, 'FINALIZED')}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-success/10 hover:text-success text-foreground-secondary transition-all"
                  title="Finalize Payslip"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedPayslip(row);
                  setIsDetailsModalOpen(true);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary/10 hover:text-primary text-foreground-secondary transition-all"
                title="View Details"
              >
                <FileText className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const displayColumns = canManage ? columns : columns.filter((col) => col._id !== "actions");

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground-tertiary">Accessing Remuneration Log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in mt-6 fade-in duration-700 max-w-7xl mx-auto px-4 lg:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">Monthly Payslips</h1>
          <p className="text-foreground-tertiary mt-2 flex items-center gap-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Track, generate and manage monthly employee remuneration records.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleGenerateClick} startIcon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}>
            Generate Payslips
          </Button>
        )}
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-4 items-center p-4 rounded-[2rem] border border-border/50 bg-surface/50 backdrop-blur-md shadow-sm">
        <div className="flex-1 w-full text-foreground-tertiary font-bold text-sm px-4 flex items-center gap-3">
          <FileText className="w-5 h-5 opacity-40 text-primary" />
          Historical Disbursement Matrix
        </div>

        <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <FilterDropdown
            value={monthFilter}
            onChange={setMonthFilter}
            className="h-[42px] rounded-2xl border-border/50 font-black text-xs uppercase tracking-widest w-full lg:w-[150px]"
            options={[
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
            ]}
          />
          <FilterDropdown
            value={yearFilter}
            onChange={setYearFilter}
            className="h-[42px] rounded-2xl border-border/50 font-black text-xs uppercase tracking-widest w-full lg:w-[130px]"
            options={[
              { value: "all", label: "All Years" },
              ...Array.from({ length: 5 }).map((_, i) => ({
                value: String(currentYear - 2 + i),
                label: String(currentYear - 2 + i)
              })).reverse()
            ]}
          />
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            className="h-[42px] rounded-2xl border-border/50 font-black text-xs uppercase tracking-widest w-full lg:w-[200px]"
            options={[
              { value: "all", label: "All Status" },
              { value: "DRAFT", label: "Drafts" },
              { value: "FINALIZED", label: "Finalized" },
              { value: "CANCELLED", label: "Cancelled" },
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
          rows={payslips}
          className="border-none"
          emptyState={
            <EmptyState
              title="Negative Remuneration Flux"
              description="No disbursement records found for the period."
              className="py-24"
              icon={<Clock className="w-12 h-12 text-foreground-tertiary/20" />}
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
        title="Generate Monthly Payslip"
        maxWidth="xl"
      >
        <GeneratePayslipForm
          onSubmit={handleGenerateSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isFormLoading}
          error={formError}
        />
      </Modal>

      <Modal
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Payslip Breakdown"
        maxWidth="lg"
      >
        {selectedPayslip && <PayslipDetailsView payslip={selectedPayslip} />}
      </Modal>

      {ConfirmationDialog}
    </div>
  );
};

export default PayslipList;
