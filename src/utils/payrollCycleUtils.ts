import { startOfMonth, endOfMonth } from 'date-fns';

export interface PayrollCycleSettings {
  startDay: number;
  endDay: number;
}

/**
 * Resolves the startDate and endDate (Date objects) of the payroll cycle for a given base date and settings.
 * Handles custom payroll cycle settings and clamps startDay/endDay according to actual calendar months lengths.
 * 
 * @param date - The target date (usually in the month you want to generate payroll for)
 * @param settings - The payroll cycle settings { startDay, endDay }
 * @returns An object containing the start and end Dates (local time)
 */
export const getPayrollCycleInterval = (
  date: Date,
  settings?: PayrollCycleSettings
): { startDate: Date; endDate: Date } => {
  const startDay = settings?.startDay ?? 1;
  const endDay = settings?.endDay ?? 31;
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth(); // 0-indexed
  const currentDay = date.getDate();

  if (startDay === 1) {
    return {
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
    };
  } else if (startDay > endDay) {
    // Cross-month cycle: e.g. startDay = 24, endDay = 23
    // If today is on/after startDay (e.g. Nov 24), cycle is Nov 24 to Dec 23.
    // If today is on/before endDay (e.g. Nov 23 or mid-month anchor 15), cycle is Oct 24 to Nov 23.
    let startYear = currentYear;
    let startMonth = currentMonth;
    let endYear = currentYear;
    let endMonth = currentMonth;

    if (currentDay >= startDay) {
      startMonth = currentMonth;
      endMonth = currentMonth + 1;
      if (endMonth > 11) {
        endMonth = 0;
        endYear = currentYear + 1;
      }
    } else {
      endMonth = currentMonth;
      startMonth = currentMonth - 1;
      if (startMonth < 0) {
        startMonth = 11;
        startYear = currentYear - 1;
      }
    }

    const maxDaysInStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
    const resolvedStartDay = Math.min(startDay, maxDaysInStartMonth);
    const startDate = new Date(startYear, startMonth, resolvedStartDay, 0, 0, 0, 0);

    const maxDaysInEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
    const resolvedEndDay = Math.min(endDay, maxDaysInEndMonth);
    const endDate = new Date(endYear, endMonth, resolvedEndDay, 23, 59, 59, 999);

    return { startDate, endDate };
  } else {
    // Same-month cycle: e.g. 5th to 20th
    const maxDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const resolvedStart = Math.min(startDay, maxDays);
    const resolvedEnd = Math.min(endDay, maxDays);
    const startDate = new Date(currentYear, currentMonth, resolvedStart, 0, 0, 0, 0);
    const endDate = new Date(currentYear, currentMonth, resolvedEnd, 23, 59, 59, 999);
    return { startDate, endDate };
  }
};
