import React, { useState } from "react";
import {
  Plus,
  Edit,
  Eye,
  UserCheck,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { User, UserFilters, EmploymentType } from "../../types/user.types";

import { useDebounce } from "../../hooks/useDebounce";
import { useConfirmation } from "../../hooks/useConfirmation";
import { cn } from "../../lib/utils";
import Button from "../../components/common/Button";
import Avatar from "../../components/common/Avatar";
import Table from "../../components/common/Table";
import { userService } from "../../services/userService";
import { departmentService } from "../../services/departmentService";
import type { Department } from "../../types/organization.types";
import GlobalLoader from "../../components/common/LoadingSpinner/GlobalLoader";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import UnifiedFilter from "../../components/common/Filter/UnifiedFilter";
import FilterDropdown from "../../components/common/Filter/FilterDropdown";
import Pagination from "../../components/common/Pagination";
import { getErrorMessage } from "../../utils/errorHandling";
import { SearchInput } from "../../components/common/Search/SearchInput";

const getStatusBadge = (isActive: boolean) => {
  return (
    <span
      className={cn(
        "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
        isActive
          ? "bg-success/10 text-success border border-success/20 shadow-sm shadow-success/5"
          : "bg-muted text-foreground-tertiary border border-border shadow-sm",
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const getRoleBadge = (role: string) => {
  const variants: Record<string, string> = {
    admin: "bg-primary/10 text-primary border-primary/20",
    hr: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    manager: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    employee: "bg-blue-500/10 text-blue-600 border-blue-500/20"
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
      variants[role.toLowerCase()] || variants.employee
    )}>
      {role}
    </span>
  );
};

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 700);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [hasData, setHasData] = useState(true); // Track if any data exists
  const [departments, setDepartments] = useState<Department[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { confirm, ConfirmationDialog } = useConfirmation();

  const fetchUsers = React.useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      const filters: UserFilters = {
        page: currentPage,
        limit,
      };

      if (debouncedSearchTerm.trim()) {
        filters.search = debouncedSearchTerm.trim();
      }

      if (statusFilter === "active") filters.isActive = true;
      if (statusFilter === "inactive") filters.isActive = false;

      if (deptFilter !== "all") {
        filters.department = deptFilter;
      }

      if (typeFilter !== "all") {
        filters.employmentType = typeFilter as EmploymentType;
      }

      const response = await userService.getAll(filters);
      setUsers(response.users);
      setTotal(response.total);
      setTotalPages(response.totalPages);

      // Only disable search if there's no data AND no active filters/search
      const hasActiveFilters = debouncedSearchTerm.trim() || statusFilter !== "all" || deptFilter !== "all" || typeFilter !== "all";
      if (!hasActiveFilters && response.total === 0) {
        setHasData(false);
      } else if (response.total > 0) {
        setHasData(true);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [debouncedSearchTerm, statusFilter, deptFilter, typeFilter, limit]);

  // Fetch departments on mount
  React.useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await departmentService.getAll({ limit: 100, isActive: true });
        setDepartments(response.data);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    loadDepartments();
  }, []);

  // Handle search, status filter, and limit changes
  React.useEffect(() => {
    setPage(1);
    fetchUsers(1);
  }, [fetchUsers]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchUsers(newPage);
  };

  const handleAddUser = () => {
    navigate("/users/create");
  };

  const handleEditUser = (user: User) => {
    navigate(`/users/edit/${user._id}`);
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? "deactivate" : "activate";
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} this user?`,
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      variant: user.isActive ? 'danger' : 'info'
    });

    if (confirmed) {
      try {
        await userService.delete(user._id, !user.isActive);
        await fetchUsers(page);
      } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        const errorMessage = getErrorMessage(error, `Failed to ${action} user`);
        const errorMessageStr = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;
        await confirm({
          title: "Error",
          message: errorMessageStr,
          confirmLabel: "OK",
          variant: "danger"
        });
      }
    }
  };

  const columns = [
    {
      _id: "name",
      label: "Employee Profile",
      format: (_: unknown, row: User) => (
        <Button
          variant="ghost"
          onClick={() => navigate(`/users/${row._id}`)}
          className="group text-left h-auto p-0 hover:bg-transparent flex items-center gap-4 py-1"
        >
          <div className="relative">
            <Avatar
              src={row.personalInfo.profilePicture}
              firstName={row.personalInfo.firstName}
              lastName={row.personalInfo.lastName}
              size="lg"
              className="group-hover:scale-105 group-hover:rotate-3 transition-transform"
            />
            <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface", row.isActive ? "bg-success" : "bg-border")} />
          </div>
          <div>
            <div className="font-bold text-foreground group-hover:text-primary transition-colors text-base leading-snug">
              {row.personalInfo.firstName} {row.personalInfo.lastName}
            </div>
            <div className="text-xs font-medium text-foreground-tertiary flex items-center gap-2">
              <span className="bg-muted px-1.5 py-0.5 rounded-md border border-border/50">{row.employeeId}</span>
              <span className="opacity-30">•</span>
              <span className="truncate max-w-[150px]">{row.personalInfo.email}</span>
            </div>
          </div>
        </Button>
      ),
    },
    {
      _id: "role",
      label: "Authority",
      format: (_: unknown, row: User) => getRoleBadge(row.employment.role),
    },
    {
      _id: "department",
      label: "Division & Role",
      format: (_: unknown, row: User) => (
        <div className="space-y-1">
          <div className="font-bold text-foreground-secondary text-sm">{row.employment.department}</div>
          <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-tighter bg-muted/50 px-2 py-0.5 rounded-lg border border-border/30 w-fit">
            {row.employment.designation}
          </div>
        </div>
      )
    },
    {
      _id: "status",
      label: "Availability",
      format: (_: unknown, row: User) => getStatusBadge(row.isActive),
    },
    {
      _id: "actions",
      label: "Actions",
      align: "center" as const,
      format: (_: unknown, row: User) => (
        <div className="flex items-center justify-center gap-2 pr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/users/${row._id}`)}
            className="w-9 h-9 rounded-xl hover:bg-primary/10 hover:text-primary text-foreground-secondary transition-all group"
            title="View Insight"
          >
            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditUser(row)}
            className="w-9 h-9 rounded-xl hover:bg-accent/10 hover:text-foreground text-foreground-secondary transition-all group"
            title="Modify"
          >
            <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleStatus(row)}
            className={cn(
              "w-9 h-9 rounded-xl transition-all group",
              row.isActive
                ? "hover:bg-warning/10 hover:text-warning text-foreground-secondary"
                : "hover:bg-success/10 hover:text-success text-foreground-secondary"
            )}
            title={row.isActive ? "Deactivate User" : "Activate User"}
          >
            {row.isActive ? (
              <UserX className="w-4 h-4 group-hover:scale-110 transition-transform" />
            ) : (
              <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  if (isInitialLoading) {
    return <GlobalLoader fullScreen message="Loading Directory..." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 px-2 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">User Directory</h1>
          <p className="text-sm sm:text-base text-foreground-tertiary mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Manage and monitor your global workforce efficiency.
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
          {/* <Button
            variant="outline"
            // className="rounded-2xl border-border px-3 sm:px-5 flex text-sm"
            startIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button> */}
          <Button
            onClick={handleAddUser}
            // className="rounded-2xl px-4 sm:px-8 shadow-xl shadow-primary/20 text-sm sm:text-base flex-1 md:flex-none"
            startIcon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
          >
            Onboard Talent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        <div className="lg:col-span-2">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search name, ID..."
            disabled={!hasData}
            className={!hasData ? "opacity-50 cursor-not-allowed bg-muted/30" : ""}
          />
        </div>

        <div className="lg:col-span-2 flex justify-start gap-2">
          <UnifiedFilter
            filters={[
              {
                id: "dept",
                label: "Department",
                value: deptFilter,
                onChange: setDeptFilter,
                options: [
                  { value: "all", label: "All Departments" },
                  ...departments.map(d => ({ value: d.name, label: d.name }))
                ]
              },
              {
                id: "type",
                label: "Employment Type",
                value: typeFilter,
                onChange: setTypeFilter,
                options: [
                  { value: "all", label: "All Types" },
                  { value: "full-time", label: "Full-Time" },
                  { value: "part-time", label: "Part-Time" },
                  { value: "contract", label: "Contract" },
                  { value: "intern", label: "Intern" },
                ]
              },
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]
              }
            ]}
          />
        </div>
      </div>

      <div className="bg-surface rounded-xl sm:rounded-xl border border-border/40 shadow-2xl shadow-black/[0.03] overflow-hidden relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">Syncing Directory...</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={users}
            className="border-none min-w-[640px]"
            emptyState={
              <EmptyState
                title="No personnel found"
                description={searchTerm ? `No results for "${searchTerm}"` : "The directory is currently empty."}
                className="py-20"
              />
            }
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-4">
        <div className="flex items-center gap-3">
          <p className="text-xs sm:text-sm font-bold text-foreground-tertiary uppercase tracking-widest bg-muted/50 px-3 sm:px-4 py-2 rounded-2xl border border-border/30">
            Page <span className="text-primary">{page}</span> of {totalPages || 1} (Total: {total})
          </p>
          <div className="relative group">
            <FilterDropdown
              value={limit.toString()}
              options={[6, 12, 24, 50].map(v => ({ value: v.toString(), label: `${v} / Page` }))}
              onChange={(v) => handleLimitChange(Number(v))}
              className="
              h-9 px-3 rounded-xl border-border/50
              text-xs font-bold text-foreground-tertiary
              pr-8
              hover:text-foreground-tertiary
              focus:text-foreground-tertiary
              data-[state=open]:text-foreground-tertiary
            "
              align="start"
            />
          </div>
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
      {ConfirmationDialog}
    </div>
  );
};

export default UserList;
