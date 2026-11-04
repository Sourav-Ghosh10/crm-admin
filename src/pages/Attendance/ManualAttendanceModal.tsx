import React, { useState, useEffect, useMemo } from "react";
import { format, parse, addDays, differenceInMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
    Clock,
    Calendar,
    CheckCircle2,
    Trash2,
    Info,
    Sparkles
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
            maxWidth="sm"
            actions={
                <div className="flex items-center justify-between w-full">
                    {currentRecord && (currentRecord.checkIn?.time || (currentRecord.sessions && currentRecord.sessions.length > 0)) ? (
                        <button
                            type="button"
                            onClick={handleClearPunches}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 rounded-xl transition-colors border border-error/20"
                            title="Reset punches for this date"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear Punches</span>
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-xs font-bold px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            className="text-xs font-bold px-5 py-2 flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                        </Button>
                    </div>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Employee Info Header */}
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-2xl border border-border/50">
                    <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">
                            {employee?.personalInfo?.firstName} {employee?.personalInfo?.lastName}
                        </p>
                        <p className="text-[10px] text-foreground-tertiary font-mono font-bold mt-0.5">
                            ID: {employee?.employeeId || employee?._id}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {employeeTimezone}
                        </span>
                        <p className="text-[9px] text-foreground-tertiary font-medium mt-0.5">Timezone</p>
                    </div>
                </div>

                {/* Date Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-foreground-secondary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Attendance Date
                    </label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="rounded-xl border-border/60 text-xs font-bold h-10 w-full"
                        required
                    />
                </div>

                {/* Status Selector */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-foreground-secondary">
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
                        className="rounded-xl border-border/60 text-xs font-bold h-10"
                    />
                </div>

                {status === "absent" ? (
                    <div className="p-3.5 bg-error/5 border border-error/20 rounded-xl text-error flex items-start gap-2.5">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed font-medium">
                            Setting the status to <strong className="font-bold">Absent</strong> will reset and clear any clock-in/out timestamps for this day.
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Clock In / Out Times Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Clock In */}
                            <div className="space-y-1.5 p-3.5 bg-muted/20 rounded-2xl border border-border/40">
                                <label className="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-success" />
                                    Clock In Time
                                </label>
                                <Input
                                    type="time"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                    className="rounded-xl border-border/60 text-xs font-mono font-bold h-9 w-full bg-surface"
                                    required={status !== "absent"}
                                />
                                <p className="text-[9px] text-foreground-tertiary">
                                    24h format in {employeeTimezone}
                                </p>
                            </div>

                            {/* Clock Out */}
                            <div className="space-y-1.5 p-3.5 bg-muted/20 rounded-2xl border border-border/40">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-error" />
                                        Clock Out Time
                                    </label>
                                    <label className="flex items-center gap-1 text-[9px] font-bold text-primary cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isWorking}
                                            onChange={(e) => {
                                                setIsWorking(e.target.checked);
                                                if (e.target.checked) setCheckOutTime("");
                                            }}
                                            className="rounded text-primary focus:ring-primary w-3 h-3"
                                        />
                                        Working
                                    </label>
                                </div>

                                {!isWorking ? (
                                    <>
                                        <Input
                                            type="time"
                                            value={checkOutTime}
                                            onChange={(e) => setCheckOutTime(e.target.value)}
                                            className="rounded-xl border-border/60 text-xs font-mono font-bold h-9 w-full bg-surface"
                                        />
                                        <div className="flex items-center justify-between pt-0.5">
                                            <p className="text-[9px] text-foreground-tertiary">
                                                24h format
                                            </p>
                                            <label className="flex items-center gap-1 text-[9px] font-bold text-foreground-secondary cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isOvernight}
                                                    onChange={(e) => setIsOvernight(e.target.checked)}
                                                    className="rounded text-primary focus:ring-primary w-3 h-3"
                                                />
                                                Next Day (+1d)
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-9 flex items-center px-3 bg-primary/10 border border-primary/20 rounded-xl">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-wider animate-pulse">
                                            Currently Working (Open Shift)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Duration preview */}
                        {calculatedDuration && (
                            <div className="flex items-center justify-between px-3.5 py-2 bg-success/10 border border-success/20 rounded-xl text-success">
                                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Estimated Shift Duration
                                </span>
                                <span className="text-xs font-black font-mono">{calculatedDuration}</span>
                            </div>
                        )}
                    </>
                )}

                {/* Remarks / Reason */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-foreground-secondary">
                        Remarks / Reason for Manual Entry
                    </label>
                    <Input
                        type="text"
                        placeholder="e.g. Card forgotten, Biometric reader issue, Approved manual punch"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="rounded-xl border-border/60 text-xs h-9 w-full"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default ManualAttendanceModal;
