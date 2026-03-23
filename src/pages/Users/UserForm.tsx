import React, { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Control, UseFormSetValue, Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  User as UserIcon,
  Mail,
  MapPin,
  Briefcase,
  Shield,
  Calendar,
  Phone,
  Fingerprint,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
} from "lucide-react";
import type { User, UserRole, EmploymentType } from "../../types/user.types";
import type { OfficeLocation, Department, Designation, LeaveType } from "../../types/organization.types";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { cn } from "../../lib/utils";
import FormSelect from "../../components/common/Select/FormSelect";
import { WEEK_DAYS } from "../../utils/constants";
import FormError from "../../components/common/FormError/FormError";
import { cleanFormData } from "../../utils/formHelpers";
import { ModalFooter } from "../../components/common/Modal/Modal";

import type { Role } from "../../types/role.types";

interface UserFormProps {
  initialValues?: Partial<User>;
  onSubmit: (data: User) => void;
  isLoading?: boolean;
  locations?: OfficeLocation[];
  departments?: Department[];
  designations?: Designation[];
  roles?: Role[];
  onCancel?: () => void;
  error?: string | string[] | null;
  users?: User[];
  leaveTypes?: LeaveType[];
}

const baseSchema = yup.object({
  isAdmin: yup.boolean().required().default(false),
  isHolidayApplicable: yup.boolean().default(true),
  employeeId: yup.string().required("Employee ID is required").trim().uppercase(),
  username: yup.string().required("Username is required").min(3).max(50).trim().lowercase(),
  personalInfo: yup.object({
    firstName: yup.string().required("First name is required").max(50).trim(),
    lastName: yup.string().required("Last name is required").max(50).trim(),
    email: yup.string().email("Invalid email").required("Email is required").matches(/^\S+@\S+\.\S+$/, 'Please enter a valid email').lowercase().trim(),
    profilePicture: yup.string().url("Invalid URL").trim(),
    phone: yup.string(),
    dateOfBirth: yup.string(),
    address: yup.object({
      street: yup.string(),
      city: yup.string(),
      state: yup.string(),
      country: yup.string(),
      zipCode: yup.string(),
    }),
    emergencyContact: yup.object({
      name: yup.string(),
      relationship: yup.string(),
      phone: yup.string(),
    }),
  }),
  employment: yup.object({
    role: yup.string().required("Role is required"),
    department: yup.string().required("Department is required"),
    designation: yup.string().required("Designation is required"),
    dateOfJoining: yup.string().required("Joining date is required"),
    employmentType: yup.string().oneOf(["full-time", "part-time", "contract", "intern"]).required("Type is required"),
    reportingManager: yup.string(),
    location: yup.string(),
    timezone: yup.string().default("Asia/Kolkata"),
    workingHours: yup.object({
      startTime: yup.string(),
      endTime: yup.string(),
      weeklyOff: yup.array().of(yup.string().defined()).defined().default([]),
    }),
  }),
  permissions: yup.object({
    modules: yup.array().of(yup.string().defined()).defined().default([]),
    canApproveLeave: yup.boolean().default(false),
    canApproveReimbursement: yup.boolean().default(false),
    canManageSchedule: yup.boolean().default(false),
    canViewReports: yup.boolean().default(false),
  }),
  leaveBalance: yup.lazy(val =>
    yup.object().shape(
      Object.keys(val || {}).reduce((acc, key) => ({
        ...acc,
        [key]: yup.number().min(0).default(0)
      }), {})
    )
  ),
  allowedIPs: yup.array().of(yup.string().defined()).defined().default([]),
});

