export type UserRole = string;
export type EmploymentType = "full-time" | "part-time" | "contract" | "intern";

export interface MongoDate {
  $date: string;
}

export interface MongoId {
  $oid: string;
}

export interface User {
  id: string; // Internal normalized ID
  _id: string;
  isAdmin: boolean;
  employeeId: string;
  username: string;
  passwordHash?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
    emergencyContact?: {
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
    reportingManager?: string | {
      _id: string;
      personalInfo: {
        firstName: string;
        lastName: string;
        profilePicture?: string;
      };
    };
    location?: string;
    timezone?: string;
    workingHours?: {
      startTime: string;
      endTime: string;
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
  allowedIPs: string[];
  leaveBalance: Record<string, number>;
  isActive: boolean;
  isHolidayApplicable: boolean;
  lastLogin?: string;
  passwordChangedAt?: string;
  failedLoginAttempts: number;
  accountLockedUntil?: string | null;
  googleId?: string;
  resetPasswordOTP?: string;
  resetPasswordExpires?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface UserFilters {
  role?: UserRole;
  department?: string;
  employmentType?: EmploymentType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUserResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

