import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../store/slices/authSlice";
import Attendance from "./Attendance";
import { attendanceService } from "../../services/attendanceService";
import { departmentService } from "../../services/departmentService";
import { designationService } from "../../services/designationService";
import { jest } from "@jest/globals";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../services/attendanceService");
jest.mock("../../services/departmentService");
jest.mock("../../services/designationService");

const createMockStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            auth: authReducer
        },
        preloadedState: {
            auth: {
                user: { _id: "admin1", isAdmin: true } as any,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                error: null,
                ...initialState
            } as any
        }
    });
};

describe("Attendance Page", () => {
    beforeEach(() => {
        (attendanceService.getAll as any).mockResolvedValue({
            attendances: [],
            total: 0,
            totalPages: 1
        });
        (departmentService.getAll as any).mockResolvedValue({ data: [] });
        (designationService.getAll as any).mockResolvedValue({ data: [] });
    });

    it("renders attendance page", async () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Attendance />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Loading Attendance Records/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/Attendance Log/i)).toBeInTheDocument();
        });
    });

    it("shows search input and filters", async () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Attendance />
                </MemoryRouter>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Search by employee name/i)).toBeInTheDocument();
        });
    });
});