type UserFormValues = {
  isAdmin: boolean;
  isHolidayApplicable: boolean;
  employeeId: string;
  username: string;
  password?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    phone?: string;
    dateOfBirth?: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
    emergencyContact: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
  };
  employment: {
    role: UserRole;
    department: string;
    designation: string;
    dateOfJoining: string;
    employmentType: EmploymentType;
    reportingManager?: string;
    location?: string;
    timezone?: string;
    workingHours: {
      startTime?: string;
      endTime?: string;
      weeklyOff: string[];
    };
  };
  permissions: {
    modules: string[];
    canApproveLeave: boolean;
    canApproveReimbursement: boolean;
    canManageSchedule: boolean;
    canViewReports: boolean;
  };
  leaveBalance: Record<string, number>;
  allowedIPs: string[];
  id?: string;
  _id?: string;
  isActive?: boolean;
};


interface CardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<UserFormValues, any, any>;
}

interface LeaveCardProps extends CardProps {
  leaveTypes?: LeaveType[];
}

const IdentityCard: React.FC<CardProps & { isEditMode: boolean; showPassword: boolean; setShowPassword: (v: boolean) => void }> = ({
  control,
  isEditMode,
  showPassword,
  setShowPassword
}) => (
  <Card variant="bordered" className="overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
    <CardHeader className="bg-primary/5 border-b border-primary/10 p-2 sm:p-2.5">
      <CardTitle className="flex items-center gap-1.5 text-primary text-xs sm:text-sm">
        <Fingerprint className="w-3.5 h-3.5" />
        System Access
      </CardTitle>
    </CardHeader>
    <CardContent className="p-2 sm:p-3 space-y-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!isEditMode && (
          <Controller
            name="employeeId"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Input {...field} label="Employee ID" placeholder="EMP001" error={!!error} helperText={error?.message} className="rounded-xl" />
            )}
          />
        )}
        <Controller
          name="username"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Username" placeholder="johndoe" error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
      </div>
      {!isEditMode && (
        <Controller
          name={"password" as never}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input
              {...field}
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              error={!!error}
              helperText={error?.message}
              className="rounded-xl"
              endAdornment={
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-primary transition-colors focus:outline-none h-8 w-8"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              }
            />
          )}
        />
      )}
    </CardContent>
  </Card>
);

const PersonalCard: React.FC<CardProps> = ({ control }) => (
  <Card variant="bordered" className="overflow-hidden border-accent/10 shadow-sm rounded-2xl">
    <CardHeader className="bg-accent/5 border-b border-accent/10 p-2 sm:p-2.5">
      <CardTitle className="flex items-center gap-1.5 text-accent text-xs sm:text-sm">
        <UserIcon className="w-3.5 h-3.5" />
        Personal Profile
      </CardTitle>
    </CardHeader>
    <CardContent className="p-2 sm:p-3 space-y-1.5">
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="personalInfo.firstName"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="First Name" error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
        <Controller
          name="personalInfo.lastName"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Last Name" error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
      </div>
      <Controller
        name="personalInfo.email"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Input {...field} label="Email Address" type="email" startAdornment={<Mail className="w-4 h-4" />} error={!!error} helperText={error?.message} className="rounded-xl" />
        )}
      />
      {/* <Controller
        name="personalInfo.profilePicture"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Input {...field} label="Profile Picture URL" placeholder="https://example.com/image.jpg" error={!!error} helperText={error?.message} className="rounded-xl" />
        )}
      /> */}
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="personalInfo.phone"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Phone Number" startAdornment={<Phone className="w-4 h-4" />} error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
        <Controller
          name="personalInfo.dateOfBirth"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Date of Birth" type="date" error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
      </div>
    </CardContent>
  </Card>
);

const EmergencyCard: React.FC<CardProps> = ({ control }) => (
  <Card variant="bordered" className="overflow-hidden border-rose-500/10 shadow-sm rounded-2xl">
    <CardHeader className="bg-rose-500/5 border-b border-rose-500/10 p-2 sm:p-2.5">
      <CardTitle className="flex items-center gap-1.5 text-rose-600 text-xs sm:text-sm">
        <Phone className="w-3.5 h-3.5" />
        Emergency Contact
      </CardTitle>
    </CardHeader>
    <CardContent className="p-2 sm:p-3 space-y-1.5">
      <Controller
        name="personalInfo.emergencyContact.name"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Input {...field} label="Contact Name" error={!!error} helperText={error?.message} className="rounded-xl" />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="personalInfo.emergencyContact.relationship"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Relationship" error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
        <Controller
          name="personalInfo.emergencyContact.phone"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Phone" startAdornment={<Phone className="w-4 h-4" />} error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
      </div>
    </CardContent>
  </Card>
);

