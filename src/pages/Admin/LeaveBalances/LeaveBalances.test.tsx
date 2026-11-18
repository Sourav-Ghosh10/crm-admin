import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LeaveBalances from "./LeaveBalances";
import { leaveService } from "../../../services/leaveService";
import { departmentService } from "../../../services/departmentService";
import { locationService } from "../../../services/locationService";
import { jest } from "@jest/globals";
import type {
    EmployeeLeaveBalanceResponse,
    PaginatedEmployeeBalancesResponse,
} from "../../../types/leave.types";
import type { Department, OfficeLocation, PaginatedResponse } from "../../../types/organization.types";

jest.mock("../../../services/leaveService");
jest.mock("../../../services/departmentService");
jest.mock("../../../services/locationService");
jest.mock("../../../hooks/useDebounce", () => ({
    useDebounce: <T,>(value: T) => value,
}));

describe("LeaveBalances Page", () => {
    const mockLeaveTypes = [
        { _id: "lt1", name: "Casual Leave", code: "CL", isPaid: true, defaultAmount: 6 },
        { _id: "lt2", name: "Sick Leave", code: "SL", isPaid: true, defaultAmount: 5 },
    ];

    const mockRow = {
        _id: "u1",
        userId: "u1",
        employeeId: "EMP001",
        username: "john",
        personalInfo: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            profilePicture: null,
        },
        employment: {
            designation: "Dev",
            department: "Engineering",
            location: "Kolkata",
        },
        isPaidLeaveApplicable: true,
        leaveBalances: [
            {
                leaveTypeId: "lt1",
                name: "Casual Leave",
                code: "CL",
                isPaid: true,
                allocated: 6,
                approved: 1,
                pending: 0,
                used: 1,
                available: 5,
            },
            {
                leaveTypeId: "lt2",
                name: "Sick Leave",
                code: "SL",
                isPaid: true,
                allocated: 5,
                approved: 0,
                pending: 0,
                used: 0,
                available: 5,
            },
        ],
        totalLeaveBalance: 11,
        approvedLeaves: 1,
        pendingLeaves: 0,
        usedLeaves: 1,
        availableBalance: 10,
    };

    beforeEach(() => {
        jest.mocked(leaveService.getAllEmployeeBalances).mockResolvedValue({
            leaveTypes: mockLeaveTypes,
            data: [mockRow],
            pagination: { total: 1, page: 1, limit: 10, pages: 1 },
        } as unknown as PaginatedEmployeeBalancesResponse);
        jest.mocked(leaveService.getEmployeeBalance).mockResolvedValue({
            balances: [
                {
                    leaveTypeId: "lt1",
                    name: "Casual Leave",
                    code: "CL",
                    currentBalance: 5,
                    totalAllocated: 6,
                    used: 1,
                    isPaid: true,
                },
                {
                    leaveTypeId: "lt2",
                    name: "Sick Leave",
                    code: "SL",
                    currentBalance: 5,
                    totalAllocated: 5,
                    used: 0,
                    isPaid: true,
                },
            ],
            userId: "u1",
            name: "John Doe",
            department: "Engineering",
            totalLeaveBalance: 11,
            globalAvailableBalance: 10,
        } as unknown as EmployeeLeaveBalanceResponse);
        jest.mocked(leaveService.updateEmployeeBalance).mockResolvedValue({
            userId: "u1",
            totalLeaveBalance: 15,
            leaveBalance: { "Casual Leave": 8, "Sick Leave": 7 },
        });
        jest.mocked(departmentService.getAll).mockResolvedValue({
            data: [],
            total: 0,
            page: 1,
            limit: 100,
            totalPages: 1,
        } as unknown as PaginatedResponse<Department>);
        jest.mocked(locationService.getAll).mockResolvedValue({
            data: [],
            total: 0,
            page: 1,
            limit: 100,
            totalPages: 1,
        } as unknown as PaginatedResponse<OfficeLocation>);
    });

    it("renders all employees with individual leave type columns", async () => {
        render(
            <MemoryRouter>
                <LeaveBalances />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
            expect(screen.getByText(/Casual Leave \(CL\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Sick Leave \(SL\)/i)).toBeInTheDocument();
            expect(screen.getByText(/5 \/ 6/i)).toBeInTheDocument();
            expect(screen.getByText(/5 \/ 5/i)).toBeInTheDocument();
        });
    });

    it("allows editing individual leave type balances in modal", async () => {
        render(
            <MemoryRouter>
                <LeaveBalances />
            </MemoryRouter>
        );

        const editBtn = await screen.findByRole("button", { name: /Edit Balances/i });
        fireEvent.click(editBtn);

        const clInput = await screen.findByLabelText(/Casual Leave balance/i);
        const slInput = screen.getByLabelText(/Sick Leave balance/i);

        fireEvent.change(clInput, { target: { value: "8" } });
        fireEvent.change(slInput, { target: { value: "7" } });

        const saveBtn = screen.getByRole("button", { name: /Save Balances/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(leaveService.updateEmployeeBalance).toHaveBeenCalledWith("u1", {
                "Casual Leave": 8,
                "Sick Leave": 7,
            });
        });
    });

    it("loads user edit modal from URL", async () => {
        render(
            <MemoryRouter initialEntries={["/admin/leave-balances/u1"]}>
                <Routes>
                    <Route path="/admin/leave-balances/:userId" element={<LeaveBalances />} />
                    <Route path="/admin/leave-balances" element={<LeaveBalances />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(leaveService.getEmployeeBalance).toHaveBeenCalledWith("u1");
            expect(screen.getByLabelText(/Casual Leave balance/i)).toBeInTheDocument();
        });
    });
});
