import React, { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FileText, Tag, Hash, Calendar } from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import FormSelect from "../../../components/common/Select/FormSelect";
import type { LeaveType, Department, Designation } from "../../../types/organization.types";
import { departmentService } from "../../../services/departmentService";
import { designationService } from "../../../services/designationService";
import { cn } from "../../../lib/utils";
import FormError from "../../../components/common/FormError/FormError";
import MultiSelectSearch from "../../../components/common/Search/MultiSelectSearch";
import { ModalFooter } from "../../../components/common/Modal/Modal";

const schema = yup.object({
    name: yup.string().required("Leave type name is required").trim(),
    code: yup.string().required("Code is required").uppercase().trim(),
    description: yup.string().optional().trim(),
    isPaid: yup.boolean().default(true),
    defaultAmount: yup.number().typeError("Amount must be a number").required("Default amount is required").min(0),
    maxCarryForward: yup.number().typeError("Amount must be a number").optional().min(0).default(0),
    resetFrequency: yup.string().oneOf(['monthly', 'yearly']).required("Reset frequency is required"),
    applicableDepartments: yup.array().of(yup.string().required()).min(1, "Select at least one department").required("Departments are required"),
    applicableDesignations: yup.array().of(yup.string().required()).min(1, "Select at least one designation").required("Designations are required"),
    isActive: yup.boolean().default(true),
});

type LeaveTypeFormData = yup.InferType<typeof schema>;

interface LeaveTypeFormProps {
    initialValues?: Partial<LeaveType>;
    onSubmit: (data: LeaveTypeFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | string[] | null;
}

const LeaveTypeForm: React.FC<LeaveTypeFormProps> = ({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
}) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [loadingDepts, setLoadingDepts] = useState(false);
    const [loadingDesigs, setLoadingDesigs] = useState(false);

    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                setLoadingDepts(true);
                setLoadingDesigs(true);
                const [deptRes, desigRes] = await Promise.all([
                    departmentService.getAll({ limit: 100, isActive: true }),
                    designationService.getAll({ limit: 100, isActive: true })
                ]);
                setDepartments(deptRes.data);
                setDesignations(desigRes.data);
            } catch (err) {
                console.error("Failed to fetch filter data", err);
            } finally {
                setLoadingDepts(false);
                setLoadingDesigs(false);
            }
        };
        fetchFilterData();
    }, []);

    const { control, handleSubmit, formState: { errors } } = useForm<LeaveTypeFormData>({
        resolver: yupResolver(schema) as Resolver<LeaveTypeFormData>,
        defaultValues: {
            name: initialValues?.name || "",
            code: initialValues?.code || "",
            description: initialValues?.description || "",
            isPaid: initialValues?.isPaid ?? true,
            defaultAmount: initialValues?.defaultAmount || 0,
            maxCarryForward: initialValues?.maxCarryForward || 0,
            resetFrequency: initialValues?.resetFrequency || 'yearly',
            applicableDepartments: initialValues?.applicableDepartments || ['all'],
            applicableDesignations: initialValues?.applicableDesignations || ['all'],
            isActive: initialValues?.isActive ?? true,
        },
    });

    return (
        <form id="leave-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormError message={error} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Leave Type Name"
                            placeholder="e.g. Annual Leave"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            startAdornment={<FileText className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                        />
                    )}
                />
                <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Code"
                            placeholder="e.g. AL"
                            error={!!errors.code}
                            helperText={errors.code?.message}
                            startAdornment={<Tag className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                        />
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Controller
                    name="defaultAmount"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="text"
                            label="Annual/Monthly Allowance"
                            placeholder="0"
                            error={!!errors.defaultAmount}
                            helperText={errors.defaultAmount?.message}
                            startAdornment={<Hash className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                            disabled={!!initialValues?._id}
                        />
                    )}
                />
                <Controller
                    name="maxCarryForward"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="text"
                            label="Max Carry Forward"
                            placeholder="0"
                            error={!!errors.maxCarryForward}
                            helperText={errors.maxCarryForward?.message}
                            startAdornment={<Hash className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                            disabled={!!initialValues?._id}
                        />
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Controller
                    name="resetFrequency"
                    control={control}
                    render={({ field }) => (
                        <FormSelect
                            label="Reset Frequency"
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'yearly', label: 'Yearly' }
                            ]}
                            error={!!errors.resetFrequency}
                            helperText={errors.resetFrequency?.message}
                            startIcon={<Calendar className="w-4 h-4" />}
                        />
                    )}
                />

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-foreground-tertiary uppercase tracking-widest px-1">
                        Applicable Departments
                    </label>
                    <Controller
                        name="applicableDepartments"
                        control={control}
                        render={({ field }) => (
                            <MultiSelectSearch
                                options={departments.map(d => ({ value: d.name, label: d.name }))}
                                selectedValues={field.value}
                                onSelectionChange={field.onChange}
                                placeholder="Select departments..."
                                allowAll={true}
                                allowSearch={false}
                                isLoading={loadingDepts}
                            />
                        )}
                    />
                    {errors.applicableDepartments && (
                        <p className="mt-2 text-xs font-bold text-error px-1">
                            {errors.applicableDepartments.message}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] font-black text-foreground-tertiary uppercase tracking-widest px-1">
                        Applicable Designations
                    </label>
                    <Controller
                        name="applicableDesignations"
                        control={control}
                        render={({ field }) => (
                            <MultiSelectSearch
                                options={designations.map(d => ({ value: d.name || d.title || '', label: d.name || d.title || '' }))}
                                selectedValues={field.value}
                                onSelectionChange={field.onChange}
                                placeholder="Select designations..."
                                allowAll={true}
                                allowSearch={false}
                                isLoading={loadingDesigs}
                            />
                        )}
                    />
                    {errors.applicableDesignations && (
                        <p className="mt-2 text-xs font-bold text-error px-1">
                            {errors.applicableDesignations.message}
                        </p>
                    )}
                </div>
            </div>

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
                                placeholder="Briefly describe this leave type..."
                                className={cn(
                                    "w-full px-5 py-4 text-sm border rounded-2xl bg-surface/50 backdrop-blur-md transition-all duration-300 outline-none resize-none",
                                    "focus:ring-4 focus:ring-primary/10 focus:border-primary focus:shadow-xl",
                                    errors.description ? "border-error" : "border-border hover:border-primary/40"
                                )}
                            />
                        </div>
                        {errors.description && (
                            <p className="mt-2 text-xs font-bold text-error px-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>
                )}
            />

            <ModalFooter>
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 w-full sm:w-auto justify-center sm:justify-start">
                        <Controller
                            name="isPaid"
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
                                        Paid Leave
                                    </span>
                                </label>
                            )}
                        />
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
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 border-border/50 pt-4 sm:pt-0">
                        <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button type="submit" form="leave-type-form" disabled={isLoading} className="flex-1 sm:flex-none">
                            {initialValues?._id ? "Save Changes" : "Create Leave Type"}
                        </Button>
                    </div>
                </div>
            </ModalFooter>
        </form>
    );
};

export default LeaveTypeForm;
