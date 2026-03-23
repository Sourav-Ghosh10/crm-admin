import React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Tag, Hash } from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { cn } from "../../../lib/utils";
import FormError from "../../../components/common/FormError/FormError";
import type { ReimbursementType } from "../../../types/reimbursement.types";
import { ModalFooter } from "../../../components/common/Modal/Modal";

const schema = yup.object({
    name: yup.string().required("Reimbursement type name is required").trim(),
    description: yup.string().optional().trim(),
    maxAmount: yup.number()
        .typeError("Amount must be a number")
        .transform((value, originalValue) => (originalValue === "" ? undefined : value))
        .optional()
        .min(0, "Amount must be positive"),
    requiresReceipt: yup.boolean().default(true),
    isActive: yup.boolean().default(true),
});

type ReimbursementTypeFormData = yup.InferType<typeof schema>;

interface ReimbursementTypeFormProps {
    initialValues?: Partial<ReimbursementType>;
    onSubmit: (data: ReimbursementTypeFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | string[] | null;
}

const ReimbursementTypeForm: React.FC<ReimbursementTypeFormProps> = ({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
}) => {
    const { control, handleSubmit, formState: { errors } } = useForm<ReimbursementTypeFormData>({
        resolver: yupResolver(schema) as Resolver<ReimbursementTypeFormData>,
        defaultValues: {
            name: initialValues?.name || "",
            description: initialValues?.description || "",
            maxAmount: initialValues?.maxAmount,
            requiresReceipt: initialValues?.requiresReceipt ?? true,
            isActive: initialValues?.isActive ?? true,
        },
    });

    return (
        <form id="reimbursement-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormError message={error} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Type Name"
                            placeholder="e.g. Travel, Meals"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            startAdornment={<Tag className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                        />
                    )}
                />
                <Controller
                    name="maxAmount"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="number"
                            label="Max Amount (Optional)"
                            placeholder="e.g. 500.00"
                            error={!!errors.maxAmount}
                            helperText={errors.maxAmount?.message}
                            startAdornment={<Hash className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                        />
                    )}
                />
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
                                placeholder="Briefly describe this reimbursement type..."
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
                            name="requiresReceipt"
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
                                    <div className="ml-3 flex flex-col">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                                            field.value ? "text-primary" : "text-foreground-tertiary"
                                        )}>
                                            Requires Receipt
                                        </span>
                                    </div>
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
                        <Button type="submit" form="reimbursement-type-form" disabled={isLoading} className="flex-1 sm:flex-none">
                            {initialValues?._id ? "Save Changes" : "Create Type"}
                        </Button>
                    </div>
                </div>
            </ModalFooter>
        </form>
    );
};

export default ReimbursementTypeForm;
