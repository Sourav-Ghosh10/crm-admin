import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { announcementService } from "../../services/announcementService";
import type {
    Announcement,
    AnnouncementFilters,
    AnnouncementPriority,
    AnnouncementCategory
} from "../../types/announcement.types";
import Button from "../../components/common/Button";
import { SearchInput } from "../../components/common/Search/SearchInput";
import FilterDropdown from "../../components/common/Filter/FilterDropdown";
import Pagination from "../../components/common/Pagination";
import { useDebounce } from "../../hooks/useDebounce";
import { useConfirmation } from "../../hooks/useConfirmation";
import { getErrorMessage } from "../../utils/errorHandling";
import UnifiedFilter from "../../components/common/Filter/UnifiedFilter";
import GlobalLoader from "../../components/common/LoadingSpinner/GlobalLoader";
import AnnouncementTable from "../../components/Announcements/AnnouncementTable";

const AnnouncementsList: React.FC = () => {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Filter states
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);

    const { confirm, ConfirmationDialog } = useConfirmation();

    const fetchAnnouncements = useCallback(async () => {
        try {
            setLoading(true);
            const apiFilters: AnnouncementFilters = {
                page,
                limit,
                search: debouncedSearchTerm || undefined,
                priority: priorityFilter !== "all" ? (priorityFilter as AnnouncementPriority) : undefined,
                category: categoryFilter !== "all" ? (categoryFilter as AnnouncementCategory) : undefined,
            };

            const response = await announcementService.getAll(apiFilters);
            setAnnouncements(response.data);
            setTotalPages(response.pagination.pages);
            setTotalResults(response.pagination.total);
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    }, [page, limit, debouncedSearchTerm, priorityFilter, categoryFilter]);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, priorityFilter, categoryFilter, limit]);

    const handleDelete = async (announcement: Announcement) => {
        const confirmed = await confirm({
            title: "Delete Announcement",
            message: `Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`,
            confirmLabel: "Delete",
            variant: "danger"
        });

        if (confirmed) {
            try {
                await announcementService.delete(announcement.id);
                fetchAnnouncements();
            } catch (error) {
                const errorMessage = getErrorMessage(error, "Failed to delete announcement");
                alert(errorMessage);
            }
        }
    };

    const handleEdit = (announcement: Announcement) => {
        navigate(`/announcements/edit/${announcement.id}`);
    };

    const handleAdd = () => {
        navigate("/announcements/create");
    };

    if (isInitialLoading) {
        return <GlobalLoader fullScreen message="Loading Announcements..." />;
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 px-2 sm:px-0 mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                        Announcements
                        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold tracking-widest uppercase align-middle border border-primary/20">
                            {totalResults} Total
                        </span>
                    </h1>
                    <p className="text-sm sm:text-base text-foreground-tertiary mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Manage company-wide updates and news.
                    </p>
                </div>
                <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
                    <Button
                        onClick={handleAdd}
                        startIcon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
                    >
                        Create Announcement
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <div className="lg:col-span-2">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search announcements..."
                        className="bg-surface/50"
                    />
                </div>

                <div className="lg:col-span-2 flex justify-start gap-2">
                    <UnifiedFilter
                        filters={[
                            {
                                id: "priority",
                                label: "Priority",
                                value: priorityFilter,
                                onChange: setPriorityFilter,
                                options: [
                                    { value: "all", label: "All Priorities" },
                                    { value: "low", label: "Low" },
                                    { value: "medium", label: "Medium" },
                                    { value: "high", label: "High" },
                                    { value: "critical", label: "Critical" },
                                ]
                            },
                            {
                                id: "category",
                                label: "Category",
                                value: categoryFilter,
                                onChange: setCategoryFilter,
                                options: [
                                    { value: "all", label: "All Categories" },
                                    { value: "general", label: "General" },
                                    { value: "policy", label: "Policy" },
                                    { value: "event", label: "Event" },
                                    { value: "holiday", label: "Holiday" },
                                    { value: "other", label: "Other" },
                                ]
                            }
                        ]}
                    />
                </div>
            </div>

            <AnnouncementTable
                announcements={announcements}
                isLoading={loading}
                searchTerm={debouncedSearchTerm}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-4">
                <div className="flex items-center gap-3">
                    <p className="text-xs sm:text-sm font-bold text-foreground-tertiary uppercase tracking-widest bg-muted/50 px-3 sm:px-4 py-2 rounded-2xl border border-border/30">
                        Page <span className="text-primary">{page}</span> of {totalPages || 1} (Total: {totalResults})
                    </p>
                    <div className="relative group">
                        <FilterDropdown
                            value={limit.toString()}
                            options={[5, 10, 20, 50].map(v => ({ value: v.toString(), label: `${v} / Page` }))}
                            onChange={(v) => {
                                setLimit(Number(v));
                                setPage(1);
                            }}
                            className="h-9 px-3 rounded-xl border-border/50 text-xs font-bold text-foreground-tertiary pr-8"
                            align="start"
                        />
                    </div>
                </div>

                {totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                )}
            </div>
            {ConfirmationDialog}
        </div>
    );
};

export default AnnouncementsList;

