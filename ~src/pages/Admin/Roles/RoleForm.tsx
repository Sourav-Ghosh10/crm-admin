import React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Shield, FileText } from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import type { Role } from "../../../types/role.types";
import { cn } from "../../../lib/utils";

import FormError from "../../../components/common/FormError/FormError";
import { ModalFooter } from "../../../components/common/Modal/Modal";

const schema = yup.object({
    name: yup.string().required("Role name is required").trim(),
    description: yup.string().optional().trim(),
    // permissions: yup.array().of(yup.string().required()).default([]),
    isActive: yup.boolean().default(true),
});

type RoleFormData = yup.InferType<typeof schema>;

interface RoleFormProps {
    initialValues?: Partial<Role>;
    onSubmit: (data: RoleFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | string[] | null;
}

// const MODULES = [
//     { id: "dashboard", label: "Dashboard" },
//     { id: "users", label: "Users" },
//     { id: "attendance", label: "Attendance" },
//     { id: "schedule", label: "Schedule" },
//     { id: "leave", label: "Leave" },
//     { id: "announcements", label: "Announcements" },
//     { id: "departments", label: "Departments" },
//     { id: "designations", label: "Designations" },
//     { id: "locations", label: "Locations" },
//     { id: "roles", label: "Roles" },
//     { id: "reimbursements", label: "Reimbursements" },
// ];

const RoleForm: React.FC<RoleFormProps> = ({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
}) => {
    const { control, handleSubmit, formState: { errors } } = useForm<RoleFormData>({
        resolver: yupResolver(schema) as Resolver<RoleFormData>,
        defaultValues: {
            name: initialValues?.name || "",
            description: initialValues?.description || "",
            // permissions: initialValues?.permissions || [],
            isActive: initialValues?.isActive ?? true,
        },
    });

    return (
        <form id="role-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormError message={error} />
            <div className="space-y-4">
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Role Name"
                            placeholder="e.g. Regional Manager"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            startAdornment={<Shield className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                        />
                    )}
                />

                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <div className="space-y-1.5 group">
                            <label className="block text-[10px] font-black text-foreground-tertiary uppercase tracking-widest px-1">
                                Description
                            </label>
                            <div className="relative">
                                <textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Briefly describe the responsibilities of this role..."
                                    className={cn(
                                        "w-full px-5 py-4 text-sm border rounded-2xl bg-surface/50 backdrop-blur-md transition-all duration-300 outline-none resize-none",
                                        "focus:ring-4 focus:ring-primary/10 focus:border-primary focus:shadow-xl",
                                        errors.description ? "border-error" : "border-border hover:border-primary/40"
                                    )}
                                />
                                <div className="absolute right-4 bottom-4 text-foreground-tertiary opacity-20 pointer-events-none group-focus-within:opacity-100 transition-opacity">
                                    <FileText className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    )}
                />

                {/* <div className="space-y-3">
                    <label className="block text-[10px] font-black text-foreground-tertiary uppercase tracking-widest px-1">
                        Module Permissions
                    </label>
                    <Controller
                        name="permissions"
                        control={control}
                        render={({ field }) => (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {MODULES.map((module) => {
                                    const isChecked = field.value?.includes(module.id);
                                    return (
                                        <button
                                            key={module.id}
                                            type="button"
                                            onClick={() => {
                                                const current = field.value || [];
                                                const next = isChecked
                                                    ? current.filter(id => id !== module.id)
                                                    : [...current, module.id];
                                                field.onChange(next);
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 text-left",
                                                isChecked
                                                    ? "bg-primary/5 border-primary/30 shadow-sm"
                                                    : "bg-surface/50 border-border hover:border-primary/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                                isChecked
                                                    ? "bg-primary border-primary"
                                                    : "bg-white border-border group-hover:border-primary/40"
                                            )}>
                                                {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className={cn(
                                                "text-xs font-bold transition-colors",
                                                isChecked ? "text-primary" : "text-foreground-secondary"
                                            )}>
                                                {module.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    />
                </div> */}
            </div>

            <ModalFooter>
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-3">
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-center cursor-pointer group py-2">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={field.value}
                                        onChange={field.onChange}
                                    />
                                    <div className={cn(
                                        "w-10 h-5 bg-muted rounded-full transition-colors border border-border",
                                        field.value && "bg-primary/20 border-primary/40"
                                    )} />
                                    <div className={cn(
                                        "absolute left-1 top-1 w-3 h-3 bg-foreground-tertiary rounded-full transition-all",
                                        field.value && "translate-x-5 bg-primary"
                                    )} />
                                </div>
                                <span className={cn(
                                    "ml-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                                    field.value ? "text-primary" : "text-foreground-tertiary"
                                )}>
                                    {field.value ? "Active" : "Inactive"}
                                </span>
                            </label>
                        )}
                    />
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 border-border/50 pt-4 sm:pt-0">
                        <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button type="submit" form="role-form" isLoading={isLoading} className="flex-1 sm:flex-none">
                            {initialValues?._id ? "Save Changes" : "Create Role"}
                        </Button>
                    </div>
                </div>
            </ModalFooter>
        </form>
    );
};

export default RoleForm;