const AddressCard: React.FC<CardProps> = ({ control }) => (
  <Card variant="bordered" className="overflow-hidden border-info/10 shadow-sm rounded-2xl">
    <CardHeader className="bg-info/5 border-b border-info/10 p-2 sm:p-2.5">
      <CardTitle className="flex items-center gap-1.5 text-info text-xs sm:text-sm">
        <MapPin className="w-3.5 h-3.5" />
        Residential Address
      </CardTitle>
    </CardHeader>
    <CardContent className="p-2 sm:p-3 space-y-1.5">
      <Controller
        name="personalInfo.address.street"
        control={control}
        render={({ field }) => (
          <Input {...field} label="Street Address" className="rounded-xl" />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="personalInfo.address.city"
          control={control}
          render={({ field }) => (
            <Input {...field} label="City" className="rounded-xl" />
          )}
        />
        <Controller
          name="personalInfo.address.state"
          control={control}
          render={({ field }) => (
            <Input {...field} label="State / Province" className="rounded-xl" />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="personalInfo.address.country"
          control={control}
          render={({ field }) => (
            <Input {...field} label="Country" className="rounded-xl" />
          )}
        />
        <Controller
          name="personalInfo.address.zipCode"
          control={control}
          render={({ field }) => (
            <Input {...field} label="ZIP Code" className="rounded-xl" />
          )}
        />
      </div>
    </CardContent>
  </Card>
);

const EmploymentCard: React.FC<CardProps & {
  locations: OfficeLocation[];
  departments: Department[];
  designations: Designation[];
  roles?: Role[];
  users: User[];
  currentUserId?: string;
  setValue: UseFormSetValue<UserFormValues>;
}> = ({ control, locations, departments, designations, roles = [], users, currentUserId, setValue }) => (
  <Card variant="bordered" className="overflow-hidden border-success/10 shadow-lg sm:shadow-xl shadow-success/5 rounded-2xl sm:rounded-3xl">
    <CardHeader className="bg-success/5 border-b border-success/10 p-3 sm:p-4 lg:p-6">
      <CardTitle className="flex items-center gap-2 text-success text-sm sm:text-base lg:text-lg">
        <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
        Career Details
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <Controller
          name="employment.role"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormSelect
              {...field}
              label="Role"
              options={roles.length > 0 ? roles.filter(r => r.isActive).map(r => ({ value: r.name.toLowerCase(), label: r.name })) : [
                { value: "employee", label: "Employee" },
                { value: "manager", label: "Manager" },
                { value: "hr", label: "HR" },
                { value: "admin", label: "Admin" },
                { value: "contractor", label: "Contractor" },
                { value: "client", label: "Client" }
              ]}
              error={!!error}
              helperText={error?.message}
            />
          )}
        />

        <Controller
          name="employment.employmentType"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormSelect
              {...field}
              label="Contract Type"
              options={[
                { value: "full-time", label: "Full-Time" },
                { value: "part-time", label: "Part-Time" },
                { value: "contract", label: "Contract" },
                { value: "intern", label: "Intern" },
              ]}
              error={!!error}
              helperText={error?.message}
            />
          )}
        />

        <Controller
          name="employment.reportingManager"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormSelect
              {...field}
              label="Reporting Manager"
              options={[
                { value: "", label: "None (Top Level)" },
                ...users
                  .filter(u => u._id !== currentUserId)
                  .map(u => ({
                    value: u._id,
                    label: `${u.personalInfo.firstName} ${u.personalInfo.lastName} (${u.employment.designation})`
                  }))
              ]}
              error={!!error}
              helperText={error?.message}
              placeholder="Select Manager"
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-border/50 pt-4">
        <Controller
          name="employment.department"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormSelect
              {...field}
              label="Department"
              options={departments.filter(d => d.isActive).map(d => ({ value: d.name, label: d.name }))}
              placeholder="Select Department"
              error={!!error}
              helperText={error?.message}
            />
          )}
        />
        <Controller
          name="employment.designation"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormSelect
              {...field}
              label="Designation"
              options={designations.filter(d => d.isActive).map(d => ({ value: d.title || d.name || "Untitled", label: d.title || d.name || "Untitled" }))}
              placeholder="Select Designation"
              error={!!error}
              helperText={error?.message}
            />
          )}
        />
        <Controller
          name="employment.location"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormSelect
              {...field}
              label="Work Location"
              options={locations.filter(l => l.isActive).map(l => ({ value: l.name, label: l.name }))}
              placeholder="Select Location"
              error={!!error}
              helperText={error?.message}
              onChange={(value) => {
                field.onChange(value);
                const selectedLoc = locations.find(l => l.name === value);
                if (selectedLoc?.timezone) {
                  setValue("employment.timezone", selectedLoc.timezone);
                }
              }}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-border/50 pt-4">
        <Controller
          name="employment.dateOfJoining"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Input {...field} label="Joining Date" type="date" error={!!error} helperText={error?.message} className="rounded-xl" />
          )}
        />
        <Controller
          name="employment.workingHours.startTime"
          control={control}
          render={({ field }) => (
            <Input {...field} label="Start Time" type="time" className="rounded-xl" />
          )}
        />
        <Controller
          name="employment.workingHours.endTime"
          control={control}
          render={({ field }) => (
            <Input {...field} label="End Time" type="time" className="rounded-xl" />
          )}
        />
      </div>


      <div className="space-y-2 sm:space-y-3">
        <label className="block text-xs sm:text-sm font-bold text-foreground-tertiary uppercase tracking-wide sm:tracking-widest px-1">
          Weekly Off
        </label>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {WEEK_DAYS.map(({ label, value }) => (
            <Controller
              key={value}
              name="employment.workingHours.weeklyOff"
              control={control}
              render={({ field }) => {
                const selected = Array.isArray(field.value) ? field.value : [];
                const isSelected = selected.includes(value);

                return (
                  <Button
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      const updated = isSelected
                        ? selected.filter((d) => d !== value)
                        : [...selected, value];
                      field.onChange(updated);
                    }}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border h-auto",
                      isSelected
                        ? "shadow-md shadow-primary/20"
                        : "bg-surface border-border text-foreground hover:border-primary/50"
                    )}
                  >
                    {label}
                  </Button>
                );
              }}
            />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

