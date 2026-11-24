import React, { useEffect, useState } from "react";
import { Mail, Plus, X, Save, ShieldCheck, Calendar, Info, Layers } from "lucide-react";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input/Input";
import systemSettingsService from "../../../services/systemSettingsService";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { getPayrollCycleInterval } from "../../../utils/payrollCycleUtils";
import { format } from "date-fns";

const SystemSettings: React.FC = () => {
    const [emails, setEmails] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Global Leave Quota State
    const [monthlyLeaveQuota, setMonthlyLeaveQuota] = useState("1.5");
    const [leaveResetFrequency, setLeaveResetFrequency] = useState("monthly");
    const [isSavingQuota, setIsSavingQuota] = useState(false);

    // Payroll Cycle Settings State
    const [startDay, setStartDay] = useState(1);
    const [endDay, setEndDay] = useState(31);
    const [preset, setPreset] = useState("standard");
    const [isSavingPayroll, setIsSavingPayroll] = useState(false);

    // Stack Settings State
    const [stacks, setStacks] = useState<{ name: string; value: number }[]>([]);
    const [newStackName, setNewStackName] = useState("");
    const [newStackValue, setNewStackValue] = useState("");
    const [isSavingStacks, setIsSavingStacks] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const allSettings = await systemSettingsService.getSettings();

            // 1. Leave Approval Emails
            const leaveEmailsSetting = allSettings.find((s: any) => s.key === "leave_notification_emails");
            if (leaveEmailsSetting && Array.isArray(leaveEmailsSetting.value)) {
                setEmails(leaveEmailsSetting.value);
            }

            // 2. Monthly Leave Quota
            const monthlyQuotaSetting = allSettings.find((s: any) => s.key === "monthly_leave_quota");
            if (monthlyQuotaSetting && monthlyQuotaSetting.value) {
                setMonthlyLeaveQuota(monthlyQuotaSetting.value.toString());
            }
            const resetFrequencySetting = allSettings.find((s: any) => s.key === "leave_reset_frequency");
            if (resetFrequencySetting && resetFrequencySetting.value) {
                setLeaveResetFrequency(resetFrequencySetting.value);
            }

            // 3. Payroll Cycle Settings
            const payrollCycleSetting = allSettings.find((s: any) => s.key === "payroll_cycle_settings");
            if (payrollCycleSetting && payrollCycleSetting.value) {
                const val = payrollCycleSetting.value;
                const sd = Number(val.startDay || 1);
                const ed = Number(val.endDay || 31);
                setStartDay(sd);
                setEndDay(ed);

                // Set Preset
                if (sd === 1 && (ed === 30 || ed === 31)) {
                    setPreset("standard");
                } else {
                    setPreset("custom");
                }
            } else {
                setStartDay(1);
                setEndDay(31);
                setPreset("standard");
            }

            // 4. Stacks Setting
            const stacksSetting = allSettings.find((s: any) => s.key === "system_stacks");
            if (stacksSetting && Array.isArray(stacksSetting.value)) {
                setStacks(stacksSetting.value);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEmail = () => {
        if (!newEmail) return;
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
            toast.error("Please enter a valid email address");
            return;
        }
        if (emails.includes(newEmail)) {
            toast.error("Email already added");
            return;
        }
        setEmails([...emails, newEmail]);
        setNewEmail("");
    };

    const handleRemoveEmail = (email: string) => {
        setEmails(emails.filter((e) => e !== email));
    };

    const handleSaveEmails = async () => {
        try {
            setIsSaving(true);
            await systemSettingsService.updateSetting({
                key: "leave_notification_emails",
                value: emails,
                description: "Additional email addresses to receive leave application notifications"
            });
            toast.success("Notification settings saved successfully");
        } catch (error) {
            console.error("Error saving email settings:", error);
            toast.error("Failed to save notification settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMonthlyQuota = async () => {
        const quotaValue = parseFloat(monthlyLeaveQuota);
        if (isNaN(quotaValue) || quotaValue < 0) {
            toast.error("Please enter a valid positive number for leave quota");
            return;
        }

        try {
            setIsSavingQuota(true);
            await Promise.all([
                systemSettingsService.updateSetting({
                    key: "monthly_leave_quota",
                    value: quotaValue,
                    description: "Global leave quota automatically allocated to all employees"
                }),
                systemSettingsService.updateSetting({
                    key: "leave_reset_frequency",
                    value: leaveResetFrequency,
                    description: "How often the global leave quota resets (monthly or yearly)"
                })
            ]);
            toast.success("Leave quota settings saved successfully");
        } catch (error) {
            console.error("Error saving leave quota:", error);
            toast.error("Failed to save leave quota");
        } finally {
            setIsSavingQuota(false);
        }
    };

    const handlePresetChange = (newPreset: string) => {
        setPreset(newPreset);
        if (newPreset === "standard") {
            setStartDay(1);
            setEndDay(31);
        }
    };

    const handleSavePayrollCycle = async () => {
        // Validation
        if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
            toast.error("Cycle days must be between 1 and 31");
            return;
        }

        try {
            setIsSavingPayroll(true);
            await systemSettingsService.updateSetting({
                key: "payroll_cycle_settings",
                value: { startDay, endDay },
                description: "Payroll Cycle settings for start and end day of salary computation"
            });
            toast.success("Payroll Cycle settings saved successfully");
        } catch (error) {
            console.error("Error saving payroll cycle settings:", error);
            toast.error("Failed to save payroll cycle settings");
        } finally {
            setIsSavingPayroll(false);
        }
    };

    const handleAddStack = () => {
        if (!newStackName || !newStackValue) return;
        const val = parseFloat(newStackValue);
        if (isNaN(val)) {
            toast.error("Please enter a valid number for stack value");
            return;
        }
        if (stacks.some(s => s.name.toLowerCase() === newStackName.toLowerCase())) {
            toast.error("Stack name already exists");
            return;
        }
        setStacks([...stacks, { name: newStackName, value: val }]);
        setNewStackName("");
        setNewStackValue("");
    };

    const handleRemoveStack = (name: string) => {
        setStacks(stacks.filter((s) => s.name !== name));
    };

    const handleSaveStacks = async () => {
        try {
            setIsSavingStacks(true);
            await systemSettingsService.updateSetting({
                key: "system_stacks",
                value: stacks,
                description: "System stack options and their values"
            });
            toast.success("Stack settings saved successfully");
        } catch (error) {
            console.error("Error saving stack settings:", error);
            toast.error("Failed to save stack settings");
        } finally {
            setIsSavingStacks(false);
        }
    };

    // Live Date Preview for May 2026
    const previewDate = new Date(2026, 4, 15); // May 15, 2026
    const interval = getPayrollCycleInterval(previewDate, { startDay, endDay });
    const formattedStart = format(interval.startDate, "MMMM d, yyyy");
    const formattedEnd = format(interval.endDate, "MMMM d, yyyy");
    const start = new Date(interval.startDate.getFullYear(), interval.startDate.getMonth(), interval.startDate.getDate());
    const end = new Date(interval.endDate.getFullYear(), interval.endDate.getMonth(), interval.endDate.getDate());
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="mb-4">
                <h1 className="text-2xl font-black text-foreground tracking-tight mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-7 h-7 text-primary" />
                    System Settings
                </h1>
                <p className="text-sm font-medium text-foreground-tertiary">
                    Configure global application parameters, notification rules, and custom payroll computation intervals.
                </p>
            </div>

            {/* Card 1: Leave Approval Workflow */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Leave Approval Workflow
                    </h2>
                    <p className="text-sm text-foreground-tertiary mt-1">
                        Configure global default/fallback email addresses that receive leave application notifications. (Individual offices set in <strong className="text-foreground">Locations</strong> will receive emails for their own employees).
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter email address (e.g. admin@company.com)"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                                startAdornment={<Mail className="w-4 h-4" />}
                            />
                        </div>
                        <Button onClick={handleAddEmail} variant="secondaryOutline" className="h-[42px] rounded-xl font-bold uppercase tracking-wider text-[10px]">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Email
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                            Configured Email Addresses
                        </label>
                        {emails.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-foreground-tertiary text-xs font-semibold">
                                No additional email addresses configured.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {emails.map((email) => (
                                    <div
                                        key={email}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border group"
                                    >
                                        <span className="text-sm font-medium">{email}</span>
                                        <button
                                            onClick={() => handleRemoveEmail(email)}
                                            className="p-1 hover:bg-error/10 hover:text-error rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                    <Button
                        onClick={handleSaveEmails}
                        isLoading={isSaving}
                        className="min-w-[140px] rounded-xl font-bold uppercase tracking-wider text-[10px]"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                    </Button>
                </div>
            </div>

            {/* Card 1.5: Global Monthly Leave Quota */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Global Monthly Leave Quota
                    </h2>
                    <p className="text-sm text-foreground-tertiary mt-1">
                        Configure the default leave quota added automatically to all employees on the 1st of every month. Unused leaves are carried forward.
                    </p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                        <Input
                            label="Quota (Days)"
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="e.g. 1.5"
                            value={monthlyLeaveQuota}
                            onChange={(e) => setMonthlyLeaveQuota(e.target.value)}
                        />
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-widest text-foreground-tertiary">
                                Reset Frequency
                            </label>
                            <select
                                value={leaveResetFrequency}
                                onChange={(e) => setLeaveResetFrequency(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                    <Button
                        onClick={handleSaveMonthlyQuota}
                        isLoading={isSavingQuota}
                        className="min-w-[140px] rounded-xl font-bold uppercase tracking-wider text-[10px]"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Quota
                    </Button>
                </div>
            </div>

            {/* Card 2: Payroll Cycle Settings */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Payroll Cycle Settings
                    </h2>
                    <p className="text-sm text-foreground-tertiary mt-1">
                        Configure global parameters defining the start and end days for payroll, attendance, and salary cycles.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                            Select Payroll Cycle Option
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handlePresetChange("standard")}
                                className={`p-4 rounded-xl border text-center transition-all ${preset === "standard" ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-border hover:bg-muted text-foreground-secondary"}`}
                            >
                                <span className="block text-xs uppercase tracking-wider font-black">1st to 30th/31st</span>
                                <span className="block text-[10px] text-foreground-tertiary mt-1 font-medium">Standard Calendar Month</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange("custom")}
                                className={`p-4 rounded-xl border text-center transition-all ${preset === "custom" ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-border hover:bg-muted text-foreground-secondary"}`}
                            >
                                <span className="block text-xs uppercase tracking-wider font-black">Custom Cycle</span>
                                <span className="block text-[10px] text-foreground-tertiary mt-1 font-medium">Manually Configure Days</span>
                            </button>
                        </div>
                    </div>

                    {preset === "custom" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 border border-border/60 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                            <Input
                                label="Cycle Start Day"
                                type="number"
                                min={1}
                                max={31}
                                value={startDay}
                                onChange={(e) => setStartDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                required
                            />
                            <Input
                                label="Cycle End Day"
                                type="number"
                                min={1}
                                max={31}
                                value={endDay}
                                onChange={(e) => setEndDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                required
                            />
                        </div>
                    )}

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Live Date Preview (Anchor: May 2026)</p>
                            <p className="text-xs font-semibold text-foreground-secondary leading-relaxed">
                                {`Your monthly salary/attendance computations for May 2026 will automatically span from `}
                                <span className="text-primary font-black">{formattedStart}</span>
                                {` to `}
                                <span className="text-primary font-black">{formattedEnd}</span>
                                {` (exactly `}
                                <span className="text-primary font-black">{totalDays} calendar days</span>
                                {`).`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                    <Button
                        onClick={handleSavePayrollCycle}
                        isLoading={isSavingPayroll}
                        className="min-w-[140px] rounded-xl font-bold uppercase tracking-wider text-[10px]"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Cycle
                    </Button>
                </div>
            </div>

            {/* Card 3: Stack Options */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Stack Options
                    </h2>
                    <p className="text-sm text-foreground-tertiary mt-1">
                        Configure system stacks and their corresponding values (e.g., Golden 500, Platinum 1500).
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                placeholder="Stack Name (e.g. Golden)"
                                value={newStackName}
                                onChange={(e) => setNewStackName(e.target.value)}
                            />
                            <Input
                                type="number"
                                placeholder="Stack Value (e.g. 500)"
                                value={newStackValue}
                                onChange={(e) => setNewStackValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddStack()}
                            />
                        </div>
                        <Button onClick={handleAddStack} variant="secondaryOutline" className="h-[42px] rounded-xl font-bold uppercase tracking-wider text-[10px] shrink-0">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Stack
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                            Configured Stacks
                        </label>
                        {stacks.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-foreground-tertiary text-xs font-semibold">
                                No stacks configured.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {stacks.map((stack) => (
                                    <div
                                        key={stack.name}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{stack.name}</span>
                                            <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                                {stack.value}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveStack(stack.name)}
                                            className="p-1 hover:bg-error/10 hover:text-error rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                    <Button
                        onClick={handleSaveStacks}
                        isLoading={isSavingStacks}
                        className="min-w-[140px] rounded-xl font-bold uppercase tracking-wider text-[10px]"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Stacks
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
