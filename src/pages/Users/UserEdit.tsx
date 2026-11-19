import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, ShieldAlert } from "lucide-react";
import UserForm from "./UserForm";
import type { User } from "../../types/user.types";
import Button from "../../components/common/Button";
import BackButton from "../../components/common/BackButton";
import { userService } from "../../services/userService";
import { locationService } from "../../services/locationService";
import { departmentService } from "../../services/departmentService";
import { designationService } from "../../services/designationService";
import { leaveTypeService } from "../../services/leaveTypeService";
import type { OfficeLocation, Department, Designation, LeaveType } from "../../types/organization.types";
import { getErrorMessage } from "../../utils/errorHandling";
import { useAppSelector } from "../../store/hooks";

import { roleService } from "../../services/roleService";
import type { Role } from "../../types/role.types";

const UserEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [locations, setLocations] = useState<OfficeLocation[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | string[] | null>(null);

    // Search and Pagination state for managers
    const [userSearchText, setUserSearchText] = useState("");
    const [userPage, setUserPage] = useState(1);
    const [hasMoreUsers, setHasMoreUsers] = useState(true);
    const [isUsersLoadingMore, setIsUsersLoadingMore] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [userData, locRes, deptRes, desigRes, userRes, leaveTypeRes, roleRes] = await Promise.all([
                    userService.getById(id),
                    locationService.getAll({ limit: 100, isActive: true }),
                    departmentService.getAll({ limit: 100, isActive: true }),
                    designationService.getAll({ limit: 100, isActive: true }),
                    userService.getAll({ limit: 20, isActive: true }),
                    leaveTypeService.getAll({ limit: 100, isActive: true }),
                    roleService.getAll({ limit: 100, isActive: true }),
                ]);
                setUser(userData);
                setLocations(locRes.data);
                setDepartments(deptRes.data);
                setDesignations(desigRes.data);
                setUsers(userRes.users);
                setLeaveTypes(leaveTypeRes.data);
                setRoles(roleRes.data);
                setHasMoreUsers(userRes.page < userRes.totalPages);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleSearchUsers = React.useCallback(async (search: string) => {
        const trimmed = search.trim();
        setUserSearchText(trimmed);
        setUserPage(1);
        try {
            const res = await userService.getAll({ 
                search: trimmed || undefined, 
                limit: 20, 
                isActive: true, 
                page: 1 
            });
            setUsers(res.users);
            setHasMoreUsers(res.page < res.totalPages);
        } catch (err) {
            console.error("Search failed:", err);
        }
    }, []);

    const handleLoadMoreUsers = React.useCallback(async () => {
        if (!hasMoreUsers || isUsersLoadingMore) return;
        setIsUsersLoadingMore(true);
        try {
            const nextPage = userPage + 1;
            const res = await userService.getAll({ 
                search: userSearchText || undefined, 
                limit: 20, 
                isActive: true, 
                page: nextPage 
            });
            setUsers(prev => [...prev, ...res.users]);
            setUserPage(nextPage);
            setHasMoreUsers(res.page < res.totalPages);
        } catch (err) {
            console.error("Load more failed:", err);
        } finally {
            setIsUsersLoadingMore(false);
        }
    }, [hasMoreUsers, isUsersLoadingMore, userPage, userSearchText]);

    const authUser = useAppSelector((state) => state.auth.user);
    const isSelf = Boolean(
        authUser && user && (
            String(authUser._id || authUser.id) === String(user._id || user.id) ||
            (authUser.employeeId && authUser.employeeId === user.employeeId)
        )
    );

    const handleSave = async (data: Partial<User>) => {
        if (!id || isSelf) return;
        setSaving(true);
        setError(null);
        try {
            await userService.update(id, data);
            navigate(`/users/${id}`);
        } catch (error) {
            console.error(error);
            const errorMessage = getErrorMessage(error, "Failed to update user");
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-foreground-secondary font-medium uppercase tracking-widest text-xs">Loading Personnel File...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Employee Not Found</h2>
                <Button onClick={() => navigate(-1)} className="mt-4">Return to Directory</Button>
            </div>
        );
    }

    if (isSelf) {
        return (
            <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-surface border border-error/20 shadow-2xl text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto border border-error/20">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground">Self-Editing Restricted</h2>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                    You cannot edit your own profile from the Administrator portal. If any of your details need modification, please contact another administrator.
                </p>
                <div className="pt-3 flex items-center justify-center gap-3">
                    <Button onClick={() => navigate(`/users/${id}`)} variant="default">
                        View My Profile
                    </Button>
                    <Button onClick={() => navigate('/users')} variant="secondaryOutline">
                        Return to Directory
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <BackButton label="Back to Profile" className="mb-4" />
                    <div>
                        <h1 className="text-3xl font-black text-foreground">Modify Record</h1>
                        <p className="text-foreground-tertiary font-medium">Updating profile for {user.personalInfo.firstName} {user.personalInfo.lastName}</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase">Precision Mode</span>
                </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] border border-border/50 shadow-2xl shadow-black/[0.03] p-8">
                <UserForm
                    initialValues={user}
                    onSubmit={handleSave}
                    isLoading={saving}
                    locations={locations}
                    departments={departments}
                    designations={designations}
                    roles={roles}
                    users={users}
                    leaveTypes={leaveTypes}
                    error={error}
                    onSearchUsers={handleSearchUsers}
                    onLoadMoreUsers={handleLoadMoreUsers}
                    isUsersLoadingMore={isUsersLoadingMore}
                    onClearError={() => setError(null)}
                />
            </div>
        </div>
    );
};

export default UserEdit;
