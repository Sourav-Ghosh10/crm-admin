import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    Calendar,
    AlertCircle,
    ArrowRight,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Clock,
} from "lucide-react";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    getDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "../../lib/utils";
import { attendanceService } from "../../services/attendanceService";
import { userService } from "../../services/userService";
import Table, { type Column } from "../../components/common/Table";
import type { Attendance } from "../../types/attendance.types";
import { Card, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import BackButton from "../../components/common/BackButton";
import GlobalLoader from "../../components/common/LoadingSpinner/GlobalLoader";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import Input from "../../components/common/Input/Input";
import Pagination from "../../components/common/Pagination";
import FilterDropdown from "../../components/common/Filter/FilterDropdown";
import TimezoneDualView from "../../components/common/TimezoneDualView";
import TimezoneToggle from "../../components/common/TimezoneToggle";
import { getOfficeTimezone } from "../../utils/dateUtils";
import { resolveCheckInLocation } from "../../utils/attendanceLocationUtils";
import ManualAttendanceModal from "./ManualAttendanceModal";
import systemSettingsService from "../../services/systemSettingsService";
import { getPayrollCycleInterval } from "../../utils/payrollCycleUtils";

type FilterType = "weekly" | "monthly" | "custom";

// Treat YYYY-MM-DD as a "date-only" value in local time (avoid UTC shifting).
const ymdToLocalDate = (value: string): Date => {
    const ymd = (value || "").slice(0, 10);
    const [y, m, d] = ymd.split("-").map((n) => Number(n));
    if (!y || !m || !d) return new Date(value);
    return new Date(y, m - 1, d);
};

const hasPunchData = (row: Attendance): boolean => {
    const hasSessions = !!(row.sessions && row.sessions.length > 0);
    const hasCheckInTime = !!row.checkIn?.time || (hasSessions && row.sessions.some(s => !!s.checkIn?.time));
    const isCurrentlyWorking = hasSessions && !row.sessions[row.sessions.length - 1].checkOut;
    return hasCheckInTime || hasSessions || isCurrentlyWorking;
};

// Determine the local work-date for a record based on the employee's timezone
const getRecordDateKey = (r: Attendance, employeeTz: string): string => {
    const firstCheckIn = r.checkIn?.time || (r.sessions && r.sessions.length > 0 ? r.sessions[0].checkIn?.time : null);
    if (firstCheckIn) {
        try {
            return formatInTimeZone(new Date(firstCheckIn), employeeTz, "yyyy-MM-dd");
        } catch {
            // fallback
        }
    }
    if ((r.date as unknown) instanceof Date) {
        return (r.date as unknown as Date).toISOString().slice(0, 10);
    }
    const rawDate = String(r.date || "");
    // r.date is stored as UTC midnight representing the calendar date (e.g. 2026-08-31T00:00:00.000Z).
    // Using rawDate.slice(0, 10) directly avoids unwanted day shifts from negative timezone offsets (e.g. EDT).
    return rawDate.slice(0, 10);
};

const formatCleanDuration = (rawStr?: string, totalHours?: number, sessions?: Attendance['sessions']): string => {
    if (rawStr && rawStr !== "0S" && rawStr !== "0s" && rawStr !== "-") {
        const withoutSeconds = rawStr
            .replace(/(\d+)\s*H/gi, '$1h')
            .replace(/(\d+)\s*M/gi, '$1m')
            .replace(/\s*\d+\s*S/gi, '')
            .trim();
        if (withoutSeconds) return withoutSeconds;
    }

    if (typeof totalHours === 'number' && totalHours > 0) {
        const totalMinutes = totalHours > 24 ? Math.round(totalHours) : Math.round(totalHours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    if (sessions && sessions.length > 0) {
        let totalMs = 0;
        sessions.forEach((s) => {
            const inTime = s.checkIn?.time ? new Date(s.checkIn.time).getTime() : 0;
            const outTime = s.checkOut?.time ? new Date(s.checkOut.time).getTime() : Date.now();
            if (inTime > 0 && outTime > inTime) {
                totalMs += (outTime - inTime);
            }
        });
        if (totalMs > 0) {
            const totalMins = Math.floor(totalMs / 60000);
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
    }

    return "-";
};

const formatCleanBreaks = (rawStr?: string, breakMinutes?: number, breaksCount?: number): string => {
    if ((!rawStr || rawStr === "0S" || rawStr === "0s") && (!breakMinutes || breakMinutes === 0) && (!breaksCount || breaksCount === 0)) {
        return "-";
    }

    if (rawStr && rawStr !== "0S" && rawStr !== "0s") {
        const withoutSeconds = rawStr
            .replace(/(\d+)\s*H/gi, '$1h')
            .replace(/(\d+)\s*M/gi, '$1m')
            .replace(/\s*\d+\s*S/gi, '')
            .trim();
        return withoutSeconds || (breaksCount && breaksCount > 0 ? "< 1m" : "-");
    }

    if (breakMinutes && breakMinutes > 0) {
        const h = Math.floor(breakMinutes / 60);
        const m = Math.round(breakMinutes % 60);
        return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m` : "< 1m");
    }

    return "-";
};

const EmployeeAttendanceDetail: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    // Manual Clock In / Out Modal State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedRecordForManual, setSelectedRecordForManual] = useState<Attendance | null>(null);
    const [selectedDateForManual, setSelectedDateForManual] = useState<string>("");

    // Payroll Cycle Settings from System Settings
    const [cycleSettings, setCycleSettings] = useState<{ startDay: number; endDay: number }>({ startDay: 1, endDay: 31 });

    // Filter States - default to monthly aligned with payroll cycle
    const [filterType, setFilterType] = useState<FilterType>(
        (searchParams.get("type") as FilterType) || "monthly"
    );

    const initialInterval = React.useMemo(() => {
        return getPayrollCycleInterval(new Date(), cycleSettings);
    }, [cycleSettings]);

    const [startDate, setStartDate] = useState<string>(
        searchParams.get("start") || format(initialInterval.startDate, "yyyy-MM-dd")
    );
    const [endDate, setEndDate] = useState<string>(
        searchParams.get("end") || format(initialInterval.endDate, "yyyy-MM-dd")
    );

    // Pagination State - default limit to 31 for monthly view so full month cycle is visible
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [limit, setLimit] = useState(
        Number(searchParams.get("limit")) || (filterType === "monthly" ? 31 : 10)
    );

    // Fetch payroll cycle settings on mount
    useEffect(() => {
        const fetchCycle = async () => {
            try {
                const res = await systemSettingsService.getSettingByKey("payroll_cycle_settings").catch(() => null);
                if (res && res.value) {
                    const sd = Number(res.value.startDay || 1);
                    const ed = Number(res.value.endDay || 31);
                    const loadedSettings = { startDay: sd, endDay: ed };
                    setCycleSettings(loadedSettings);

                    // If user navigated without explicit start/end or with stale default, align with actual cycle
                    const hasExplicitParams = searchParams.has("start") && searchParams.has("end");
                    if (!hasExplicitParams || searchParams.get("type") !== "custom") {
                        if (filterType === "monthly" || !searchParams.has("type")) {
                            const interval = getPayrollCycleInterval(new Date(), loadedSettings);
                            setStartDate(format(interval.startDate, "yyyy-MM-dd"));
                            setEndDate(format(interval.endDate, "yyyy-MM-dd"));
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch payroll cycle settings:", err);
            }
        };
        fetchCycle();
    }, []);

    // Sync state to URL
    useEffect(() => {
        const params: Record<string, string> = {
            type: filterType,
            start: startDate,
            end: endDate,
            page: page.toString(),
            limit: limit.toString()
        };
        setSearchParams(params, { replace: true });
    }, [filterType, startDate, endDate, page, limit, setSearchParams]);

    // Fetch Employee Info
    const { data: employee, isLoading: isLoadingEmployee } = useQuery({
        queryKey: ["employee", employeeId],
        queryFn: () => userService.getById(employeeId!),
        enabled: !!employeeId,
    });

    const employeeTimezone = employee?.employment?.timezone || 'Asia/Kolkata';

    // Extend query bounds by 1 day to catch shifts across UTC boundaries
    const queryStartDate = React.useMemo(() => {
        try {
            return format(subDays(ymdToLocalDate(startDate), 1), "yyyy-MM-dd");
        } catch {
            return startDate;
        }
    }, [startDate]);

    const queryEndDate = React.useMemo(() => {
        try {
            return format(addDays(ymdToLocalDate(endDate), 1), "yyyy-MM-dd");
        } catch {
            return endDate;
        }
    }, [endDate]);

    // Fetch Attendance Data
    const { data: attendanceData, isLoading: isLoadingAttendance, isFetching } = useQuery({
        queryKey: ["employee-attendance", employeeId, filterType, startDate, endDate, employeeTimezone],
        queryFn: () => attendanceService.getAll({
            employeeId,
            userId: employeeId,
            startDate: queryStartDate,
            endDate: queryEndDate,
            page: 1,
            limit: 100 // Fetch all records for the requested range to populate days cleanly
        }),
        enabled: !!employeeId && !!startDate && !!endDate,
        placeholderData: keepPreviousData,
    });

    const handleFilterChange = (type: FilterType) => {
        setFilterType(type);
        const now = new Date();
        if (type === "weekly") {
            setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
            setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
            setLimit(10);
        } else if (type === "monthly") {
            const interval = getPayrollCycleInterval(now, cycleSettings);
            setStartDate(format(interval.startDate, "yyyy-MM-dd"));
            setEndDate(format(interval.endDate, "yyyy-MM-dd"));
            setLimit(31);
        }
        setPage(1); // Reset page on filter change
    };

    const handlePrevPeriod = () => {
        const start = ymdToLocalDate(startDate);
        if (filterType === "weekly") {
            const prevStart = subWeeks(start, 1);
            setStartDate(format(startOfWeek(prevStart, { weekStartsOn: 1 }), "yyyy-MM-dd"));
            setEndDate(format(endOfWeek(prevStart, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        } else if (filterType === "monthly") {
            const prevDate = subDays(start, 1);
            const interval = getPayrollCycleInterval(prevDate, cycleSettings);
            setStartDate(format(interval.startDate, "yyyy-MM-dd"));
            setEndDate(format(interval.endDate, "yyyy-MM-dd"));
        }
        setPage(1);
    };

    const handleNextPeriod = () => {
        const start = ymdToLocalDate(startDate);
        if (filterType === "weekly") {
            const nextStart = addWeeks(start, 1);
            setStartDate(format(startOfWeek(nextStart, { weekStartsOn: 1 }), "yyyy-MM-dd"));
            setEndDate(format(endOfWeek(nextStart, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        } else if (filterType === "monthly") {
            const end = ymdToLocalDate(endDate);
            const nextDate = addDays(end, 1);
            const interval = getPayrollCycleInterval(nextDate, cycleSettings);
            setStartDate(format(interval.startDate, "yyyy-MM-dd"));
            setEndDate(format(interval.endDate, "yyyy-MM-dd"));
        }
        setPage(1);
    };

    // Calculate all calendar days in interval
    const allIntervalDays = React.useMemo(() => {
        try {
            const start = ymdToLocalDate(startDate);
            const end = ymdToLocalDate(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                return [];
            }
            return eachDayOfInterval({ start, end });
        } catch (e) {
            console.error("Failed to calculate date interval:", e);
            return [];
        }
    }, [startDate, endDate]);

    // Raw backend records indexed by date in employee's local timezone
    const backendRecordsByDate = React.useMemo(() => {
        const map = new Map<string, Attendance>();
        const targetEmployeeId = String(employeeId || "");

        (attendanceData?.attendances || []).forEach((r) => {
            // Strictly guard: ensure record belongs to this employee
            const recEmpId = typeof r.employeeId === 'object' && r.employeeId !== null
                ? String((r.employeeId as any)._id || (r.employeeId as any).id || "")
                : String(r.employeeId || "");
            if (targetEmployeeId && recEmpId && recEmpId !== targetEmployeeId) {
                return; // Skip records of other employees
            }

            const key = getRecordDateKey(r, employeeTimezone);
            if (key) {
                const existing = map.get(key);
                if (!existing || (!hasPunchData(existing) && hasPunchData(r))) {
                    map.set(key, r);
                }
            }
        });
        return map;
    }, [attendanceData, employeeId, employeeTimezone]);

    // Today's date string in employee's timezone
    const todayDateStr = React.useMemo(() => {
        try {
            return formatInTimeZone(new Date(), employeeTimezone, "yyyy-MM-dd");
        } catch {
            return format(new Date(), "yyyy-MM-dd");
        }
    }, [employeeTimezone]);

    const handleOpenManualModal = (row?: Attendance, dateStr?: string) => {
        if (row) {
            setSelectedRecordForManual(row);
            setSelectedDateForManual(String(row.date || "").slice(0, 10));
        } else if (dateStr) {
            setSelectedRecordForManual(backendRecordsByDate.get(dateStr) || null);
            setSelectedDateForManual(dateStr);
        } else {
            setSelectedRecordForManual(backendRecordsByDate.get(todayDateStr) || null);
            setSelectedDateForManual(todayDateStr);
        }
        setIsManualModalOpen(true);
    };

    // Generate comprehensive records list for every day in interval
    const fullRecords = React.useMemo(() => {
        if (allIntervalDays.length === 0) {
            return (attendanceData?.attendances || []).map((r) => {
                const isLate = r.punctuality === "Late" || r.isLate || (r.sessions && r.sessions.length > 0 && r.sessions.some(s => s.isLate));
                return { ...r, _id: r._id || r.date, isLate };
            });
        }

        return allIntervalDays.map((dayDate) => {
            const dateStr = format(dayDate, "yyyy-MM-dd");
            const rawRecord = backendRecordsByDate.get(dateStr);
            const dayOfWeek = getDay(dayDate); // 0 = Sunday, 6 = Saturday
            const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
            const isRowToday = dateStr === todayDateStr;
            const isFutureDay = dateStr > todayDateStr;

            if (rawRecord) {
                const hasWorked = hasPunchData(rawRecord);
                const isLate = rawRecord.punctuality === "Late" || rawRecord.isLate || (rawRecord.sessions && rawRecord.sessions.length > 0 && rawRecord.sessions.some(s => s.isLate));

                // Determine accurate status
                let resolvedStatus = (rawRecord.status || "").toLowerCase();
                if (hasWorked) {
                    // If employee worked/clocked in, status should NEVER be 'weekend' or 'absent'
                    if (!resolvedStatus || ['absent', 'weekend', 'holiday', 'scheduled'].includes(resolvedStatus)) {
                        resolvedStatus = isLate ? "late" : "present";
                    }
                } else {
                    if (!resolvedStatus || resolvedStatus === "present" || resolvedStatus === "late") {
                        if (isWeekendDay) resolvedStatus = "weekend";
                        else if (isFutureDay || isRowToday) resolvedStatus = "scheduled";
                        else resolvedStatus = "absent";
                    }
                }

                // Check-in location resolution
                let checkInLoc = resolveCheckInLocation(rawRecord);
                if ((!checkInLoc || (!checkInLoc.address && !checkInLoc.latitude)) && isRowToday && employee?.lastActiveLocation) {
                    checkInLoc = {
                        time: checkInLoc?.time || rawRecord.checkIn?.time || "",
                        ipAddress: checkInLoc?.ipAddress || rawRecord.checkIn?.ipAddress || "",
                        latitude: employee.lastActiveLocation.latitude,
                        longitude: employee.lastActiveLocation.longitude,
                        address: employee.lastActiveLocation.address,
                    };
                }

                return {
                    ...rawRecord,
                    _id: rawRecord._id || dateStr,
                    date: dateStr,
                    status: resolvedStatus,
                    isLate: !!isLate,
                    checkIn: checkInLoc || rawRecord.checkIn,
                } as Attendance;
            }

            // No backend record for this date
            let defaultStatus = "absent";
            if (isWeekendDay) {
                defaultStatus = "weekend";
            } else if (isFutureDay || isRowToday) {
                defaultStatus = "scheduled";
            }

            return {
                _id: dateStr,
                date: dateStr,
                status: defaultStatus,
                isLate: false,
                checkIn: undefined,
                checkOut: undefined,
                sessions: [],
                breaks: [],
                totalHours: 0,
                breakTime: 0,
            } as unknown as Attendance;
        });
    }, [allIntervalDays, backendRecordsByDate, todayDateStr, employee, attendanceData]);

    // Paginated records for table view
    const totalRecords = fullRecords.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const displayedRecords = filterType === "weekly"
        ? fullRecords
        : fullRecords.slice((page - 1) * limit, page * limit);

    // Summary statistics
    const presentDays = fullRecords.filter(r => ['present', 'late', 'half-day'].includes(r.status?.toLowerCase()) || hasPunchData(r)).length;
    const lateDays = fullRecords.filter(r => r.isLate).length;
    const absentDays = fullRecords.filter(r => r.status?.toLowerCase() === 'absent' && !hasPunchData(r)).length;

    const columns: Column<Attendance>[] = [
        {
            _id: "date",
            label: "Date",
            format: (value: unknown, row: Attendance) => {
                const hasPunch = hasPunchData(row);
                const isFaded = !hasPunch && ['weekend', 'scheduled'].includes(row.status?.toLowerCase());
                const rowDate = ymdToLocalDate(String(value || ""));
                const isRowToday = String(value || "").slice(0, 10) === todayDateStr;

                return (
                    <div className={cn(
                        "flex flex-col py-0.5 transition-opacity duration-300",
                        isFaded && "opacity-45"
                    )}>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground">
                                {format(rowDate, "MMM dd, yyyy")}
                            </span>
                            {isRowToday && (
                                <span className="px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 rounded text-[8px] font-black uppercase tracking-wider">
                                    Today
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] text-foreground-tertiary uppercase font-bold tracking-wider">
                            {format(rowDate, "EEEE")}
                        </span>
                    </div>
                );
            }
        },
        {
            _id: "checkIn",
            label: "Check In",
            format: (value: unknown, row: Attendance) => {
                const val = value as { time?: string } | undefined;
                const sessions = row.sessions || [];
                const checkInTime = val?.time || (sessions.length > 0 ? sessions[0].checkIn?.time : undefined);
                const hasPunch = hasPunchData(row);
                const isFaded = !hasPunch && ['weekend', 'scheduled'].includes(row.status?.toLowerCase());

                return (
                    <div className={cn(
                        "flex items-center transition-opacity duration-300 py-0.5",
                        isFaded && "opacity-45"
                    )}>
                        {checkInTime ? (
                            <TimezoneDualView
                                startTime={checkInTime}
                                primaryTimezone={employee?.employment?.timezone || 'Asia/Kolkata'}
                                secondaryTimezone={getOfficeTimezone()}
                                variant="minimal"
                            />
                        ) : (
                            <span className="font-mono font-bold text-xs text-foreground-tertiary">--:--</span>
                        )}
                    </div>
                );
            }
        },
        {
            _id: "clockInLocation",
            label: "Location",
            format: (_: unknown, row: Attendance) => {
                const hasPunch = hasPunchData(row);
                const isFaded = !hasPunch && ['weekend', 'scheduled'].includes(row.status?.toLowerCase());
                const checkInLoc = resolveCheckInLocation(row);

                if (!checkInLoc || (!checkInLoc.address && !checkInLoc.latitude)) {
                    return <span className={cn("text-foreground-tertiary font-medium text-xs", isFaded && "opacity-45")}>-</span>;
                }

                const address = checkInLoc.address;
                const lat = checkInLoc.latitude;
                const lng = checkInLoc.longitude;

                if (!address && !lat) return <span className={cn("text-foreground-tertiary font-medium text-xs", isFaded && "opacity-45")}>-</span>;

                return (
                    <div className={cn(
                        "flex flex-col gap-0.5 py-0.5 transition-opacity duration-300",
                        isFaded && "opacity-45"
                    )}>
                        {address ? (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${lat || ''},${lng || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-1 max-w-[150px] hover:text-primary transition-colors group"
                                title="Click to view on Google Maps"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MapPin className="w-3 h-3 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] text-foreground-secondary leading-tight font-medium line-clamp-1">
                                    {address}
                                </span>
                            </a>
                        ) : lat && lng ? (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-primary hover:underline font-bold"
                                title="Click to view on Google Maps"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MapPin className="w-3 h-3 text-primary" />
                                <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                            </a>
                        ) : (
                            <span className="text-foreground-tertiary text-xs">-</span>
                        )}
                    </div>
                );
            }
        },
        {
            _id: "checkOut",
            label: "Check Out",
            format: (value: unknown, row: Attendance) => {
                const val = value as { time?: string } | undefined;
                const sessions = row.sessions || [];
                const isCurrentlyWorking = sessions.length > 0 && !sessions[sessions.length - 1].checkOut;
                const checkOutTime = row.checkOut?.time || val?.time || (sessions.length > 0 ? sessions[sessions.length - 1].checkOut?.time : undefined);
                const hasPunch = hasPunchData(row);
                const isFaded = !hasPunch && ['weekend', 'scheduled'].includes(row.status?.toLowerCase());

                return (
                    <div className={cn(
                        "flex items-center gap-1.5 transition-opacity duration-300 py-0.5",
                        isFaded && "opacity-45"
                    )}>
                        <div className="relative inline-block group/session">
                            {isCurrentlyWorking ? (
                                <span className="text-primary font-black uppercase tracking-wider text-[8px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md animate-pulse shadow-sm shadow-primary/10">
                                    Working
                                </span>
                            ) : checkOutTime ? (
                                <TimezoneDualView
                                    startTime={checkOutTime}
                                    primaryTimezone={employee?.employment?.timezone || 'Asia/Kolkata'}
                                    secondaryTimezone={getOfficeTimezone()}
                                    variant="minimal"
                                />
                            ) : (
                                <span className="font-mono font-bold text-xs text-foreground-tertiary">--:--</span>
                            )}
                            {(row.sessions && row.sessions.length > 1) && !isCurrentlyWorking && (
                                <div className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[0.9rem] h-3 px-0.5 rounded-full bg-primary text-[7px] font-black text-white shadow-md ring-1 ring-surface z-10">
                                    {row.sessions.length > 2 ? '2+' : '2'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            _id: "totalHours",
            label: "Duration",
            format: (_: unknown, row: Attendance) => {
                const hasPunch = hasPunchData(row);
                const isFaded = !hasPunch && ['weekend', 'scheduled'].includes(row.status?.toLowerCase());
                const displayStr = formatCleanDuration(row.netDurationString || row.totalDurationString, row.totalHours, row.sessions);

                return (
                    <div className="flex items-center py-0.5">
                        <span className={cn(
                            "font-bold text-foreground text-xs transition-opacity duration-300 font-mono",
                            isFaded && "opacity-45"
                        )}>
                            {displayStr}
                        </span>
                    </div>
                );
            }
        },
        {
            _id: "breakTime",
            label: "Breaks",
            format: (value: unknown, row: Attendance) => {
                const breaksCount = row.breaks?.length || 0;
                const breakMinutes = Number(value) || 0;
                const hasPunch = hasPunchData(row);
                const isFaded = !hasPunch && ['weekend', 'scheduled'].includes(row.status?.toLowerCase());
                const displayStr = formatCleanBreaks(row.totalBreakDurationString, breakMinutes, breaksCount);

                return (
                    <span className={cn(
                        "font-bold text-foreground-secondary text-xs transition-opacity duration-300 font-mono",
                        isFaded && "opacity-45"
                    )}>
                        {displayStr}
                    </span>
                );
            }
        },
        {
            _id: "punctuality",
            label: "Punctuality",
            format: (_: unknown, row: Attendance) => {
                const hasPunch = hasPunchData(row);
                if (!hasPunch && !['present', 'late', 'half-day'].includes(row.status?.toLowerCase())) {
                    return <span className="text-foreground-tertiary opacity-40 text-xs">-</span>;
                }

                return row.isLate ? (
                    <span className="px-2 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded-md text-[8px] font-black uppercase tracking-wider">
                        Late
                    </span>
                ) : (
                    <span className="px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded-md text-[8px] font-black uppercase tracking-wider">
                        On Time
                    </span>
                );
            }
        },
        {
            _id: "status",
            label: "Status",
            format: (status: unknown) => {
                const statusStr = String(status || "").toLowerCase();
                const variants: Record<string, string> = {
                    present: "bg-success/10 text-success border-success/20",
                    absent: "bg-error/10 text-error border-error/20",
                    late: "bg-warning/10 text-warning border-warning/20",
                    "half-day": "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    "on-leave": "bg-purple-500/10 text-purple-600 border-purple-500/20",
                    holiday: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    weekend: "bg-slate-500/10 text-slate-600 border-slate-500/20",
                    scheduled: "bg-muted text-foreground-tertiary border-border",
                };
                return (
                    <span className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border inline-block text-center min-w-[60px]",
                        variants[statusStr] || "bg-muted text-foreground-tertiary border-border"
                    )}>
                        {statusStr}
                    </span>
                );
            }
        },
        {
            _id: "action",
            label: "Action",
            format: (_: unknown, row: Attendance) => {
                const rowDate = String(row.date || "").slice(0, 10);
                return (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenManualModal(row, rowDate);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all rounded-lg border border-primary/20 shadow-xs group cursor-pointer"
                        title={`Manual clock in / out update for ${rowDate}`}
                    >
                        <Clock className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                        <span>Update</span>
                    </button>
                );
            }
        }
    ];

    if (isLoadingEmployee || (isLoadingAttendance && !attendanceData)) {
        return <GlobalLoader fullScreen message="Loading attendance records..." />;
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-12 h-12 text-error" />
                <h2 className="text-xl font-bold">Employee not found</h2>
                <Button onClick={() => navigate("/attendance")}>Back to Log</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto px-2 md:px-4 py-4">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <BackButton onClick={() => navigate("/attendance")} label="Back to Attendance Log" className="mb-2" />
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            {employee.personalInfo?.firstName} {employee.personalInfo?.lastName}
                        </h1>
                        <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-mono font-bold uppercase tracking-wider">
                            {employeeId}
                        </span>
                    </div>
                    <p className="text-xs text-foreground-tertiary font-medium flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Showing attendance from <span className="font-bold text-foreground">{format(ymdToLocalDate(startDate), "MMM dd")}</span> to <span className="font-bold text-foreground">{format(ymdToLocalDate(endDate), "MMM dd, yyyy")}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        onClick={() => handleOpenManualModal()}
                        className="flex items-center gap-2 text-xs font-bold py-2 px-3.5 shadow-sm rounded-xl"
                    >
                        <Clock className="w-4 h-4" />
                        <span>Manual Clock In / Out</span>
                    </Button>
                    <TimezoneToggle variant="horizontal" />
                </div>
            </div>

            {/* Controls Card */}
            <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden bg-surface">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        {/* Tabs & Period Navigation */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50 gap-0.5">
                                {(["weekly", "monthly", "custom"] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleFilterChange(type)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                            filterType === type
                                                ? "bg-surface text-primary shadow-sm border border-border/50"
                                                : "text-foreground-tertiary hover:text-foreground"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {filterType !== "custom" && (
                                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/40">
                                    <button
                                        onClick={handlePrevPeriod}
                                        className="p-1 hover:bg-surface rounded-lg transition-colors text-foreground-secondary hover:text-foreground"
                                        title={`Previous ${filterType === 'weekly' ? 'Week' : 'Month'}`}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="px-2.5 text-xs font-black text-foreground-secondary uppercase tracking-wider">
                                        {filterType === "weekly"
                                            ? "Week"
                                            : cycleSettings.startDay !== 1 && startDate && endDate
                                            ? `${format(ymdToLocalDate(startDate), "MMM d")} - ${format(ymdToLocalDate(endDate), "MMM d, yyyy")}`
                                            : startDate
                                            ? format(ymdToLocalDate(startDate), "MMMM yyyy")
                                            : ""}
                                    </span>
                                    <button
                                        onClick={handleNextPeriod}
                                        className="p-1 hover:bg-surface rounded-lg transition-colors text-foreground-secondary hover:text-foreground"
                                        title={`Next ${filterType === 'weekly' ? 'Week' : 'Month'}`}
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Custom Date Range Controls */}
                        {filterType === "custom" && (
                            <div className="flex flex-col sm:flex-row items-center gap-2.5 animate-in slide-in-from-right-4 duration-300 w-full lg:w-auto">
                                <div className="space-y-0.5 w-full sm:w-auto">
                                    <p className="text-[9px] font-black text-foreground-tertiary uppercase tracking-widest ml-1">Start Date</p>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="rounded-lg border-border/50 h-8 text-xs w-full sm:w-36"
                                    />
                                </div>
                                <div className="sm:pt-4">
                                    <ArrowRight className="w-3.5 h-3.5 text-foreground-tertiary hidden sm:block" />
                                </div>
                                <div className="space-y-0.5 w-full sm:w-auto">
                                    <p className="text-[9px] font-black text-foreground-tertiary uppercase tracking-widest ml-1">End Date</p>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="rounded-lg border-border/50 h-8 text-xs w-full sm:w-36"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quick Summary View */}
                        <div className="flex items-center gap-3 sm:gap-5 px-3.5 py-1.5 bg-muted/30 rounded-xl border border-border/20 ml-auto lg:ml-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success" />
                                <div>
                                    <p className="text-[8px] font-black text-foreground-tertiary uppercase tracking-tighter">Total Present</p>
                                    <p className="text-sm font-black text-success">{presentDays} Days</p>
                                </div>
                            </div>
                            <div className="w-px h-6 bg-border/50" />
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-warning" />
                                <div>
                                    <p className="text-[8px] font-black text-foreground-tertiary uppercase tracking-tighter">Total Late</p>
                                    <p className="text-sm font-black text-warning">{lateDays}</p>
                                </div>
                            </div>
                            <div className="w-px h-6 bg-border/50" />
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-error" />
                                <div>
                                    <p className="text-[8px] font-black text-foreground-tertiary uppercase tracking-tighter">Total Absent</p>
                                    <p className="text-sm font-black text-error">{absentDays} Days</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table Card */}
            <Card className="rounded-xl border-border/40 shadow-sm overflow-hidden bg-surface">
                <div className="relative min-h-[300px]">
                    {isFetching && (
                        <div className="absolute inset-0 bg-surface/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300">
                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary animate-pulse">Updating...</p>
                        </div>
                    )}
                    <Table
                        columns={columns}
                        rows={displayedRecords}
                        onRowClick={(row) => {
                            const dateKey = String((row as Attendance).date || "").slice(0, 10);
                            navigate(`/attendance/record/${encodeURIComponent(dateKey)}/${employeeId}`);
                        }}
                        isRowClickable={(row) => {
                            return hasPunchData(row as Attendance);
                        }}
                        rowClassName={(row) => {
                            const isTodayRow = String(row.date || "").slice(0, 10) === todayDateStr;
                            return isTodayRow ? "bg-primary/[0.03] border-l-3 border-l-primary" : "";
                        }}
                        className="border-none"
                        emptyState={
                            <EmptyState
                                title="No attendance history"
                                description="No records found for the selected period."
                                className="py-16"
                            />
                        }
                    />
                </div>
            </Card>

            {/* Pagination Controls for Monthly / Custom views */}
            {filterType !== 'weekly' && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                    <div className="flex items-center gap-2.5">
                        <p className="text-xs font-bold text-foreground-tertiary uppercase tracking-wider bg-muted/50 px-3 py-1.5 rounded-xl border border-border/30">
                            Page <span className="text-primary font-black">{page}</span> of {totalPages} (Total: {totalRecords} days)
                        </p>
                        <div className="relative group">
                            <FilterDropdown
                                value={limit.toString()}
                                options={[10, 20, 31, 50].map(v => ({ value: v.toString(), label: `${v} / Page` }))}
                                onChange={(v) => {
                                    setLimit(Number(v));
                                    setPage(1);
                                }}
                                className="
                            h-8 px-2.5 rounded-lg border-border/50
                            text-xs font-bold text-foreground-tertiary
                            hover:text-foreground-tertiary
                            focus:text-foreground-tertiary
                            bg-transparent
                        "
                            />
                        </div>
                    </div>

                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            )}

            {/* Manual Attendance Clock In/Out Modal */}
            <ManualAttendanceModal
                open={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                employee={employee}
                initialRecord={selectedRecordForManual}
                initialDate={selectedDateForManual}
                getRecordForDate={(d) => backendRecordsByDate.get(d)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["employee-attendance", employeeId] });
                    queryClient.invalidateQueries({ queryKey: ["attendance"] });
                }}
            />
        </div>
    );
};

export default EmployeeAttendanceDetail;
