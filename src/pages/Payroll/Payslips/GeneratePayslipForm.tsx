import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Select from "../../../components/common/Select";
import { userService } from "../../../services/userService";
import systemSettingsService from "../../../services/systemSettingsService";
import payrollService from "../../../services/payrollService";
import { getPayrollCycleInterval } from "../../../utils/payrollCycleUtils";
import type { User } from "../../../types/user.types";
import { Calendar, User as UserIcon, Clock, Hash, AlertTriangle, Edit2, Check, X, RefreshCw, Layers, DollarSign } from "lucide-react";

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  totalDays: z.number().min(1, "Total days must be at least 1"),
  daysWorked: z.number().min(0, "Days worked cannot be negative"),
  lopDays: z.number().min(0)
});

type FormData = z.infer<typeof schema>;

interface GeneratePayslipFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | string[] | null;
}

const GeneratePayslipForm: React.FC<GeneratePayslipFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  error
}) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [cycleSettings, setCycleSettings] = useState({ startDay: 1, endDay: 31 });
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // New Fields State
  const [stacks, setStacks] = useState<{ name: string; value: number }[]>([]);
  const [selectedStackName, setSelectedStackName] = useState("");
  const [incentiveAmount, setIncentiveAmount] = useState<number | "">("");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: "",
      month: currentMonth,
      year: currentYear,
      totalDays: 30,
      daysWorked: 30,
      lopDays: 0
    }
  });

  const onFormSubmit = (values: FormData) => {
    const additionalEarnings = [];
    if (selectedStackName) {
      const stack = stacks.find(s => s.name === selectedStackName);
      if (stack) additionalEarnings.push({ name: `${stack.name} Stack`, amount: stack.value, code: 'STACK' });
    }
    if (incentiveAmount && Number(incentiveAmount) > 0) {
      additionalEarnings.push({ name: 'Incentive', amount: Number(incentiveAmount), code: 'INCENTIVE' });
    }
    onSubmit({ ...values, manualOverrides, additionalEarnings });
  };

  const selectedMonth = watch("month");
  const selectedYear = watch("year");
  const selectedEmployeeId = watch("employeeId");
  const totalDays = watch("totalDays");
  const lopDays = watch("lopDays");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);
        const [empRes, cycleRes, stacksRes] = await Promise.all([
          userService.getAll({ limit: 100, isActive: true }),
          systemSettingsService.getSettingByKey("payroll_cycle_settings").catch(() => null),
          systemSettingsService.getSettingByKey("system_stacks").catch(() => null)
        ]);

        setEmployees(empRes.users);
        if (cycleRes && cycleRes.value) {
          setCycleSettings({
            startDay: Number(cycleRes.value.startDay || 1),
            endDay: Number(cycleRes.value.endDay || 31)
          });
        }
        if (stacksRes && Array.isArray(stacksRes.value)) {
          setStacks(stacksRes.value);
        }
      } catch (err) {
        console.error("Failed to fetch page data:", err);
      } finally {
        setFetchingData(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-calculate total days based on month and year, respecting payroll cycle
    if (selectedMonth && selectedYear) {
      const baseDate = new Date(selectedYear, selectedMonth - 1, 15);
      const interval = getPayrollCycleInterval(baseDate, cycleSettings);
      
      const start = new Date(interval.startDate.getFullYear(), interval.startDate.getMonth(), interval.startDate.getDate());
      const end = new Date(interval.endDate.getFullYear(), interval.endDate.getMonth(), interval.endDate.getDate());
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      setValue("totalDays", diffDays);
      setValue("daysWorked", diffDays);
      setValue("lopDays", 0);
    }
  }, [selectedMonth, selectedYear, cycleSettings, setValue]);

  useEffect(() => {
    // Auto-calculate days worked based on total days and LOP
    const daysWorked = Math.max(0, totalDays - lopDays);
    setValue("daysWorked", daysWorked);
  }, [totalDays, lopDays, setValue]);

  useEffect(() => {
    if (!selectedEmployeeId || !selectedMonth || !selectedYear || !totalDays) return;

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        const additionalEarnings = [];
        if (selectedStackName) {
          const stack = stacks.find(s => s.name === selectedStackName);
          if (stack) additionalEarnings.push({ name: `${stack.name} Stack`, amount: stack.value, code: 'STACK' });
        }
        if (incentiveAmount && Number(incentiveAmount) > 0) {
          additionalEarnings.push({ name: 'Incentive', amount: Number(incentiveAmount), code: 'INCENTIVE' });
        }

        const data = await payrollService.previewPayslip({
          employeeId: selectedEmployeeId,
          month: selectedMonth,
          year: selectedYear,
          totalDays: totalDays,
          daysWorked: Math.max(0, totalDays - lopDays),
          lopDays: lopDays,
          manualOverrides,
          additionalEarnings
        });
        setPreviewData(data.data);
      } catch (err) {
        console.error("Failed to fetch preview:", err);
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedEmployeeId, selectedMonth, selectedYear, totalDays, lopDays, manualOverrides, selectedStackName, incentiveAmount, stacks]);

  const handleSaveOverride = (masterId: string) => {
    setManualOverrides(prev => ({
      ...prev,
      [masterId]: editValue
    }));
    setEditingComponent(null);
  };

  const handleClearOverride = (masterId: string) => {
    setManualOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[masterId];
      return newOverrides;
    });
  };

  if (fetchingData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">Accessing Employee Registry...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-top-2 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
             {Array.isArray(error) ? (
                <ul className="list-disc list-inside">
                  {error.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              ) : error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
            <Select
                label="Select Employee"
                value={selectedEmployeeId}
                onChange={(val) => setValue("employeeId", val)}
                options={employees.map(e => ({
                    value: e._id,
                    label: `${e.personalInfo.firstName} ${e.personalInfo.lastName} (${e.employeeId})`
                }))}
                error={!!errors.employeeId}
                helperText={errors.employeeId?.message}
                startIcon={<UserIcon className="w-4 h-4" />}
                required
                searchable
            />
        </div>

        <Select
          label="Month"
          value={String(selectedMonth)}
          onChange={(val) => setValue("month", parseInt(val))}
          options={[
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
          startIcon={<Calendar className="w-4 h-4" />}
          required
        />

        <Input
          label="Year"
          type="number"
          {...register("year", { valueAsNumber: true })}
          error={!!errors.year}
          helperText={errors.year?.message}
          startAdornment={<Calendar className="w-4 h-4" />}
          required
        />

        <div className="md:col-span-2 grid grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <Input
                label="Month Days"
                type="number"
                {...register("totalDays", { valueAsNumber: true })}
                error={!!errors.totalDays}
                helperText={errors.totalDays?.message}
                startAdornment={<Hash className="w-4 h-4" />}
                required
            />
            <Input
                label="Days Worked"
                type="number"
                {...register("daysWorked", { valueAsNumber: true })}
                error={!!errors.daysWorked}
                helperText={errors.daysWorked?.message}
                startAdornment={<Clock className="w-4 h-4" />}
                required
            />
            <Input
                label="LOP Days"
                type="number"
                {...register("lopDays", { valueAsNumber: true })}
                error={!!errors.lopDays}
                helperText={errors.lopDays?.message}
                startAdornment={<AlertTriangle className="w-4 h-4 text-warning" />}
                required
            />
        </div>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                label="Select Stack"
                value={selectedStackName}
                onChange={setSelectedStackName}
                options={[
                    { value: "", label: "None" },
                    ...stacks.map(s => ({
                        value: s.name,
                        label: `${s.name} (₹${s.value})`
                    }))
                ]}
                startIcon={<Layers className="w-4 h-4" />}
            />
            <Input
                label="Incentive Amount"
                type="number"
                value={incentiveAmount}
                onChange={(e) => setIncentiveAmount(e.target.value ? Number(e.target.value) : "")}
                startAdornment={<DollarSign className="w-4 h-4 text-success" />}
                placeholder="Optional incentive amount"
                min="0"
            />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">PRO-RATA CALCULATION NOTICE</p>
          <p className="text-[11px] font-medium text-foreground-secondary leading-relaxed">
            Generating this payslip will automatically calculate earnings and deductions based on the employee's active salary configuration and the provided attendance data.
          </p>
      </div>

      {previewData && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Calculated Breakdown</h3>
            {previewLoading && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-xs font-bold text-success uppercase tracking-wider">Earnings</h4>
                <span className="text-sm font-black text-success">₹{previewData.grossEarnings}</span>
              </div>
              <div className="bg-surface border border-border/50 rounded-xl overflow-hidden divide-y divide-border/50">
                {previewData.items.filter((i: any) => i.type === 'ALLOWANCE').map((item: any) => (
                  <div key={item.masterId} className="flex flex-col xl:flex-row xl:items-center justify-between p-3 text-sm gap-3">
                    <div className="font-medium text-foreground-secondary flex items-center gap-2 min-w-0 w-full xl:w-auto">
                      <span className="truncate">{item.name}</span>
                      {item.isManualOverride && item.masterId && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary uppercase tracking-wider">Overridden</span>
                      )}
                    </div>
                    <div className="flex items-center xl:justify-end gap-2 shrink-0 w-full xl:w-auto">
                      {editingComponent && editingComponent === item.masterId ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 text-xs border border-primary rounded-md bg-transparent focus:outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            autoFocus
                          />
                          <button type="button" onClick={() => handleSaveOverride(item.masterId)} className="p-1 hover:bg-success/10 text-success rounded">
                            <Check className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => setEditingComponent(null)} className="p-1 hover:bg-error/10 text-error rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold">₹{item.amount}</span>
                          {item.masterId && (
                            <div className="flex items-center gap-1">
                              <button 
                                type="button" 
                                onClick={() => { setEditingComponent(item.masterId); setEditValue(item.amount); }}
                                className="p-1 text-foreground-tertiary hover:text-primary transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {item.isManualOverride && (
                                <button 
                                  type="button" 
                                  onClick={() => handleClearOverride(item.masterId)}
                                  className="p-1 text-error/60 hover:text-error transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-xs font-bold text-error uppercase tracking-wider">Deductions</h4>
                <span className="text-sm font-black text-error">₹{previewData.totalDeductions}</span>
              </div>
              <div className="bg-surface border border-border/50 rounded-xl overflow-hidden divide-y divide-border/50">
                {previewData.items.filter((i: any) => i.type === 'DEDUCTION').map((item: any) => (
                  <div key={item.masterId} className="flex flex-col xl:flex-row xl:items-center justify-between p-3 text-sm gap-3">
                    <div className="font-medium text-foreground-secondary flex items-center gap-2 min-w-0 w-full xl:w-auto">
                      <span className="truncate">{item.name}</span>
                      {item.isManualOverride && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary uppercase tracking-wider">Overridden</span>
                      )}
                    </div>
                    <div className="flex items-center xl:justify-end gap-2 shrink-0 w-full xl:w-auto">
                      {editingComponent && editingComponent === item.masterId ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 text-xs border border-primary rounded-md bg-transparent focus:outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            autoFocus
                          />
                          <button type="button" onClick={() => handleSaveOverride(item.masterId)} className="p-1 hover:bg-success/10 text-success rounded">
                            <Check className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => setEditingComponent(null)} className="p-1 hover:bg-error/10 text-error rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold">₹{item.amount}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => { setEditingComponent(item.masterId); setEditValue(item.amount); }}
                              className="p-1 text-foreground-tertiary hover:text-primary transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {item.isManualOverride && (
                              <button 
                                type="button" 
                                onClick={() => handleClearOverride(item.masterId)}
                                className="p-1 text-error/60 hover:text-error transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {previewData.items.filter((i: any) => i.type === 'DEDUCTION').length === 0 && (
                  <div className="p-4 text-center text-xs text-foreground-tertiary uppercase tracking-wider font-bold">
                    No Deductions
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-surface border-2 border-primary/20 flex items-center justify-between">
            <span className="font-black tracking-tighter text-foreground">NET PAY</span>
            <span className="text-xl font-black text-primary">₹{previewData.netPay}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/50">
        <Button variant="ghost" onClick={onCancel} disabled={isLoading} type="button">
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} startIcon={<Clock className="w-4 h-4" />}>
          Generate Draft
        </Button>
      </div>
    </form>
  );
};

export default GeneratePayslipForm;
