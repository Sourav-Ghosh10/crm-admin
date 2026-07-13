import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveTypeForm from "./LeaveTypeForm";
import { jest } from "@jest/globals";
import { departmentService } from "../../../services/departmentService";
import { designationService } from "../../../services/designationService";

jest.mock("../../../services/departmentService");
jest.mock("../../../services/designationService");

describe("LeaveTypeForm Component", () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    const mockDepartments = {
        data: [
            { _id: "1", name: "IT" },
            { _id: "2", name: "HR" }
        ],
        total: 2
    };

    const mockDesignations = {
        data: [
            { _id: "1", title: "Developer" },
            { _id: "2", title: "Manager" }
        ],
        total: 2
    };

    beforeEach(() => {
        mockOnSubmit.mockClear();
        mockOnCancel.mockClear();
        (departmentService.getAll as any).mockResolvedValue(mockDepartments);
        (designationService.getAll as any).mockResolvedValue(mockDesignations);
    });

    it("renders correctly with initial values", async () => {
        const initialValues = {
            name: "Annual Leave",
            code: "AL",
            defaultAmount: 20,
            resetFrequency: "yearly" as const,
            applicableDepartments: ["IT"],
            applicableDesignations: ["Developer"]
        };

        render(
            <LeaveTypeForm
                initialValues={initialValues}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Leave Type Name/i)).toHaveValue("Annual Leave");
            expect(screen.getByLabelText(/Code/i)).toHaveValue("AL");
        });
    });

    it("submits the form with user input", async () => {
        render(
            <LeaveTypeForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        await userEvent.type(screen.getByLabelText(/Leave Type Name/i), "Sick Leave");
        await userEvent.type(screen.getByLabelText(/Code/i), "SL");
        await userEvent.clear(screen.getByLabelText(/Annual\/Monthly Allowance/i));
        await userEvent.type(screen.getByLabelText(/Annual\/Monthly Allowance/i), "12");

        // Note: MultiSelectSearch might need more complex interaction if it's not a standard select
        // For now, let's assume the default values are valid enough to trigger submit

        fireEvent.click(screen.getByRole("button", { name: /Create Leave Type/i }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalled();
        });
    });
});

