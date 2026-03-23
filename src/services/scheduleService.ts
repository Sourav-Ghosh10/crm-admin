import api from "./api";
import type {
    ScheduleFilters,
    PaginatedScheduleResponse
} from "../types/schedule.types";

export const scheduleService = {
    getAll: async (filters: ScheduleFilters = {}): Promise<PaginatedScheduleResponse> => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.employeeName) params.append("employeeName", filters.employeeName);
        if (filters.search) params.append("search", filters.search);
        if (filters.employeeIds) {
            filters.employeeIds.forEach(id => params.append("employeeIds", id));
        }
        if (filters.clientName) params.append("clientName", filters.clientName);
        if (filters.department) params.append("department", filters.department);
        if (filters.isPublished !== undefined) params.append("isPublished", String(filters.isPublished));
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));

        const response = await api.get(`/schedules/all?${params.toString()}`);
        return response.data;
    },

    list: async (filters: ScheduleFilters = {}): Promise<{ data: Record<string, unknown>[], pagination: Record<string, unknown> }> => {
        const params = new URLSearchParams();
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        if (filters.isPublished !== undefined) params.append("isPublished", String(filters.isPublished));

        const response = await api.get(`/schedules?${params.toString()}`);
        return response.data;
    },

    getById: async (id: string): Promise<Record<string, unknown>> => {
        const response = await api.get(`/schedules/${id}`);
        return response.data.data;
    },

    getRoster: async (id: string, filters: ScheduleFilters = {}): Promise<PaginatedScheduleResponse> => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.search) params.append("search", filters.search);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));

        const response = await api.get(`/schedules/${id}/roster?${params.toString()}`);
        return response.data;
    },

    create: async (data: Record<string, unknown>): Promise<{ success: boolean; data: unknown }> => {
        const response = await api.post("/schedules", data);
        return response.data;
    },

    update: async (id: string, data: Record<string, unknown>): Promise<{ success: boolean; data: unknown }> => {
        const response = await api.put(`/schedules/${id}`, data);
        return response.data;
    },
    bulkUpdate: async (data: Record<string, unknown>[]): Promise<{ success: boolean; data: unknown }> => {
        const response = await api.put("/schedules/bulk-update", data);
        return response.data;
    },
    getByDateSummary: async (filters: ScheduleFilters = {}): Promise<Record<string, unknown>> => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.limit) params.append("dailyUserLimit", String(filters.limit));
        if (filters.page) params.append("page", String(filters.page));
        if (filters.department) params.append("department", filters.department);

        const response = await api.get(`/schedules/users-by-date?${params.toString()}`);
        return response.data;
    }
};
