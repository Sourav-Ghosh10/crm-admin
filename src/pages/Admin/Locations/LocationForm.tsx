import React, { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Globe,
    Hash,
    Clock,
    Navigation,
    LocateFixed,
    ShieldCheck,
    Wifi,
    Smartphone,
    Monitor,
} from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import type { OfficeLocation } from "../../../types/organization.types";
import { cn } from "../../../lib/utils";

const schema = yup.object({
    name: yup.string().required("Location name is required").trim().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
    address: yup.object({
        street: yup.string().required("Street is required").trim().max(200, "Street cannot exceed 200 characters"),
        city: yup.string().required("City is required").trim().max(50, "City cannot exceed 50 characters"),
        state: yup.string().required("State is required").trim().max(50, "State cannot exceed 50 characters"),
        country: yup.string().required("Country is required").trim().max(50, "Country cannot exceed 50 characters").default("India"),
        zipCode: yup.string().required("ZIP Code is required").trim().max(10, "ZIP Code cannot exceed 10 characters"),
    }),
    contactInfo: yup.object({
        phone: yup.string().optional().max(15, "Phone cannot exceed 15 digits"),
        email: yup.string().email("Invalid email").optional().max(50, "Email cannot exceed 50 characters"),
    }),
    isHeadquarters: yup.boolean().default(false),
    isActive: yup.boolean().default(true),
    timezone: yup.string().required("Timezone is required").trim().max(50, "Timezone cannot exceed 50 characters").default("Asia/Kolkata"),
    coordinates: yup.object({
        latitude: yup
            .number()
            .transform((value, originalValue) => (String(originalValue).trim() === "" ? null : value))
            .nullable()
            .optional()
            .min(-90, "Latitude must be between -90 and 90")
            .max(90, "Latitude must be between -90 and 90"),
        longitude: yup
            .number()
            .transform((value, originalValue) => (String(originalValue).trim() === "" ? null : value))
            .nullable()
            .optional()
            .min(-180, "Longitude must be between -180 and 180")
            .max(180, "Longitude must be between -180 and 180"),
    }).optional(),
    radius: yup
        .number()
        .transform((value, originalValue) => (String(originalValue).trim() === "" ? 100 : value))
        .nullable()
        .optional()
        .min(5, "Minimum radius is 5 meters")
        .max(50000, "Maximum radius is 50,000 meters")
        .default(100),
    geofencingEnabled: yup.boolean().default(true),
    geofencingMobile: yup.boolean().default(true),
    geofencingDesktop: yup.boolean().default(true),
    ipRestrictionEnabled: yup.boolean().default(false),
    allowedIps: yup.string().optional().default(""),
    ipRestrictionMobile: yup.boolean().default(true),
    ipRestrictionDesktop: yup.boolean().default(true),
});

type LocationFormData = yup.InferType<typeof schema>;

import FormError from "../../../components/common/FormError/FormError";
import { ModalFooter } from "../../../components/common/Modal/Modal";

