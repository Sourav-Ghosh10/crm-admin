import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AnnouncementFormPage from "./AnnouncementFormPage";
import { announcementService } from "../../services/announcementService";
import { departmentService } from "../../services/departmentService";
import { locationService } from "../../services/locationService";
import { jest } from "@jest/globals";

jest.mock("../../services/announcementService");
jest.mock("../../services/departmentService");
jest.mock("../../services/locationService");

describe("AnnouncementFormPage", () => {
    beforeEach(() => {
        (announcementService.getById as any).mockResolvedValue({ data: {} });
        (departmentService.getAll as any).mockResolvedValue({ data: [] });
        (locationService.getAll as any).mockResolvedValue({ data: [] });
    });

    it("renders create mode correctly", async () => {
        render(
            <MemoryRouter initialEntries={["/announcements/create"]}>
                <Routes>
                    <Route path="/announcements/create" element={<AnnouncementFormPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Create New Announcement/i)).toBeInTheDocument();
        });
    });

    it("renders edit mode correctly", async () => {
        const mockAnnouncement = {
            _id: "123",
            title: "Test Announcement",
            content: "Content",
            priority: "medium",
            type: "info"
        };
        (announcementService.getById as any).mockResolvedValue({ data: mockAnnouncement });

        render(
            <MemoryRouter initialEntries={["/announcements/123/edit"]}>
                <Routes>
                    <Route path="/announcements/:id/edit" element={<AnnouncementFormPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Edit Announcement/i)).toBeInTheDocument();
        });
    });
});

