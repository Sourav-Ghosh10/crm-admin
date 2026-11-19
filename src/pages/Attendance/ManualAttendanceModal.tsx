import React, { useState, useEffect, useMemo } from "react";
import { format, parse, addDays, differenceInMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
    Clock,
    Calendar,
    CheckCircle2,
    Trash2,
    Info,
    Sparkles,
    Globe,
    Activity,
    FileText,
} from "lucide-react";
import Modal from "../../components/common/Modal/Modal";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import FormSelect from "../../components/common/Select/FormSelect";
import { attendanceService } from "../../services/attendanceService";
import type { Attendance } from "../../types/attendance.types";
import toast from "react-hot-toast";
import { getZonedDate } from "../../utils/dateUtils";

interface ManualAttendanceModalProps {
    open: boolean;
    onClose: () => void;
    employee: any;
    initialRecord?: Attendance | null;
    initialDate?: string;
    onSuccess?: () => void;
    getRecordForDate?: (date: string) => Attendance | undefined;
}

// Convert ISO timestamp to HH:mm in specified timezone
const isoToTimeInput = (isoString?: string, tz: string = "Asia/Kolkata"): string => {
    if (!isoString) return "";
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        return formatInTimeZone(d, tz, "HH:mm");
    } catch {
        return "";
    }
};

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
    open,
    onClose,
    employee,
    initialRecord,
    initialDate,
    onSuccess,
    getRecordForDate,
}) => {
    const employeeTimezone = employee?.employment?.timezone || "Asia/Kolkata";

    // Form states
    const [date, setDate] = useState<string>(
        initialDate || format(new Date(), "yyyy-MM-dd")
    );
    const [checkInTime, setCheckInTime] = useState<string>("");
    const [checkOutTime, setCheckOutTime] = useState<string>("");
    const [isWorking, setIsWorking] = useState<boolean>(false);
    const [isOvernight, setIsOvernight] = useState<boolean>(false);
    const [status, setStatus] = useState<string>("present");
    const [remarks, setRemarks] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Resolve record for the currently selected date
    const currentRecord = useMemo(() => {
        if (initialRecord && String(initialRecord.date || "").slice(0, 10) === date) {
            return initialRecord;
        }
        return getRecordForDate ? getRecordForDate(date) : initialRecord;
    }, [date, initialRecord, getRecordForDate]);

    // Populate fields when date or record changes
    useEffect(() => {
        if (!open) return;

        const targetDate = initialDate || date || format(new Date(), "yyyy-MM-dd");
        setDate(targetDate);

        const rec = initialRecord && String(initialRecord.date || "").slice(0, 10) === targetDate
            ? initialRecord
            : getRecordForDate ? getRecordForDate(targetDate) : undefined;

        if (rec) {
            const firstSession = rec.sessions && rec.sessions.length > 0 ? rec.sessions[0] : undefined;
            const lastSession = rec.sessions && rec.sessions.length > 0 ? rec.sessions[rec.sessions.length - 1] : undefined;

            const existingIn = rec.checkIn?.time || firstSession?.checkIn?.time;
            const existingOut = rec.checkOut?.time || lastSession?.checkOut?.time;

            setCheckInTime(isoToTimeInput(existingIn, employeeTimezone));

            const hasActiveWork = !!(lastSession && !lastSession.checkOut && !rec.checkOut?.time);
            setIsWorking(hasActiveWork);

            if (existingOut && !hasActiveWork) {
                setCheckOutTime(isoToTimeInput(existingOut, employeeTimezone));

                // Check overnight
                if (existingIn && existingOut) {
                    const inDate = new Date(existingIn);
                    const outDate = new Date(existingOut);
                    const inDay = formatInTimeZone(inDate, employeeTimezone, "yyyy-MM-dd");
                    const outDay = formatInTimeZone(outDate, employeeTimezone, "yyyy-MM-dd");
                    setIsOvernight(outDay > inDay);
                } else {
                    setIsOvernight(false);
                }
            } else {
                setCheckOutTime("");
                setIsOvernight(false);
            }

            const recStatus = (rec.status || "present").toLowerCase();
            if (["present", "late", "half-day", "absent", "on-leave", "holiday", "weekend"].includes(recStatus)) {
                setStatus(recStatus);
            } else {
                setStatus("present");
            }

            setRemarks(rec.remarks || "");
        } else {
            // No record for this date
            setCheckInTime("");
            setCheckOutTime("");
            setIsWorking(false);
            setIsOvernight(false);
            setStatus("present");
            setRemarks("");
        }
    }, [open, initialDate, initialRecord, employeeTimezone, getRecordForDate]);

    // When the user changes date manually via input
    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        const rec = getRecordForDate ? getRecordForDate(newDate) : undefined;
        if (rec) {
            const firstSession = rec.sessions && rec.sessions.length > 0 ? rec.sessions[0] : undefined;
            const lastSession = rec.sessions && rec.sessions.length > 0 ? rec.sessions[rec.sessions.length - 1] : undefined;

            const existingIn = rec.checkIn?.time || firstSession?.checkIn?.time;
            const existingOut = rec.checkOut?.time || lastSession?.checkOut?.time;

            setCheckInTime(isoToTimeInput(existingIn, employeeTimezone));

            const hasActiveWork = !!(lastSession && !lastSession.checkOut && !rec.checkOut?.time);
            setIsWorking(hasActiveWork);

            if (existingOut && !hasActiveWork) {
                setCheckOutTime(isoToTimeInput(existingOut, employeeTimezone));
                if (existingIn && existingOut) {
                    const inDay = formatInTimeZone(new Date(existingIn), employeeTimezone, "yyyy-MM-dd");
                    const outDay = formatInTimeZone(new Date(existingOut), employeeTimezone, "yyyy-MM-dd");
                    setIsOvernight(outDay > inDay);
                } else {
                    setIsOvernight(false);
                }
            } else {
                setCheckOutTime("");
                setIsOvernight(false);
            }

            const recStatus = (rec.status || "present").toLowerCase();
            setStatus(recStatus);
            setRemarks(rec.remarks || "");
        } else {
            setCheckInTime("");
            setCheckOutTime("");
            setIsWorking(false);
            setIsOvernight(false);
            setStatus("present");
            setRemarks("");
        }
    };

    // Calculate duration preview live
    const calculatedDuration = useMemo(() => {
        if (!checkInTime || isWorking || !checkOutTime || status === "absent") return null;
        try {
            const baseDate = parse(date, "yyyy-MM-dd", new Date());
            const inDate = parse(checkInTime, "HH:mm", baseDate);
            let outDate = parse(checkOutTime, "HH:mm", baseDate);

            if (isOvernight || outDate <= inDate) {
                outDate = addDays(outDate, 1);
            }

            const diffMins = differenceInMinutes(outDate, inDate);
            if (diffMins <= 0) return null;

            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            return `${h}h ${m}m`;
        } catch {
            return null;
        }
    }, [date, checkInTime, checkOutTime, isWorking, isOvernight, status]);

    // Handle form submit
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const employeeId = employee?._id || employee?.id || employee?.employeeId;
        if (!employeeId) {
            toast.error("Employee ID is missing.");
            return;
        }

        if (!date) {
            toast.error("Please select a date.");
            return;
        }

        // If not absent and clock-in is missing
        if (status !== "absent" && !checkInTime) {
            toast.error("Please enter a clock-in time, or mark the status as Absent.");
            return;
        }

        // If clock out is provided, ensure it's not before clock-in (unless overnight)
        if (status !== "absent" && !isWorking && checkInTime && checkOutTime && !isOvernight && checkOutTime <= checkInTime) {
            toast.error("Clock out time must be after clock in time. If this was an overnight shift, check 'Overnight (+1 Day)'.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (status === "absent") {
                // Wipe punches and mark absent
                await attendanceService.manualUpdate({
                    employeeId,
                    date,
                    clearPunches: true,
                    status: "absent",
                    remarks: remarks.trim() || "Marked absent by admin",
                });
            } else {
                // Build ISO strings anchored to employee's timezone
                const checkInDateObj = getZonedDate(date, checkInTime, employeeTimezone);
                const checkInIso = checkInDateObj.toISOString();

                let checkOutIso: string | null = null;
                if (!isWorking && checkOutTime) {
                    const checkOutDateStr = isOvernight
                        ? format(addDays(parse(date, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd")
                        : date;
                    const checkOutDateObj = getZonedDate(checkOutDateStr, checkOutTime, employeeTimezone);
                    checkOutIso = checkOutDateObj.toISOString();
                }

                await attendanceService.manualUpdate({
                    employeeId,
                    date,
                    checkInTime: checkInIso,
                    checkOutTime: isWorking ? null : checkOutIso,
                    status,
                    remarks: remarks.trim() || undefined,
                });
            }

            toast.success("Attendance updated successfully!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update attendance";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick clear punches action
    const handleClearPunches = async () => {
        const employeeId = employee?._id || employee?.id || employee?.employeeId;
        if (!employeeId || !date) return;

        if (!window.confirm(`Are you sure you want to clear punches for ${format(parse(date, "yyyy-MM-dd", new Date()), "MMM dd, yyyy")} and mark as Absent?`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            await attendanceService.manualUpdate({
                employeeId,
                date,
                clearPunches: true,
                status: "absent",
                remarks: "Punches cleared by admin",
            });
            toast.success("Punches cleared and marked as absent.");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to clear punches";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Manual Clock In / Out"
            maxWidth="md"
            className="max-w-xl"
            actions={
                <div className="flex items-center justify-between w-full">
                    {currentRecord && (currentRecord.checkIn?.time || (currentRecord.sessions && currentRecord.sessions.length > 0)) ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClearPunches}
                            disabled={isSubmitting}
                            className="text-error hover:bg-error/10 hover:text-error border border-error/20 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                            title="Reset punches for this date"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear Punches</span>
                        </Button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-xs font-semibold px-4 py-2 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            className="text-xs font-semibold px-5 py-2 rounded-xl shadow-md shadow-primary/20 flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                        </Button>
                    </div>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Employee Info Header */}
                <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-2xl border border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                            {(employee?.personalInfo?.firstName?.[0] || 'E')}{(employee?.personalInfo?.lastName?.[0] || '')}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground truncate">
                                    {employee?.personalInfo?.firstName} {employee?.personalInfo?.lastName}
                                </p>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface text-foreground-secondary border border-border/60">
                                    {employee?.employeeId || employee?._id?.slice(-6)}
                                </span>
                            </div>
                            <p className="text-xs text-foreground-secondary truncate mt-0.5">
                                {employee?.employment?.designation || employee?.employment?.department || 'Employee'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold">
                            <Globe className="w-3.5 h-3.5" />
                            {employeeTimezone}
                        </span>
                        <p className="text-[10px] text-foreground-tertiary mt-0.5">Assigned Timezone</p>
                    </div>
                </div>

                {/* Date & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Attendance Date */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Attendance Date
                        </label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="rounded-xl border-border/70 text-xs font-semibold h-10 w-full bg-surface"
                            required
                        />
                    </div>

                    {/* Status Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            Status
                        </label>
                        <FormSelect
                            value={status}
                            onChange={(val) => setStatus(val)}
                            options={[
                                { value: "present", label: "Present" },
                                { value: "late", label: "Late" },
                                { value: "half-day", label: "Half Day" },
                                { value: "absent", label: "Absent" },
                                { value: "on-leave", label: "On Leave" },
                                { value: "weekend", label: "Weekend / Off Day" },
                            ]}
                            className="rounded-xl border-border/70 text-xs font-semibold h-10"
                        />
                    </div>
                </div>

                {status === "absent" ? (
                    <div className="p-3.5 bg-error/10 border border-error/20 rounded-2xl text-error flex items-start gap-2.5 animate-in fade-in">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed font-medium">
                            Setting the status to <strong className="font-bold">Absent</strong> will reset and clear any clock-in / clock-out punches for this day.
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Clock In / Out Times Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Clock In */}
                            <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/60 space-y-2">
                                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                        Clock In Time
                                    </label>
                                    <span className="text-[10px] text-foreground-tertiary font-mono">24h format</span>
                                </div>
                                <Input
                                    type="time"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                    className="rounded-xl border-border/70 text-sm font-mono font-bold h-10 w-full bg-surface text-center"
                                    required={status !== "absent"}
                                />
                                <p className="text-[10px] text-foreground-tertiary text-center">
                                    Timezone: {employeeTimezone}
                                </p>
                            </div>

                            {/* Clock Out */}
                            <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/60 space-y-2">
                                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                                        Clock Out Time
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isWorking}
                                            onChange={(e) => {
                                                setIsWorking(e.target.checked);
                                                if (e.target.checked) setCheckOutTime("");
                                            }}
                                            className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span>Working</span>
                                    </label>
                                </div>

                                {!isWorking ? (
                                    <>
                                        <Input
                                            type="time"
                                            value={checkOutTime}
                                            onChange={(e) => setCheckOutTime(e.target.value)}
                                            className="rounded-xl border-border/70 text-sm font-mono font-bold h-10 w-full bg-surface text-center"
                                        />
                                        <div className="flex items-center justify-between pt-0.5">
                                            <label className="flex items-center gap-1 text-[11px] font-semibold text-foreground-secondary cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={isOvernight}
                                                    onChange={(e) => setIsOvernight(e.target.checked)}
                                                    className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                                                />
                                                Next Day (+1d)
                                            </label>
                                            <span className="text-[10px] text-foreground-tertiary font-mono">
                                                24h format
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-[62px] flex flex-col items-center justify-center p-2 bg-primary/10 border border-primary/20 rounded-xl text-center">
                                        <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                            <span>Currently Working</span>
                                        </div>
                                        <p className="text-[10px] text-primary/80 font-medium mt-0.5">
                                            Open shift (no clock-out yet)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Duration preview */}
                        {calculatedDuration && (
                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 animate-in fade-in">
                                <span className="text-xs font-semibold flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    Estimated Shift Duration
                                </span>
                                <div className="flex items-center gap-2">
                                    {isOvernight && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20">
                                            Overnight (+1d)
                                        </span>
                                    )}
                                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-surface shadow-xs border border-emerald-500/20">
                                        {calculatedDuration}
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Remarks / Reason */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-foreground-secondary" />
                        Remarks / Reason for Manual Entry
                    </label>
                    <Input
                        type="text"
                        placeholder="e.g. Card forgotten, Biometric reader issue, Approved manual punch"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="rounded-xl border-border/70 text-xs h-10 w-full bg-surface"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default ManualAttendanceModal;
