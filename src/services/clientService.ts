import api from "./api";
import type { Client, CreateClientRequest, UpdateClientRequest, ClientFilters, PaginatedClientResponse } from "../types/client.types";

const normalizeValue = (value: unknown): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'object' && value !== null && '$oid' in value) {
        return (value as { $oid: string }).$oid;
    }
    if (Array.isArray(value)) {
        return value.map(normalizeValue);
    }
    if (typeof value === 'object') {
        const normalized: Record<string, unknown> = {};
        const valObj = value as Record<string, unknown>;
        for (const key in valObj) {
            if (Object.prototype.hasOwnProperty.call(valObj, key)) {
                normalized[key] = normalizeValue(valObj[key]);
            }
        }
        return normalized;
    }
    return value;
};

const mapClient = (client: any): Client => {
    if (!client) return client;
    const normalized = normalizeValue(client) as any;
    const idValue = normalized._id || normalized.id || "";
    return {
        ...normalized,
        id: idValue,
    } as Client;
};

export const clientService = {
    getAll: async (params?: ClientFilters): Promise<PaginatedClientResponse> => {
        const response = await api.get("/clients", { params });
        const root = response.data;
        const data = root.data || root;
        const pagination = root.pagination;

        // Structured pagination response
        if (Array.isArray(data) && pagination) {
            return {
                clients: data.map(mapClient),
                total: pagination.total || data.length,
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                totalPages: pagination.pages || pagination.totalPages || 1
            };
        }

        // Nested structure { clients: [], total: ... }
        if (data && typeof data === 'object' && 'clients' in data && Array.isArray((data as any).clients)) {
            const d = data as any;
            return {
                clients: d.clients.map(mapClient),
                total: d.total || d.clients.length,
                page: d.page || 1,
                limit: d.limit || 10,
                totalPages: d.totalPages || 1
            };
        }

        // Fallback: Simple array response
        const clients = Array.isArray(data) ? data.map(mapClient) : [];
        return {
            clients,
            total: clients.length,
            page: 1,
            limit: clients.length || 10,
            totalPages: 1
        };
    },

    getById: async (id: string): Promise<Client> => {
        const response = await api.get(`/clients/${id}`);
        return mapClient(response.data.data || response.data);
    },

    create: async (data: CreateClientRequest): Promise<Client> => {
        const response = await api.post("/clients", data);
        return mapClient(response.data.data || response.data);
    },

    update: async (data: UpdateClientRequest): Promise<Client> => {
        const { id, ...rest } = data;
        const response = await api.patch(`/clients/${id}`, rest);
        return mapClient(response.data.data || response.data);
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/clients/${id}`);
    },

    assignEmployees: async (clientId: string, employeeIds: string[]): Promise<Client> => {
        const response = await api.post(`/clients/${clientId}/assign`, { employeeIds });
        return response.data.data || response.data;
    }
};
