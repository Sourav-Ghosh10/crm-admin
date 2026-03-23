import React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Calendar, FileText } from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import type { Holiday } from "../../../types/organization.types";
import { cn } from "../../../lib/utils";
import FormError from "../../../components/common/FormError/FormError";
import { ModalFooter } from "../../../components/common/Modal/Modal";

const schema = yup.object({
    name: yup.string().required("Holiday name is required").trim(),
    date: yup.string().required("Date is required"),
    description: yup.string().optional().trim(),
    isRecurring: yup.boolean().default(false),
    isActive: yup.boolean().default(true),
});

type HolidayFormData = yup.InferType<typeof schema>;

interface HolidayFormProps {
    initialValues?: Partial<Holiday>;
    onSubmit: (data: HolidayFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | string[] | null;
}

const HolidayForm: React.FC<HolidayFormProps> = ({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
}) => {
    const { control, handleSubmit, formState: { errors } } = useForm<HolidayFormData>({
        resolver: yupResolver(schema) as Resolver<HolidayFormData>,
        defaultValues: {
            name: initialValues?.name || "",
            date: initialValues?.date ? initialValues.date.split('T')[0] : "",
            description: initialValues?.description || "",
            isRecurring: initialValues?.isRecurring ?? false,
            isActive: initialValues?.isActive ?? true,
        },
    });

    return (
        <form id="holiday-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormError message={error} />
            <div className="space-y-4">
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Holiday Name"
                            placeholder="e.g. Independence Day"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            startAdornment={<Calendar className="w-4 h-4" />}
                            className="bg-primary/5 focus:bg-white"
                        />
                    )}
                />
                <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="date"
                            label="Date"
                            error={!!errors.date}
                            helperText={errors.date?.message}
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
                                    rows={4}
                                    placeholder="Briefly describe this holiday..."
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
                            {errors.description && (
                                <p className="mt-2 text-xs font-bold text-error px-1">
                                    {errors.description.message}
                                </p>
                            )}
                        </div>
                    )}
                />
            </div>

            <ModalFooter>
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 w-full sm:w-auto justify-center sm:justify-start">
                        <Controller
                            name="isRecurring"
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
                                        "ml-3 text-[8px] font-black uppercase tracking-widest transition-colors",
                                        field.value ? "text-primary" : "text-foreground-tertiary"
                                    )}>
                                        Annual Recurring
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
                                        "ml-3 text-[8px] font-black uppercase tracking-widest transition-colors",
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
                        <Button type="submit" form="holiday-form" disabled={isLoading} className="flex-1 sm:flex-none">
                            {initialValues?._id ? "Save Changes" : "Create Holiday"}
                        </Button>
                    </div>
                </div>
            </ModalFooter>
        </form>
    );
};

export default HolidayForm;
