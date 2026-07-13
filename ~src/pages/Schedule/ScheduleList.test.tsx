import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ScheduleList from "./ScheduleList";
import { scheduleService } from "../../services/scheduleService";
import { userService } from "../../services/userService";
import { locationService } from "../../services/locationService";
import { departmentService } from "../../services/departmentService";
import { holidayService } from "../../services/holidayService";
import { jest } from "@jest/globals";

jest.mock("../../services/scheduleService");
jest.mock("../../services/userService");
jest.mock("../../services/locationService");
jest.mock("../../services/departmentService");
jest.mock("../../services/holidayService");

// Mock child components to simplify testing the parent
jest.mock("./CalendarView", () => () => <div data-testid="calendar-view">CalendarView</div>);
jest.mock("./DaySchedulePanel", () => () => <div data-testid="day-panel">DayPanel</div>);

describe("ScheduleList Page", () => {
    beforeEach(() => {
        (scheduleService.getAll as any).mockResolvedValue({
            data: [],
            pagination: { pages: 1, total: 0 }
        });
        (scheduleService.getByDateSummary as any).mockResolvedValue({
            data: { summary: { shiftData: {} } }
        });
        (userService.getAll as any).mockResolvedValue({ users: [], total: 0 });
        (locationService.getAll as any).mockResolvedValue({ data: [] });
        (departmentService.getAll as any).mockResolvedValue({ data: [] });
        (holidayService.getAll as any).mockResolvedValue({ data: [] });
    });

    it("renders loading state initially", () => {
        // Since GlobalLoader renders "Loading Rosters..."
        render(
            <MemoryRouter>
                <ScheduleList />
            </MemoryRouter>
        );
        expect(screen.getByText(/Loading Rosters/i)).toBeInTheDocument();
    });

    it("renders main dashboard after loading", async () => {
        render(
            <MemoryRouter>
                <ScheduleList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Deployment Rosters")).toBeInTheDocument();
        });
    });

    it("renders filter controls", async () => {
        render(
            <MemoryRouter>
                <ScheduleList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /week/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /month/i })).toBeInTheDocument();
            // Grid/Calendar view toggles use titles
            expect(screen.getByTitle(/Grid View/i)).toBeInTheDocument();
        });
    });

    it("fetches filter data on mount", async () => {
        render(
            <MemoryRouter>
                <ScheduleList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(departmentService.getAll).toHaveBeenCalled();
            expect(locationService.getAll).toHaveBeenCalled();
        });
    });
});

