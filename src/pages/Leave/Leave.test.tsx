import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../store/slices/authSlice";
import Leave from "./Leave";
import { leaveService } from "../../services/leaveService";
import { jest } from "@jest/globals";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../services/leaveService");

const createMockStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            auth: authReducer
        },
        preloadedState: {
            auth: {
                user: { _id: "admin1", isAdmin: true, permissions: { canApproveLeave: true } } as any,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                error: null,
                ...initialState
            } as any
        }
    });
};

describe("Leave Page", () => {
    beforeEach(() => {
        (leaveService.getStats as any).mockResolvedValue({
            pendingApprovals: 5,
            approvedToday: 2,
            rejectedTotal: 1,
            totalRequests: 10
        });
        (leaveService.getRequests as any).mockResolvedValue({
            data: [],
            pagination: { total: 0, page: 1, limit: 10, totalPages: 1 }
        });
    });

    it("renders leave page and stats", async () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Leave />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Loading Leave Approvals/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/Leave Approvals/i)).toBeInTheDocument();
            expect(screen.getByText("5")).toBeInTheDocument(); // pendingApprovals
            expect(screen.getByText("2")).toBeInTheDocument(); // approvedToday
        });
    });

    it("shows empty state when no requests", async () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <Leave />
                </MemoryRouter>
            </Provider>
        );

        await waitFor(() => {
            const noRequestsElements = screen.getAllByText(/No Leave Requests/i);
            expect(noRequestsElements.length).toBeGreaterThan(0);
        });
    });
});

