import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserEdit from "./UserEdit";
import { userService } from "../../services/userService";
import { locationService } from "../../services/locationService";
import { departmentService } from "../../services/departmentService";
import { designationService } from "../../services/designationService";
import { roleService } from "../../services/roleService";
import { leaveTypeService } from "../../services/leaveTypeService";
import { jest } from "@jest/globals";

jest.mock("../../services/userService");
jest.mock("../../services/locationService");
jest.mock("../../services/departmentService");
jest.mock("../../services/designationService");
jest.mock("../../services/roleService");
jest.mock("../../services/leaveTypeService");

describe("UserEdit Page", () => {
    const mockUser = {
        _id: "123",
        personalInfo: { firstName: "John", lastName: "Doe", email: "john@example.com" },
        employment: { role: "admin", department: "IT", designation: "Developer", dateOfJoining: "2023-01-01", employmentType: "full-time" },
        permissions: { modules: [], canApproveLeave: false, canApproveReimbursement: false, canManageSchedule: false, canViewReports: false },
        isActive: true
    };

    beforeEach(() => {
        (userService.getById as any).mockResolvedValue(mockUser);
        (locationService.getAll as any).mockResolvedValue({ data: [] });
        (departmentService.getAll as any).mockResolvedValue({ data: [] });
        (designationService.getAll as any).mockResolvedValue({ data: [] });
        (userService.getAll as any).mockResolvedValue({ users: [] });
        (leaveTypeService.getAll as any).mockResolvedValue({ data: [] });
        (roleService.getAll as any).mockResolvedValue({ data: [] });
    });

    it("renders loading state then user form", async () => {
        render(
            <MemoryRouter initialEntries={["/users/123/edit"]}>
                <Routes>
                    <Route path="/users/:id/edit" element={<UserEdit />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading Personnel File/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/Modify Record/i)).toBeInTheDocument();
            expect(screen.getByText(/Updating profile for John Doe/i)).toBeInTheDocument();
        });
    });

    it("shows error message when user not found", async () => {
        (userService.getById as any).mockResolvedValue(null);

        render(
            <MemoryRouter initialEntries={["/users/999/edit"]}>
                <Routes>
                    <Route path="/users/:id/edit" element={<UserEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Employee Not Found/i)).toBeInTheDocument();
        });
    });
});