interface LocationFormProps {
    initialValues?: Partial<OfficeLocation>;
    onSubmit: (data: any) => void;
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
    const [isLocating, setIsLocating] = useState(false);
    const [isFetchingIp, setIsFetchingIp] = useState(false);

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<LocationFormData>({
        mode: "onChange",
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
            coordinates: {
                latitude: initialValues?.coordinates?.latitude ?? (null as any),
                longitude: initialValues?.coordinates?.longitude ?? (null as any),
            },
            radius: initialValues?.radius ?? 100,
            geofencingEnabled: initialValues?.geofencingEnabled ?? true,
            geofencingMobile: initialValues?.geofencingMobile ?? true,
            geofencingDesktop: initialValues?.geofencingDesktop ?? true,
            ipRestrictionEnabled: initialValues?.ipRestrictionEnabled ?? false,
            allowedIps: Array.isArray(initialValues?.allowedIps)
                ? initialValues.allowedIps.join(", ")
                : (initialValues?.allowedIps || ""),
            ipRestrictionMobile: initialValues?.ipRestrictionMobile ?? true,
            ipRestrictionDesktop: initialValues?.ipRestrictionDesktop ?? true,
        },
    });

    const isGeofenceOn = watch("geofencingEnabled");
    const isIpOn = watch("ipRestrictionEnabled");

    const handleFormSubmit = (data: LocationFormData) => {
        const allowedIpsArray = typeof data.allowedIps === "string"
            ? data.allowedIps.split(",").map((s) => s.trim()).filter(Boolean)
            : data.allowedIps || [];

        onSubmit({
            ...data,
            allowedIps: allowedIpsArray,
        });
    };

    const handleGetCurrentIp = async () => {
        setIsFetchingIp(true);
        try {
            const res = await fetch("https://api.ipify.org?format=json");
            const data = await res.json();
            if (data && data.ip) {
                const currentVal = control._formValues.allowedIps || "";
                const currentIps = currentVal.split(",").map((s: string) => s.trim()).filter(Boolean);
                if (!currentIps.includes(data.ip)) {
                    currentIps.push(data.ip);
                }
                setValue("allowedIps", currentIps.join(", "), { shouldValidate: true, shouldDirty: true });
            }
        } catch {
            try {
                const res2 = await fetch("https://ipwho.is/");
                const data2 = await res2.json();
                if (data2 && data2.ip) {
                    const currentVal = control._formValues.allowedIps || "";
                    const currentIps = currentVal.split(",").map((s: string) => s.trim()).filter(Boolean);
                    if (!currentIps.includes(data2.ip)) {
                        currentIps.push(data2.ip);
                    }
                    setValue("allowedIps", currentIps.join(", "), { shouldValidate: true, shouldDirty: true });
                }
            } catch {
                alert("Could not detect public IP. Please type it in manually.");
            }
        } finally {
            setIsFetchingIp(false);
        }
    };

    const handleGetCurrentLocation = () => {
        setIsLocating(true);

        const tryIpFallback = async () => {
            try {
                const res = await fetch("https://ipwho.is/");
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success !== false && typeof data.latitude === "number" && typeof data.longitude === "number") {
                        setValue("coordinates.latitude", Number(data.latitude.toFixed(7)), { shouldValidate: true, shouldDirty: true });
                        setValue("coordinates.longitude", Number(data.longitude.toFixed(7)), { shouldValidate: true, shouldDirty: true });
                        setIsLocating(false);
                        return;
                    }
                }
            } catch {}

            try {
                const res2 = await fetch("https://freeipapi.com/api/json");
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (data2 && typeof data2.latitude === "number" && typeof data2.longitude === "number") {
                        setValue("coordinates.latitude", Number(data2.latitude.toFixed(7)), { shouldValidate: true, shouldDirty: true });
                        setValue("coordinates.longitude", Number(data2.longitude.toFixed(7)), { shouldValidate: true, shouldDirty: true });
                        setIsLocating(false);
                        return;
                    }
                }
            } catch {}

            setIsLocating(false);
            alert("Unable to detect coordinates automatically. Please enter Latitude & Longitude manually.");
        };

        if (!navigator.geolocation) {
            tryIpFallback();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setValue("coordinates.latitude", Number(position.coords.latitude.toFixed(7)), { shouldValidate: true, shouldDirty: true });
                setValue("coordinates.longitude", Number(position.coords.longitude.toFixed(7)), { shouldValidate: true, shouldDirty: true });
                setIsLocating(false);
            },
            () => {
                // If browser GPS/Wi-Fi positioning fails on PC, seamlessly use IP location
                tryIpFallback();
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
    };

    return (
        <form id="location-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            <FormError message={error} />
            <div className="grid grid-cols-1 md:grid-cols-6 gap-x-6 gap-y-1">
                <div className="md:col-span-4">
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Location Name"
                                required
                                placeholder="e.g. Mumbai Technopark"
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                startAdornment={<Building2 className="w-4 h-4" />}
                                maxLength={50}
                            />
                        )}
                    />
                </div>
                <div className="md:col-span-2 pt-6">
                    <Controller
                        name="isHeadquarters"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-center p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted transition-colors cursor-pointer group h-[52px]">
                                <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="w-4 h-4 rounded-md border-2 border-border text-primary focus:ring-primary/20 transition-all"
                                />
                                <span className="ml-3 text-xs font-bold text-foreground-tertiary group-hover:text-primary uppercase tracking-widest transition-colors whitespace-nowrap">Headquarters</span>
                            </label>
                        )}
                    />
                </div>

                <div className="md:col-span-3">
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
                                maxLength={50}
                            />
                        )}
                    />
                </div>
                <div className="md:col-span-3">
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
                                maxLength={15}
                                type="number"
                            />
                        )}
                    />
                </div>

                <div className="md:col-span-3">
                    <Controller
                        name="timezone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Timezone"
                                required
                                placeholder="Asia/Kolkata"
                                error={!!errors.timezone}
                                helperText={errors.timezone?.message}
                                startAdornment={<Clock className="w-4 h-4" />}
                                maxLength={50}
                            />
                        )}
                    />
                </div>
                <div className="md:col-span-3">
                    <Controller
                        name="address.street"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Street Address"
                                required
                                placeholder="e.g. 123 Tech Lane"
                                error={!!errors.address?.street}
                                helperText={errors.address?.street?.message}
                                startAdornment={<MapPin className="w-4 h-4" />}
                                maxLength={200}
                            />
                        )}
                    />
                </div>

                <div className="md:col-span-2">
                    <Controller
                        name="address.city"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="City"
                                required
                                placeholder="Mumbai"
                                error={!!errors.address?.city}
                                helperText={errors.address?.city?.message}
                                maxLength={50}
                            />
                        )}
                    />
                </div>
                <div className="md:col-span-2">
                    <Controller
                        name="address.state"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="State"
                                required
                                placeholder="Maharashtra"
                                error={!!errors.address?.state}
                                helperText={errors.address?.state?.message}
                                maxLength={50}
                            />
                        )}
                    />
                </div>
                <div className="md:col-span-2">
                    <Controller
                        name="address.zipCode"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="ZIP Code"
                                required
                                placeholder="400001"
                                error={!!errors.address?.zipCode}
                                helperText={errors.address?.zipCode?.message}
                                startAdornment={<Hash className="w-4 h-4" />}
                                maxLength={10}
                            />
                        )}
                    />
                </div>

                <div className="md:col-span-6">
                    <Controller
                        name="address.country"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Country"
                                required
                                placeholder="India"
                                error={!!errors.address?.country}
                                helperText={errors.address?.country?.message}
                                startAdornment={<Globe className="w-4 h-4" />}
                                maxLength={50}
                            />
                        )}
                    />
                </div>

                <div className="md:col-span-6">
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-center cursor-pointer group py-2 w-fit">
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
                                    {field.value ? "Active Status" : "Inactive Status"}
                                </span>
                            </label>
                        )}
                    />
                </div>

                {/* Geofencing & GPS Attendance Settings */}
                <div className="md:col-span-6 mt-3 pt-5 border-t border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-bold text-foreground">Attendance Geofencing & GPS</h4>
                            </div>
                            <p className="text-xs text-foreground-tertiary mt-0.5">
                                Restrict employee clock-in and clock-out to within this office location's meter radius.
                            </p>
                        </div>
                        <Controller
                            name="geofencingEnabled"
                            control={control}
                            render={({ field }) => (
                                <label className="inline-flex items-center cursor-pointer group select-none">
                                    <div className={cn(
                                        "w-11 h-6 rounded-full transition-colors relative border shrink-0",
                                        field.value ? "bg-emerald-500 border-emerald-600" : "bg-muted border-border"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                        <div className={cn(
                                            "w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all shadow-sm",
                                            field.value ? "translate-x-5.5" : "translate-x-1"
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "ml-3 text-xs font-bold transition-colors",
                                        field.value ? "text-emerald-600" : "text-foreground-tertiary"
                                    )}>
                                        {field.value ? "Geofence Enabled" : "Geofence Disabled"}
                                    </span>
                                </label>
                            )}
                        />
                    </div>

                    <div className={cn(
                        "grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50 transition-opacity duration-200",
                        !isGeofenceOn && "opacity-45 pointer-events-none"
                    )}>
                        {/* Device applicability for Geofencing */}
                        <div className="md:col-span-6">
                            <div className="text-[11px] font-bold text-foreground-secondary uppercase tracking-wider mb-2">
                                Apply Geofence On:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Controller
                                    name="geofencingMobile"
                                    control={control}
                                    render={({ field }) => (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(!field.value)}
                                            className={cn(
                                                "relative flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all select-none text-left w-full group",
                                                field.value
                                                    ? "bg-primary/5 border-primary/40 shadow-sm"
                                                    : "bg-muted/30 border-border/70 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                                    field.value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-muted text-foreground-tertiary"
                                                )}>
                                                    <Smartphone className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                                        Mobile Devices
                                                    </div>
                                                    <div className="text-[10px] text-foreground-tertiary">
                                                        Phones & Tablets
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider",
                                                    field.value ? "text-primary" : "text-foreground-tertiary"
                                                )}>
                                                    {field.value ? "Active" : "Off"}
                                                </span>
                                                <div className={cn(
                                                    "w-8 h-4.5 rounded-full transition-colors relative border shrink-0",
                                                    field.value ? "bg-primary border-primary" : "bg-muted border-border"
                                                )}>
                                                    <div className={cn(
                                                        "w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all shadow-sm",
                                                        field.value ? "translate-x-3.5" : "translate-x-0.5"
                                                    )} />
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                />

                                <Controller
                                    name="geofencingDesktop"
                                    control={control}
                                    render={({ field }) => (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(!field.value)}
                                            className={cn(
                                                "relative flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all select-none text-left w-full group",
                                                field.value
                                                    ? "bg-primary/5 border-primary/40 shadow-sm"
                                                    : "bg-muted/30 border-border/70 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                                    field.value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-muted text-foreground-tertiary"
                                                )}>
                                                    <Monitor className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                                        Desktop / Laptops
                                                    </div>
                                                    <div className="text-[10px] text-foreground-tertiary">
                                                        PCs & Workstations
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider",
                                                    field.value ? "text-primary" : "text-foreground-tertiary"
                                                )}>
                                                    {field.value ? "Active" : "Off"}
                                                </span>
                                                <div className={cn(
                                                    "w-8 h-4.5 rounded-full transition-colors relative border shrink-0",
                                                    field.value ? "bg-primary border-primary" : "bg-muted border-border"
                                                )}>
                                                    <div className={cn(
                                                        "w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all shadow-sm",
                                                        field.value ? "translate-x-3.5" : "translate-x-0.5"
                                                    )} />
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <Controller
                                name="coordinates.latitude"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        label="Office Latitude"
                                        placeholder="e.g. 22.5726"
                                        error={!!errors.coordinates?.latitude}
                                        helperText={errors.coordinates?.latitude?.message}
                                        startAdornment={<MapPin className="w-4 h-4 text-foreground-tertiary" />}
                                        type="number"
                                        step="any"
                                    />
                                )}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Controller
                                name="coordinates.longitude"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        label="Office Longitude"
                                        placeholder="e.g. 88.3639"
                                        error={!!errors.coordinates?.longitude}
                                        helperText={errors.coordinates?.longitude?.message}
                                        startAdornment={<MapPin className="w-4 h-4 text-foreground-tertiary" />}
                                        type="number"
                                        step="any"
                                    />
                                )}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Controller
                                name="radius"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        label="Allowed Radius (Meters)"
                                        placeholder="100"
                                        error={!!errors.radius}
                                        helperText={errors.radius?.message || "Default: 100 meters"}
                                        startAdornment={<ShieldCheck className="w-4 h-4 text-foreground-tertiary" />}
                                        type="number"
                                        min={5}
                                        max={50000}
                                    />
                                )}
                            />
                        </div>
                        <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <span className="text-foreground-tertiary">
                                💡 Tip: Click to auto-detect this device&apos;s current GPS coordinates.
                            </span>
                            <Button
                                type="button"
                                variant="secondaryOutline"
                                size="sm"
                                className="gap-1.5 h-8 text-xs font-semibold"
                                onClick={handleGetCurrentLocation}
                                disabled={isLocating}
                            >
                                <LocateFixed className={cn("w-3.5 h-3.5 text-primary", isLocating && "animate-spin")} />
                                {isLocating ? "Detecting GPS..." : "Use Current Location"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Office Wi-Fi / IP Whitelisting Section */}
                <div className="md:col-span-6 mt-4 pt-5 border-t border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-bold text-foreground">Office Wi-Fi / IP Whitelisting</h4>
                            </div>
                            <p className="text-xs text-foreground-tertiary mt-0.5">
                                Restrict employee clock-in and clock-out to registered office Wi-Fi / public network IP addresses.
                            </p>
                        </div>
                        <Controller
                            name="ipRestrictionEnabled"
                            control={control}
                            render={({ field }) => (
                                <label className="inline-flex items-center cursor-pointer group select-none">
                                    <div className={cn(
                                        "w-11 h-6 rounded-full transition-colors relative border shrink-0",
                                        field.value ? "bg-emerald-500 border-emerald-600" : "bg-muted border-border"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                        <div className={cn(
                                            "w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all shadow-sm",
                                            field.value ? "translate-x-5.5" : "translate-x-1"
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "ml-3 text-xs font-bold transition-colors",
                                        field.value ? "text-emerald-600" : "text-foreground-tertiary"
                                    )}>
                                        {field.value ? "IP Restriction Active" : "IP Restriction Disabled"}
                                    </span>
                                </label>
                            )}
                        />
                    </div>

                    <div className={cn(
                        "grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50 transition-opacity duration-200",
                        !isIpOn && "opacity-45 pointer-events-none"
                    )}>
                        {/* Device applicability for IP Restriction */}
                        <div className="md:col-span-6">
                            <div className="text-[11px] font-bold text-foreground-secondary uppercase tracking-wider mb-2">
                                Apply IP Restriction On:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Controller
                                    name="ipRestrictionMobile"
                                    control={control}
                                    render={({ field }) => (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(!field.value)}
                                            className={cn(
                                                "relative flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all select-none text-left w-full group",
                                                field.value
                                                    ? "bg-primary/5 border-primary/40 shadow-sm"
                                                    : "bg-muted/30 border-border/70 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                                    field.value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-muted text-foreground-tertiary"
                                                )}>
                                                    <Smartphone className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                                        Mobile Devices
                                                    </div>
                                                    <div className="text-[10px] text-foreground-tertiary">
                                                        Phones & Tablets
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider",
                                                    field.value ? "text-primary" : "text-foreground-tertiary"
                                                )}>
                                                    {field.value ? "Active" : "Off"}
                                                </span>
                                                <div className={cn(
                                                    "w-8 h-4.5 rounded-full transition-colors relative border shrink-0",
                                                    field.value ? "bg-primary border-primary" : "bg-muted border-border"
                                                )}>
                                                    <div className={cn(
                                                        "w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all shadow-sm",
                                                        field.value ? "translate-x-3.5" : "translate-x-0.5"
                                                    )} />
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                />

                                <Controller
                                    name="ipRestrictionDesktop"
                                    control={control}
                                    render={({ field }) => (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(!field.value)}
                                            className={cn(
                                                "relative flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all select-none text-left w-full group",
                                                field.value
                                                    ? "bg-primary/5 border-primary/40 shadow-sm"
                                                    : "bg-muted/30 border-border/70 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                                    field.value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-muted text-foreground-tertiary"
                                                )}>
                                                    <Monitor className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                                        Desktop / Laptops
                                                    </div>
                                                    <div className="text-[10px] text-foreground-tertiary">
                                                        PCs & Workstations
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider",
                                                    field.value ? "text-primary" : "text-foreground-tertiary"
                                                )}>
                                                    {field.value ? "Active" : "Off"}
                                                </span>
                                                <div className={cn(
                                                    "w-8 h-4.5 rounded-full transition-colors relative border shrink-0",
                                                    field.value ? "bg-primary border-primary" : "bg-muted border-border"
                                                )}>
                                                    <div className={cn(
                                                        "w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all shadow-sm",
                                                        field.value ? "translate-x-3.5" : "translate-x-0.5"
                                                    )} />
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-6">
                            <Controller
                                name="allowedIps"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        label="Authorized Office Public IP Addresses"
                                        placeholder="e.g. 103.21.244.2, 192.168.1.1 (comma-separated)"
                                        error={!!errors.allowedIps}
                                        helperText={errors.allowedIps?.message || "Separate multiple public office IPs with commas (e.g. 103.21.244.2, 103.21.244.3)"}
                                        startAdornment={<Wifi className="w-4 h-4 text-foreground-tertiary" />}
                                    />
                                )}
                            />
                        </div>

                        <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <span className="text-foreground-tertiary">
                                💡 Tip: Click below to auto-fill your current connected public network IP.
                            </span>
                            <Button
                                type="button"
                                variant="secondaryOutline"
                                size="sm"
                                className="gap-1.5 h-8 text-xs font-semibold"
                                onClick={handleGetCurrentIp}
                                disabled={isFetchingIp}
                            >
                                <Wifi className={cn("w-3.5 h-3.5 text-primary", isFetchingIp && "animate-spin")} />
                                {isFetchingIp ? "Fetching IP..." : "Use Current IP"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ModalFooter>
                <Button variant="secondaryOutline" onClick={onCancel} className="w-full sm:w-auto">
                    Cancel
                </Button>
                <Button type="submit" form="location-form" disabled={isLoading} className="w-full sm:w-auto">
                    {initialValues?._id ? "Save Changes" : "Create"}
                </Button>
            </ModalFooter>
        </form>
    );
};

export default LocationForm;