const PermissionsCard: React.FC<CardProps> = ({ control }) => (
  <Card variant="bordered" className="overflow-hidden border-error/10 shadow-lg shadow-error/5 rounded-2xl sm:rounded-3xl">
    <CardHeader className="bg-error/5 border-b border-error/10 p-2 sm:p-3">
      <CardTitle className="flex items-center gap-2 text-error text-sm sm:base">
        <Shield className="w-4 h-4" />
        System Privileges
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {[
        { name: "isAdmin", label: "Administrator Status", color: "text-amber-600", borderColor: "border-amber-500/20" },
        { name: "isHolidayApplicable", label: "Holiday Eligibility", color: "text-blue-600", borderColor: "border-blue-500/20" },
        { name: "permissions.canApproveLeave", label: "Approve Leaves" },
        { name: "permissions.canApproveReimbursement", label: "Approve Reimbursements" },
        { name: "permissions.canManageSchedule", label: "Manage Schedules" },
        { name: "permissions.canViewReports", label: "View Reports" },
      ].map((perm) => (
        <Controller
          key={perm.name}
          name={perm.name as never}
          control={control}
          render={({ field }) => (
            <label className={cn(
              "flex items-center p-2 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted transition-colors cursor-pointer group",
              perm.borderColor
            )}>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="w-4 h-4 rounded-md border-2 border-border text-primary focus:ring-primary/20 transition-all"
              />
              <span className={cn(
                "ml-2 text-[11px] sm:text-xs font-bold transition-colors uppercase tracking-tight",
                perm.color || "text-foreground group-hover:text-primary"
              )}>
                {perm.label}
              </span>
            </label>
          )}
        />
      ))}
    </CardContent>
  </Card>
);

