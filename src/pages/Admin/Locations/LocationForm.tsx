import React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Building2, MapPin, Phone, Mail, Globe, Hash, Clock } from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import type { OfficeLocation } from "../../../types/organization.types";
import { cn } from "../../../lib/utils";

const schema = yup.object({
    name: yup.string().required("Location name is required").trim(),
    address: yup.object({
        street: yup.string().required("Street is required").trim(),
        city: yup.string().required("City is required").trim(),
        state: yup.string().required("State is required").trim(),
        country: yup.string().required("Country is required").trim().default("India"),
        zipCode: yup.string().required("ZIP Code is required").trim(),
    }),
    contactInfo: yup.object({
        phone: yup.string().optional(),
        email: yup.string().email("Invalid email").optional(),
    }),
    isHeadquarters: yup.boolean().default(false),
    isActive: yup.boolean().default(true),
    timezone: yup.string().required("Timezone is required").trim().default("Asia/Kolkata"),
});

type LocationFormData = yup.InferType<typeof schema>;

import FormError from "../../../components/common/FormError/FormError";
import { ModalFooter } from "../../../components/common/Modal/Modal";

interface LocationFormProps {
    initialValues?: Partial<OfficeLocation>;
    onSubmit: (data: LocationFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | string[] | null;
}

const LocationForm: React.FC<LocationFormProps> = ({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
}) => {
    const { control, handleSubmit, formState: { errors } } = useForm<LocationFormData>({
        resolver: yupResolver(schema) as Resolver<LocationFormData>,
        defaultValues: {
            name: initialValues?.name || "",
            address: {
                street: initialValues?.address?.street || "",
                city: initialValues?.address?.city || "",
                state: initialValues?.address?.state || "",
                country: initialValues?.address?.country || "India",
                zipCode: initialValues?.address?.zipCode || "",
            },
            contactInfo: {
                phone: initialValues?.contactInfo?.phone || "",
                email: initialValues?.contactInfo?.email || "",
            },
            isHeadquarters: initialValues?.isHeadquarters || false,
            isActive: initialValues?.isActive ?? true,
            timezone: initialValues?.timezone || "Asia/Kolkata",
        },
    });

    return (
        <form id="location-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormError message={error} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Location Name"
                            placeholder="e.g. Mumbai Technopark"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            startAdornment={<Building2 className="w-4 h-4" />}
                        />
                    )}
                />
                <Controller
                    name="isHeadquarters"
                    control={control}
                    render={({ field }) => (
                        <label className="flex items-center p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted transition-colors cursor-pointer group mt-6 h-[52px]">
                            <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="w-4 h-4 rounded-md border-2 border-border text-primary focus:ring-primary/20 transition-all"
                            />
                            <span className="ml-3 text-xs font-bold text-foreground-tertiary group-hover:text-primary uppercase tracking-widest transition-colors">Headquarters</span>
                        </label>
                    )}
                />
                <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Timezone"
                            placeholder="Asia/Kolkata"
                            error={!!errors.timezone}
                            helperText={errors.timezone?.message}
                            startAdornment={<Clock className="w-4 h-4" />}
                        />
                    )}
                />
            </div>

            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary px-1 border-l-2 border-primary ml-1">Address Details</p>
                <Controller
                    name="address.street"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Street Address"
                            placeholder="e.g. 123 Tech Lane"
                            error={!!errors.address?.street}
                            helperText={errors.address?.street?.message}
                            startAdornment={<MapPin className="w-4 h-4" />}
                        />
                    )}
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Controller
                        name="address.city"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="City"
                                placeholder="Mumbai"
                                error={!!errors.address?.city}
                                helperText={errors.address?.city?.message}
                            />
                        )}
                    />
                    <Controller
                        name="address.state"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="State"
                                placeholder="Maharashtra"
                                error={!!errors.address?.state}
                                helperText={errors.address?.state?.message}
                            />
                        )}
                    />
                    <Controller
                        name="address.zipCode"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="ZIP Code"
                                placeholder="400001"
                                error={!!errors.address?.zipCode}
                                helperText={errors.address?.zipCode?.message}
                                startAdornment={<Hash className="w-4 h-4" />}
                            />
                        )}
                    />
                </div>
                <Controller
                    name="address.country"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Country"
                            placeholder="India"
                            error={!!errors.address?.country}
                            helperText={errors.address?.country?.message}
                            startAdornment={<Globe className="w-4 h-4" />}
                        />
                    )}
                />
            </div>

            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary px-1 border-l-2 border-accent ml-1">Contact Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                        name="contactInfo.phone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Phone Number"
                                placeholder="+91 XXXXXXXXXX"
                                error={!!errors.contactInfo?.phone}
                                helperText={errors.contactInfo?.phone?.message}
                                startAdornment={<Phone className="w-4 h-4" />}
                            />
                        )}
                    />
                    <Controller
                        name="contactInfo.email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Email Address"
                                placeholder="hub@pulseops.com"
                                error={!!errors.contactInfo?.email}
                                helperText={errors.contactInfo?.email?.message}
                                startAdornment={<Mail className="w-4 h-4" />}
                            />
                        )}
                    />
                </div>
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
                        <Button type="submit" form="location-form" disabled={isLoading} className="flex-1 sm:flex-none">
                            {initialValues?._id ? "Save Changes" : "Create"}
                        </Button>
                    </div>
                </div>
            </ModalFooter>
        </form>
    );
};

export default LocationForm;
