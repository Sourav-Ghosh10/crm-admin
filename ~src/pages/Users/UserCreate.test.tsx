import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserCreate from "./UserCreate";
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

describe("UserCreate Page", () => {
    beforeEach(() => {
        (userService.getById as any).mockResolvedValue({});
        (locationService.getAll as any).mockResolvedValue({ data: [] });
        (departmentService.getAll as any).mockResolvedValue({ data: [] });
        (designationService.getAll as any).mockResolvedValue({ data: [] });
        (userService.getAll as any).mockResolvedValue({ users: [] });
        (leaveTypeService.getAll as any).mockResolvedValue({ data: [] });
        (roleService.getAll as any).mockResolvedValue({ data: [] });
    });

    it("renders user form", async () => {
        render(
            <MemoryRouter>
                <UserCreate />
            </MemoryRouter>
        );

        await waitFor(() => {
            // Check for something inside UserForm (rendered by UserCreate)
            expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
        });
    });
});

