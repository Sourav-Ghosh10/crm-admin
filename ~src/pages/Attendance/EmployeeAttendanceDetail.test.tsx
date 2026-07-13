import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EmployeeAttendanceDetail from "./EmployeeAttendanceDetail";
import { attendanceService } from "../../services/attendanceService";
import { userService } from "../../services/userService";
import { jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../../services/attendanceService");
jest.mock("../../services/userService");

jest.mock("date-fns", () => {
    const original = jest.requireActual("date-fns") as object;
    return {
        ...original,
        format: (date: Date, fmt: string) => {
            if (fmt === "yyyy-MM-dd") return "2024-01-01";
            if (fmt === "MMM dd, yyyy") return "Jan 01, 2024";
            if (fmt === "EEEE") return "Monday";
            if (fmt === "hh:mm a") return "09:00 AM"; // Mock time
            return (original as any).format(date, fmt);
        },
        startOfWeek: () => new Date("2024-01-01"),
        endOfWeek: () => new Date("2024-01-07"),
    };
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe("EmployeeAttendanceDetail Page", () => {
    const mockEmployee = {
        _id: "emp1",
        personalInfo: { firstName: "John", lastName: "Doe" },
        id: "emp1"
    };

    const mockAttendanceData = {
        attendances: [
            {
                _id: "att1",
                date: "2024-01-01",
                checkIn: { time: "2024-01-01T09:00:00Z" },
                checkOut: { time: "2024-01-01T17:00:00Z" },
                totalHours: 480, // 8 hours
                status: "present"
            }
        ],
        totalPages: 1,
        total: 1
    };

    beforeEach(() => {
        (userService.getById as any).mockResolvedValue(mockEmployee);
        (attendanceService.getAll as any).mockResolvedValue(mockAttendanceData);
    });

    it("renders employee details and attendance table", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={["/attendance/emp1"]}>
                    <Routes>
                        <Route path="/attendance/:employeeId" element={<EmployeeAttendanceDetail />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Use findBy to wait for the element to appear
        expect(await screen.findByText("John Doe")).toBeInTheDocument();
        // Use regex for loose matching on date/time formatting
        expect(screen.getAllByText(/Jan 01/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0);
        expect(screen.getByText("present")).toBeInTheDocument();
    });

    it("changes filter type", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={["/attendance/emp1"]}>
                    <Routes>
                        <Route path="/attendance/:employeeId" element={<EmployeeAttendanceDetail />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("weekly")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("monthly"));

        // Since we mock dates, the effect is internal state change.
        // We mainly verify the button click is handled.
        // The service call is triggered by useQuery dependencies changing.
        expect(screen.getByText("monthly")).toHaveClass("bg-surface text-primary");
    });

    it("displays correct summary stats", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={["/attendance/emp1"]}>
                    <Routes>
                        <Route path="/attendance/:employeeId" element={<EmployeeAttendanceDetail />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("1 Days")).toBeInTheDocument(); // Total present
        });
    });
});