const SecurityIPCard: React.FC<CardProps & { ipInput: string; setIpInput: (v: string) => void }> = ({
  control,
  ipInput,
  setIpInput
}) => (
  <Card variant="bordered" className="overflow-hidden border-indigo-500/10 shadow-lg shadow-indigo-500/5 rounded-2xl sm:rounded-3xl">
    <CardHeader className="bg-indigo-500/5 border-b border-indigo-500/10 p-2 sm:p-3">
      <CardTitle className="flex items-center gap-2 text-indigo-600 text-sm sm:text-base">
        <Shield className="w-4 h-4" />
        Network Security
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 space-y-3">
      <Controller
        name="allowedIPs"
        control={control}
        render={({ field, fieldState: { error } }) => {
          const currentValue = Array.isArray(field.value) ? field.value : [];

          const addIP = () => {
            if (!ipInput.trim()) return;

            if (!/^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/.test(ipInput)) {
              return;
            }

            if (!currentValue.includes(ipInput)) {
              field.onChange([...currentValue, ipInput]);
            }

            setIpInput("");
          };

          const removeIP = (ip: string) => {
            field.onChange(currentValue.filter((v) => v !== ip));
          };

          return (
            <div>
              {/* Input */}
              <Input
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIP();
                  }
                }}
                label="Allowed IPs"
                placeholder="Type IP and press Enter"
                error={!!error}
                helperText={error?.message || "Leave empty to allow all IPs"}
                className="rounded-2xl"
                endAdornment={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={addIP}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all focus:outline-none"
                    title="Add IP"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                }
              />

              {/* IP Tags */}
              {currentValue.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentValue.map((ip) => (
                    <span
                      key={ip}
                      className="flex items-center gap-2 px-3 py-1 text-sm rounded-xl bg-muted border"
                    >
                      {ip}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIP(ip ?? "")}
                        className="text-red-500 hover:text-red-700 w-6 h-6 p-0"
                      >
                        ×
                      </Button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      />
    </CardContent>
  </Card>
);

const LeaveCard: React.FC<LeaveCardProps> = ({ control, leaveTypes }) => (
  <Card variant="bordered" className="overflow-hidden border-orange-500/10 shadow-lg shadow-orange-500/5 rounded-2xl sm:rounded-3xl">
    <CardHeader className="bg-orange-500/5 border-b border-orange-500/10 p-2 sm:p-3">
      <CardTitle className="flex items-center gap-2 text-orange-600 text-sm sm:text-base">
        <Calendar className="w-4 h-4" />
        Leave Credits
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 sm:p-4">
      <Controller
        name="leaveBalance"
        control={control}
        render={({ field }) => {
          const balances = field.value || {};

          // Use leaveTypes if provided to ensure all active types are shown
          // Fallback to keys in balances if leaveTypes not provided
          const keysToRender = leaveTypes && leaveTypes.length > 0
            ? leaveTypes.map(lt => lt.name)
            : Object.keys(balances);

          const getLabel = (codeOrName: string) => {
            if (leaveTypes) {
              const lt = leaveTypes.find(l => l.name === codeOrName || l.name.toLowerCase().trim() === codeOrName.toLowerCase().trim());
              return lt ? lt.name.toUpperCase() : codeOrName.toUpperCase();
            }
            return codeOrName.toUpperCase();
          };

          if (keysToRender.length === 0) {
            return (
              <div className="text-center py-4 bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-[10px] font-black uppercase text-foreground-tertiary">No entitlements defined</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {keysToRender.map((key) => {
                const lt = leaveTypes?.find(l => l.name === key || l.name.toLowerCase().trim() === key.toLowerCase().trim());
                const defaultValue = lt?.defaultAmount ?? 0;

                return (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest px-1">
                      {getLabel(key)}
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={balances[key] ?? defaultValue}
                      onChange={(e) => {
                        const newVal = parseFloat(e.target.value) || 0;
                        field.onChange({ ...balances, [key]: newVal });
                      }}
                      className="rounded-xl h-[40px] text-sm"
                    />
                  </div>
                );
              })}
            </div>
          );
        }}
      />
    </CardContent>
  </Card>
);

// Helper to calculate leave balance based on leave types and existing values
const getCalculatedLeaveBalance = (
  types: LeaveType[],
  existing: Record<string, number> = {}
): Record<string, number> => {
  const balance: Record<string, number> = {};
  const existingNormalized: Record<string, number> = {};

  if (existing) {
    Object.keys(existing).forEach((k) => {
      const val = existing[k];
      if (val !== undefined && val !== null) {
        existingNormalized[k.toLowerCase().trim()] = Number(val);
      }
    });
  }

  types.forEach((lt) => {
    const canonicalName = lt.name;
    const codeKey = lt.code.toLowerCase().trim();
    const nameKeyLower = lt.name.toLowerCase().trim();
    const idKey = lt._id?.toLowerCase().trim();

    if (existingNormalized[nameKeyLower] !== undefined) {
      balance[canonicalName] = existingNormalized[nameKeyLower];
    } else if (existingNormalized[codeKey] !== undefined) {
      balance[canonicalName] = existingNormalized[codeKey];
    } else if (idKey && existingNormalized[idKey] !== undefined) {
      balance[canonicalName] = existingNormalized[idKey];
    } else {
      balance[canonicalName] = lt.defaultAmount || 0;
    }
  });

  return balance;
};

const UserForm: React.FC<UserFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
  locations = [],
  departments = [],
  designations = [],
  roles = [],
  onCancel,
  error,
  users = [],
  leaveTypes,
}) => {
  const isEditMode = !!initialValues?.employeeId;
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [ipInput, setIpInput] = useState("");
  const totalSteps = 3;

  const steps = [
    { title: "Identity & Personal" },
    { title: "Employment" },
    { title: "Access & Settings" },
  ];

  const validationSchema = useMemo(() => {
    return isEditMode
      ? baseSchema
      : baseSchema.shape({
        password: yup.string()
          .required("Password is required")
          .min(8, "Password must be at least 8 characters")
          .matches(/[A-Z]/, "Must contain at least one uppercase letter")
          .matches(/[a-z]/, "Must contain at least one lowercase letter")
          .matches(/[0-9]/, "Must contain at least one number")
          .matches(/[!@#$%^&*(),.?":{}|<>]/, "Must contain at least one special character"),
      });
  }, [isEditMode]);

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
  } = useForm<UserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(validationSchema) as Resolver<UserFormValues, any>,
    defaultValues: {
      isAdmin: initialValues?.isAdmin || false,
      isHolidayApplicable: initialValues?.isHolidayApplicable ?? true,
      employeeId: initialValues?.employeeId || "",
      ...(!isEditMode && { password: "" }), // Only include password for new users
      username: initialValues?.username || "",
      personalInfo: {
        firstName: initialValues?.personalInfo?.firstName || "",
        lastName: initialValues?.personalInfo?.lastName || "",
        email: initialValues?.personalInfo?.email || "",
        phone: initialValues?.personalInfo?.phone || "",
        dateOfBirth: initialValues?.personalInfo?.dateOfBirth ? String(initialValues.personalInfo.dateOfBirth).split('T')[0] : "",
        address: {
          street: initialValues?.personalInfo?.address?.street || "",
          city: initialValues?.personalInfo?.address?.city || "",
          state: initialValues?.personalInfo?.address?.state || "",
          country: initialValues?.personalInfo?.address?.country || "",
          zipCode: initialValues?.personalInfo?.address?.zipCode || "",
        },
        emergencyContact: {
          name: initialValues?.personalInfo?.emergencyContact?.name || "",
          relationship: initialValues?.personalInfo?.emergencyContact?.relationship || "",
          phone: initialValues?.personalInfo?.emergencyContact?.phone || "",
        },
      },
      employment: {
        role: initialValues?.employment?.role || "employee",
        department: initialValues?.employment?.department || "",
        designation: initialValues?.employment?.designation || "",
        dateOfJoining: initialValues?.employment?.dateOfJoining ? String(initialValues.employment.dateOfJoining).split('T')[0] : "",
        employmentType: initialValues?.employment?.employmentType || "full-time",
        reportingManager: (() => {
          const rm = initialValues?.employment?.reportingManager;
          if (!rm) return "";
          if (typeof rm === "string") return rm;
          const rmObj = rm as Record<string, unknown>;
          if (rmObj._id) return String(rmObj._id);
          if (rmObj.id) return String(rmObj.id);
          return "";
        })(),
        location: initialValues?.employment?.location || "",
        timezone: initialValues?.employment?.timezone || "Asia/Kolkata",
        workingHours: {
          startTime: initialValues?.employment?.workingHours?.startTime || "09:00",
          endTime: initialValues?.employment?.workingHours?.endTime || "18:00",
          weeklyOff: initialValues?.employment?.workingHours?.weeklyOff || [],
        },
      },
      permissions: {
        modules: initialValues?.permissions?.modules || [],
        canApproveLeave: initialValues?.permissions?.canApproveLeave || false,
        canApproveReimbursement: initialValues?.permissions?.canApproveReimbursement || false,
        canManageSchedule: initialValues?.permissions?.canManageSchedule || false,
        canViewReports: initialValues?.permissions?.canViewReports || false,
      },
      leaveBalance: getCalculatedLeaveBalance(leaveTypes || [], initialValues?.leaveBalance || {}),
      allowedIPs: initialValues?.allowedIPs || [],
    },
  });



  const calculateLeaveBalance = useMemo(() => {
    if (!leaveTypes || leaveTypes.length === 0) {
      return initialValues?.leaveBalance || {};
    }
    return getCalculatedLeaveBalance(leaveTypes, initialValues?.leaveBalance || {});
  }, [leaveTypes, initialValues]);

  useEffect(() => {
    if (leaveTypes && leaveTypes.length > 0 && Object.keys(calculateLeaveBalance).length > 0) {
      const currentValues = getValues();
      const currentBalance = currentValues.leaveBalance || {};

      // In create mode, if balance is empty, fill it completely
      if (!isEditMode && Object.keys(currentBalance).length === 0) {
        setValue("leaveBalance", calculateLeaveBalance);
      }
      // In edit mode or if already partially filled, only fill missing keys
      else {
        const hasMissingKeys = Object.keys(calculateLeaveBalance).some(
          (key) => currentBalance[key] === undefined
        );
        if (hasMissingKeys) {
          const newBalance = { ...calculateLeaveBalance, ...currentBalance };
          setValue("leaveBalance", newBalance);
        }
      }
    }
  }, [calculateLeaveBalance, leaveTypes, isEditMode, setValue, getValues]);

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 1:
        return [
          ...(isEditMode ? ["username"] : ["employeeId", "username", "password"]),
          "personalInfo.firstName",
          "personalInfo.lastName",
          "personalInfo.email",
        ];
      case 2:
        return [
          "employment.role",
          "employment.department",
          "employment.designation",
          "employment.dateOfJoining",
          "employment.employmentType",
        ];
      case 3:
        return [];
      default:
        return [];
    }
  };

  const handleNext = async () => {
    const fields = getStepFields(currentStep);
    const isValid = await trigger(fields as never[]);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };



  const handleFormSubmit = (data: UserFormValues) => {
    // 1. Convert simple dates to full ISO strings as expected by backend
    const formattedData = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        dateOfBirth: data.personalInfo.dateOfBirth ? new Date(data.personalInfo.dateOfBirth).toISOString() : undefined
      },
      employment: {
        ...data.employment,
        dateOfJoining: data.employment.dateOfJoining ? new Date(data.employment.dateOfJoining).toISOString() : undefined,
        // Ensure reportingManager is null if empty string
        reportingManager: data.employment.reportingManager || null
      }
    };

    // 2. Prepare payload - remove root keys that should be nested if they accidentally exist
    const submitData = isEditMode
      ? { ...formattedData, password: undefined, employeeId: undefined }
      : formattedData;

    // Remove any flattened permission fields if they mistakenly exist at root
    const rootKeysToRemove = [
      'canApproveLeave',
      'canApproveReimbursement',
      'canManageSchedule',
      'canViewReports',
      'modules'
    ];

    rootKeysToRemove.forEach(key => {
      if (key in submitData) {
        delete (submitData as Record<string, unknown>)[key];
      }
    });

    const cleanedSubmitData = cleanFormData(submitData) as User;
    onSubmit(cleanedSubmitData);
  };

  return (
    <div className="relative pb-2 animate-in fade-in duration-500">
      <FormError message={error} />
      {/* Compact Stepper */}
      <div className="mb-4">
        <div className="flex items-center justify-between relative">
          {/* Progress Bar Background */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-border/30 -z-10" />

          {/* Animated Progress Bar */}
          <div
            className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-primary to-primary-dark transition-all duration-500 ease-out -z-10"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isCompleted = stepNumber < currentStep;

            return (
              <div key={step.title} className="flex flex-col items-center flex-1 relative">
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out relative z-10",
                    {
                      "bg-primary text-white scale-110 shadow-lg shadow-primary/50 ring-4 ring-primary/20": isActive,
                      "bg-success text-white scale-100": isCompleted,
                      "bg-muted text-foreground-tertiary scale-90": !isActive && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4 animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={cn("transition-all duration-200", {
                      "scale-110": isActive
                    })}>
                      {stepNumber}
                    </span>
                  )}
                </div>

                {/* Step Title */}
                <div
                  className={cn(
                    "text-[10px] sm:text-xs mt-1.5 text-center font-medium transition-all duration-300 whitespace-nowrap",
                    {
                      "text-primary font-bold scale-105": isActive,
                      "text-success": isCompleted,
                      "text-foreground-tertiary": !isActive && !isCompleted,
                    }
                  )}
                >
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="space-y-6">
              <IdentityCard control={control} isEditMode={isEditMode} showPassword={showPassword} setShowPassword={setShowPassword} />
              <EmergencyCard control={control} />
            </div>
            <div className="space-y-6">
              <PersonalCard control={control} />
            </div>
            <div className="space-y-6">
              <AddressCard control={control} />
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <EmploymentCard
            control={control}
            locations={locations}
            departments={departments}
            designations={designations}
            roles={roles}
            users={users}
            currentUserId={initialValues?._id || initialValues?.id}
            setValue={setValue}
          />
        )}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="space-y-6">
              <PermissionsCard control={control} />
            </div>
            <div className="space-y-6">
              <SecurityIPCard control={control} ipInput={ipInput} setIpInput={setIpInput} />
            </div>
            <div className="space-y-6">
              <LeaveCard control={control} leaveTypes={leaveTypes} />
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-xl px-4 py-2 border-border text-foreground-secondary hover:bg-muted"
              >
                Cancel
              </Button>
            )}

            {currentStep > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handlePrev}
                disabled={isLoading}
                className="rounded-xl px-4 py-2"
                startIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
            )}
          </div>

          <Button
            onClick={
              currentStep === totalSteps
                ? handleSubmit(handleFormSubmit)
                : handleNext
            }
            disabled={isLoading}
            className={cn("rounded-2xl shadow-xl shadow-primary/20 w-full sm:w-auto", {
              "!shadow-success/20": currentStep === totalSteps,
            })}
            endIcon={
              currentStep === totalSteps ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )
            }
          >
            {currentStep === totalSteps ? "Save Changes" : "Next"}
          </Button>
        </div>
      </ModalFooter>
    </div>
  );
};

export default UserForm;