import React from "react";
import type { Payslip } from "../../../services/payrollService";
import { Calendar, User as UserIcon, Hash, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../../lib/utils";

interface PayslipDetailsViewProps {
  payslip: Payslip;
}

const PayslipDetailsView: React.FC<PayslipDetailsViewProps> = ({ payslip }) => {
  const employee = typeof payslip.employeeId === 'object' ? (payslip.employeeId as any) : null;
  const earnings = payslip.items.filter(i => i.type === 'ALLOWANCE');
  const deductions = payslip.items.filter(i => i.type === 'DEDUCTION');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <UserIcon className="w-8 h-8" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black text-foreground tracking-tight">
            {employee ? `${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}` : "Unknown User"}
          </h3>
          <div className="flex items-center gap-4 mt-1">
             <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground-tertiary bg-muted px-2 py-0.5 rounded-lg border border-border/50">
               <Calendar className="w-3 h-3" /> {payslip.month}/{payslip.year}
             </div>
             <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground-tertiary bg-muted px-2 py-0.5 rounded-lg border border-border/50">
               <Hash className="w-3 h-3" /> ID: {payslip._id.slice(-6).toUpperCase()}
             </div>
             <span className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                payslip.status === 'FINALIZED' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
             )}>
                {payslip.status}
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border/50 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-tertiary mb-1">Gross Earnings</div>
              <div className="text-2xl font-black text-foreground">₹{payslip.grossEarnings.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border/50 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-tertiary mb-1">Total Deductions</div>
              <div className="text-2xl font-black text-error">₹{payslip.totalDeductions.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 border border-primary">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-white">Net Payable</div>
              <div className="text-2xl font-black">₹{payslip.netPay.toLocaleString()}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground-tertiary">Earnings & Allowances</h4>
              </div>
              <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-sm font-bold text-foreground">Monthly CTC (Reference)</span>
                      <span className="text-sm font-black text-foreground">₹{(payslip.monthlyCTC || (payslip as any).basicSalary || 0).toLocaleString()}</span>
                  </div>
                  {earnings.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/30">
                          <span className="text-sm font-medium text-foreground-secondary">{item.name}</span>
                          <span className="text-sm font-black text-foreground">₹{item.amount.toLocaleString()}</span>
                      </div>
                  ))}
              </div>
          </div>

          <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                  <TrendingDown className="w-4 h-4 text-error" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground-tertiary">Deductions</h4>
              </div>
              <div className="space-y-2">
                  {deductions.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border/50 text-center text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                          No Deductions Applied
                      </div>
                  ) : deductions.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-error/5 border border-error/10">
                          <span className="text-sm font-medium text-error flex items-center gap-2">
                            {item.name}
                          </span>
                          <span className="text-sm font-black text-error">₹{item.amount.toLocaleString()}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 grid grid-cols-3 gap-4">
          <div className="text-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-foreground-tertiary mb-1">Month Days</div>
              <div className="text-sm font-black text-foreground">{payslip.totalDays}</div>
          </div>
          <div className="text-center border-x border-border/50">
              <div className="text-[9px] font-black uppercase tracking-widest text-foreground-tertiary mb-1">Paid Days</div>
              <div className="text-sm font-black text-success">{payslip.daysWorked}</div>
          </div>
          <div className="text-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-foreground-tertiary mb-1">LOP Days</div>
              <div className="text-sm font-black text-error">{payslip.lopDays}</div>
          </div>
      </div>
    </div>
  );
};

export default PayslipDetailsView;
