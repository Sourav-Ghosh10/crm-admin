import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import UserForm from "./UserForm";
import type { User } from "../../types/user.types";
import BackButton from "../../components/common/BackButton";
import { userService } from "../../services/userService";
import { locationService } from "../../services/locationService";
import { departmentService } from "../../services/departmentService";
import { designationService } from "../../services/designationService";
import { leaveTypeService } from "../../services/leaveTypeService";
import type { OfficeLocation, Department, Designation, LeaveType } from "../../types/organization.types";
import { getErrorMessage } from "../../utils/errorHandling";

import { roleService } from "../../services/roleService";
import type { Role } from "../../types/role.types";

const UserCreate: React.FC = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [locations, setLocations] = useState<OfficeLocation[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | string[] | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [locRes, deptRes, desigRes, userRes, leaveTypeRes, roleRes] = await Promise.all([
                    locationService.getAll({ limit: 100, isActive: true }),
                    departmentService.getAll({ limit: 100, isActive: true }),
                    designationService.getAll({ limit: 100, isActive: true }),
                    userService.getAll({}),
                    leaveTypeService.getAll({ limit: 100, isActive: true }),
                    roleService.getAll({ limit: 100, isActive: true }),
                ]);
                setLocations(locRes.data);
                setDepartments(deptRes.data);
                setDesignations(desigRes.data);
                setUsers(userRes.users);
                setLeaveTypes(leaveTypeRes.data);
                setRoles(roleRes.data);
            } catch (error) {
                console.error("Failed to fetch organization data:", error);
            }
        };
        fetchData();
    }, []);

    const handleSave = async (data: User) => {
        setSaving(true);
        setError(null);
        try {
            const newUser = await userService.create(data);
            navigate(`/users/${newUser._id}`);
        } catch (error) {
            console.error(error);
            const errorMessage = getErrorMessage(error, "Failed to create user");
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex flex-col items-start justify-center">
                    <BackButton onClick={() => navigate("/users")} label="Go to previous page" />
                    {/* <div>
                        <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
                            <UserPlus className="w-8 h-8 text-primary" />
                            Onboard Talent
                        </h1>
                        <p className="text-foreground-tertiary font-medium">Create a new personnel record in the directory</p>
                    </div> */}
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase">Precision Onboarding</span>
                </div>
            </div>

            <div className="bg-surface rounded-[2.5rem] border border-border/50 shadow-2xl shadow-black/[0.03] p-8">
                <UserForm
                    onSubmit={handleSave}
                    isLoading={saving}
                    locations={locations}
                    departments={departments}
                    designations={designations}
                    roles={roles}
                    users={users}
                    leaveTypes={leaveTypes}
                    error={error}
                />
            </div>
        </div>
    );
};

export default UserCreate;
