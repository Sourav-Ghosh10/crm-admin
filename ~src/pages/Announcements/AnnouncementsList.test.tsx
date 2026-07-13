import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AnnouncementsList from "./AnnouncementsList";
import { announcementService } from "../../services/announcementService";
import { jest } from "@jest/globals";

jest.mock("../../services/announcementService");

describe("AnnouncementsList Page", () => {
    beforeEach(() => {
        (announcementService.getAll as any).mockResolvedValue({
            data: [
                { id: "1", title: "Company Update", priority: "high", category: "general" },
                { id: "2", title: "Holiday Notice", priority: "medium", category: "holiday" }
            ],
            pagination: { total: 2, pages: 1, page: 1, limit: 10 }
        });
    });

    it("renders loading state initially", () => {
        render(
            <MemoryRouter>
                <AnnouncementsList />
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading Announcements/i)).toBeInTheDocument();
    });

    it("renders announcements list after loading", async () => {
        render(
            <MemoryRouter>
                <AnnouncementsList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Announcements")).toBeInTheDocument();
        });
    });

    it("shows Create Announcement button", async () => {
        render(
            <MemoryRouter>
                <AnnouncementsList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Create Announcement/i })).toBeInTheDocument();
        });
    });

    it("shows search input", async () => {
        render(
            <MemoryRouter>
                <AnnouncementsList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Search announcements/i)).toBeInTheDocument();
        });
    });
});

