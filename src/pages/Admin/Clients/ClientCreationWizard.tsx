import React, { useState, useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
    Building2,
    User,
    Mail,
    Phone,
    Globe,
    Clock,
    DollarSign,
    TrendingUp,
    Calendar,
    ChevronRight,
    // ChevronLeft,
    Users,
    Check
} from "lucide-react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { Currency, type Client } from "../../../types/client.types";
import { cn } from "../../../lib/utils";
import FormError from "../../../components/common/FormError/FormError";
import { userService } from "../../../services/userService";
import type { User as UserType } from "../../../types/user.types";
import Avatar from "../../../components/common/Avatar";

const schema = yup.object({
    name: yup.string().required("Client name is required").trim(),
    primary_contact: yup.object({
        name: yup.string().required("Contact name is required").trim(),
        email: yup.string().email("Invalid email").required("Email is required").trim(),
        phone: yup.string().required("Phone is required").trim(),
    }),
    city: yup.string().required("City is required").trim(),
    timezone: yup.string().required("Timezone is required").trim(),
    billing_rate: yup.number().positive("Rate must be positive").required("Rate is required"),
    currency: yup.mixed<Currency>().oneOf(Object.values(Currency)).required("Currency is required"),
    internal_expense_inr: yup.number().min(0, "Expense cannot be negative").required("Internal expense is required"),
    referral_source: yup.string().optional().trim(),
    onboarding_date: yup.string().required("Onboarding date is required"),
    is_active: yup.boolean().default(true),
});

type ClientFormData = yup.InferType<typeof schema>;

interface ClientCreationWizardProps {
    initialValues?: Partial<Client>;
    onSubmit: (data: ClientFormData & { assigned_employees: string[] }) => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | string[] | null;
}

const STEPS = [
    { id: 'basic', title: 'Identity', icon: Building2 },
    { id: 'financials', title: 'Financials', icon: DollarSign },
    { id: 'marketing', title: 'Intelligence', icon: TrendingUp },
    { id: 'team', title: 'Team', icon: Users },
];

