import api from "./api";

export interface ReportParams {
    type: 'exception' | 'offday_work' | 'holiday' | 'attendance' | 'leave';
    format: 'pdf' | 'csv';
    startDate?: string;
    endDate?: string;
    department?: string;
    year?: number;
    status?: string;
}

export const reportService = {
    generateReport: async (params: ReportParams) => {
        try {
            const response = await api.get("/reports/generate", {
                params,
                responseType: 'blob',
            });

            // Create a URL for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Suggest a filename
            const filename = `${params.type}_report_${new Date().getTime()}.${params.format}`;
            link.setAttribute('download', filename);

            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download report:", error);
            throw error;
        }
    }
};