const ClientCreationWizard: React.FC<ClientCreationWizardProps> = ({
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
}) => {
    const [step, setStep] = useState(0);
    const [employees, setEmployees] = useState<UserType[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>(() => {
        const assigned = initialValues?.assigned_employees;
        if (!assigned) return [];
        return assigned.map((emp: any) => {
            if (typeof emp === 'string') return emp;
            return emp.id || emp._id || String(emp);
        });
    });
    const [searchEmp, setSearchEmp] = useState("");

    const { control, handleSubmit, trigger, formState: { errors } } = useForm<ClientFormData>({
        // @ts-ignore - resolver type mismatch in some versions
        resolver: yupResolver(schema) as Resolver<ClientFormData>,
        defaultValues: {
            name: initialValues?.name || "",
            primary_contact: {
                name: initialValues?.primary_contact?.name || "",
                email: initialValues?.primary_contact?.email || "",
                phone: initialValues?.primary_contact?.phone || "",
            },
            city: initialValues?.city || "",
            timezone: initialValues?.timezone || "UTC",
            billing_rate: initialValues?.billing_rate || 0,
            currency: initialValues?.currency || Currency.USD,
            internal_expense_inr: initialValues?.internal_expense_inr || 0,
            referral_source: initialValues?.referral_source || "",
            onboarding_date: initialValues?.onboarding_date ? initialValues.onboarding_date.split('T')[0] : new Date().toISOString().split('T')[0],
            is_active: initialValues?.is_active ?? true,
        },
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await userService.getAll({ limit: 100 });
                setEmployees(res.users);
            } catch (err) {
                console.error("Failed to fetch employees", err);
            }
        };
        fetchEmployees();
    }, []);

    const nextStep = async () => {
        let fieldsToValidate: (keyof ClientFormData | string)[] = [];
        if (step === 0) fieldsToValidate = ['name', 'primary_contact', 'city', 'timezone'];
        if (step === 1) fieldsToValidate = ['billing_rate', 'currency', 'internal_expense_inr'];
        if (step === 2) fieldsToValidate = ['referral_source', 'onboarding_date'];

        const isValid = await trigger(fieldsToValidate as any);
        if (isValid) setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const handleFinalSubmit = () => {
        handleSubmit((data: ClientFormData) => {
            onSubmit({ ...data, assigned_employees: selectedEmployees });
        })();
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const filteredEmployees = employees.filter(e => {
        const fullName = `${e.personalInfo.firstName} ${e.personalInfo.lastName}`;
        return fullName.toLowerCase().includes(searchEmp.toLowerCase()) ||
            e.personalInfo.email.toLowerCase().includes(searchEmp.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full -mt-2">
            {/* Step Progress */}
            <div className="flex items-center justify-between mb-8 px-2">
                {STEPS.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = step === idx;
                    const isCompleted = step > idx;
                    return (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-2 relative">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border-2",
                                    isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" :
                                        isCompleted ? "bg-success/10 border-success/30 text-success" :
                                            "bg-muted border-border text-foreground-tertiary"
                                )}>
                                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest absolute -bottom-6 w-max",
                                    isActive ? "text-primary" : "text-foreground-tertiary"
                                )}>
                                    {s.title}
                                </span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={cn(
                                    "h-0.5 flex-1 mx-4 rounded-full transition-colors",
                                    isCompleted ? "bg-success/30" : "bg-border"
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="space-y-6 pt-6">
                <FormError message={error} />

                {step === 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    label="Client Corporation Name"
                                    placeholder="e.g. Cyberdyne Systems"
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                    startAdornment={<Building2 className="w-4 h-4" />}
                                />
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Controller
                                name="primary_contact.name"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        label="Primary Contact Name"
                                        placeholder="e.g. John Doe"
                                        error={!!errors.primary_contact?.name}
                                        helperText={errors.primary_contact?.name?.message}
                                        startAdornment={<User className="w-4 h-4" />}
                                    />
                                )}
                            />
                            <Controller
                                name="primary_contact.email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        label="Contact Email"
                                        placeholder="john@example.com"
                                        error={!!errors.primary_contact?.email}
                                        helperText={errors.primary_contact?.email?.message}
                                        startAdornment={<Mail className="w-4 h-4" />}
                                    />
                                )}
                            />
                            <Controller
                                name="primary_contact.phone"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        label="Contact Phone"
                                        placeholder="+1 (555) 000-0000"
                                        error={!!errors.primary_contact?.phone}
                                        helperText={errors.primary_contact?.phone?.message}
                                        startAdornment={<Phone className="w-4 h-4" />}
                                    />
                                )}
                            />
                            <Controller
                                name="city"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        label="Primary Location (City)"
                                        placeholder="e.g. San Francisco"
                                        error={!!errors.city}
                                        helperText={errors.city?.message}
                                        startAdornment={<Globe className="w-4 h-4" />}
                                    />
                                )}
                            />
                        </div>
                        <Controller
                            name="timezone"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    label="Account Timezone"
                                    placeholder="e.g. America/Los_Angeles"
                                    error={!!errors.timezone}
                                    helperText={errors.timezone?.message}
                                    startAdornment={<Clock className="w-4 h-4" />}
                                />
                            )}
                        />
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3 mb-4">
                            <DollarSign className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-black uppercase text-primary tracking-widest">Confidential Billing Data</h4>
                                <p className="text-[10px] text-foreground-tertiary">Only visible to Head of Department and Finance teams.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Controller
                                name="billing_rate"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="number"
                                        label="Standard Billing Rate"
                                        placeholder="0.00"
                                        error={!!errors.billing_rate}
                                        helperText={errors.billing_rate?.message}
                                        startAdornment={<DollarSign className="w-4 h-4" />}
                                    />
                                )}
                            />
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-foreground-tertiary uppercase tracking-widest px-1">
                                            Billing Currency
                                        </label>
                                        <select
                                            {...field}
                                            className={cn(
                                                "w-full px-5 py-3 text-sm border rounded-2xl bg-surface transition-all duration-300 outline-none h-[48px]",
                                                "focus:ring-4 focus:ring-primary/10 focus:border-primary",
                                                errors.currency ? "border-error" : "border-border hover:border-primary/40"
                                            )}
                                        >
                                            <option value={Currency.USD}>USD - United States Dollar</option>
                                            <option value={Currency.GBP}>GBP - British Pound Sterling</option>
                                        </select>
                                    </div>
                                )}
                            />
                        </div>
                        <Controller
                            name="internal_expense_inr"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    type="number"
                                    label="Internal Expense (INR)"
                                    placeholder="Monthly estimated cost in INR"
                                    error={!!errors.internal_expense_inr}
                                    helperText={errors.internal_expense_inr?.message}
                                    startAdornment={<div className="text-[10px] font-bold">₹</div>}
                                />
                            )}
                        />
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Controller
                            name="referral_source"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    label="Referral Source"
                                    placeholder="e.g. LinkedIn, Organic, Partner"
                                    error={!!errors.referral_source}
                                    helperText={errors.referral_source?.message}
                                    startAdornment={<TrendingUp className="w-4 h-4" />}
                                />
                            )}
                        />
                        <Controller
                            name="onboarding_date"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    type="date"
                                    label="Source of Truth (Onboarding Date)"
                                    error={!!errors.onboarding_date}
                                    helperText={errors.onboarding_date?.message}
                                    startAdornment={<Calendar className="w-4 h-4" />}
                                />
                            )}
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-foreground-tertiary uppercase tracking-widest px-1">
                                Assign Employees to Account
                            </label>
                            <div className="relative mb-4">
                                <Input
                                    value={searchEmp}
                                    onChange={(e) => setSearchEmp(e.target.value)}
                                    placeholder="Search employees to assign..."
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="border border-border rounded-2xl max-h-[250px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {filteredEmployees.length === 0 ? (
                                    <div className="py-8 text-center text-foreground-tertiary text-xs">
                                        No employees found matching.
                                    </div>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <div
                                            key={emp.id}
                                            onClick={() => toggleEmployee(emp.id)}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                                                selectedEmployees.includes(emp.id)
                                                    ? "bg-primary/10 border border-primary/20 shadow-sm"
                                                    : "hover:bg-muted/50 border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={emp.personalInfo.profilePicture}
                                                    name={`${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`}
                                                    size="sm"
                                                    className="rounded-lg shadow-sm"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground">
                                                        {emp.personalInfo.firstName} {emp.personalInfo.lastName}
                                                    </span>
                                                    <span className="text-[10px] text-foreground-tertiary lowercase">
                                                        {emp.personalInfo.email}
                                                    </span>
                                                </div>
                                            </div>
                                            {selectedEmployees.includes(emp.id) && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="px-2 flex items-center justify-between text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">
                                <span>{selectedEmployees.length} Resources Selected</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedEmployees([])}
                                    className="text-primary hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex items-center justify-between w-full">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={step === 0 ? onCancel : prevStep}
                            disabled={isLoading}
                        >
                            {step === 0 ? "Cancel" : "Back"}
                        </Button>
                        <div className="flex items-center gap-2">
                            {step < STEPS.length - 1 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    endIcon={<ChevronRight className="w-4 h-4" />}
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleFinalSubmit}
                                    disabled={isLoading}
                                    startIcon={isLoading ? undefined : <Check className="w-4 h-4" />}
                                >
                                    {isLoading ? "Provisioning..." : initialValues?.id ? "Update Client" : "Finalize Onboarding"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientCreationWizard;
