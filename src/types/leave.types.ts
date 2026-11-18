export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = string;

export interface LeaveAttachment {
    fileName: string;
    fileUrl: string;
    s3Key?: string;
    _id?: string;
    id?: string;
}

export interface LeaveRequest {
    _id: string;
    employeeId: string | {
        id: string;
        _id: string;
        employeeId: string;
        fullName: string;
        personalInfo: {
            firstName: string;
            lastName: string;
            profilePicture?: string;
        };
        employment: {
            designation: string;
            timezone?: string;
            reportingManager?: string | {
                _id: string;
                personalInfo: {
                    firstName: string;
                    lastName: string;
                };
            };
        };
    };
    leaveType: LeaveType;
    startDate: string; // ISO Date string
    endDate: string;   // ISO Date string
    numberOfDays: number;
    halfDay: boolean;
    reason: string;
    status: LeaveStatus;
    attachments: (string | LeaveAttachment)[];
    createdAt: string;
    updatedAt: string;
    approvedBy?: string;
    rejectionReason?: string;
    autoApproved: boolean;
}

export type LeaveBalance = Record<string, number>;

export interface LeaveBalanceDetails {
    leaveTypeId?: string;
    name: string;
    code: string;
    currentBalance: number | null;
    totalAllocated: number | null;
    used?: number;
    isPaid: boolean;
}

export interface EmployeeLeaveBalanceResponse {
    userId: string;
    name: string;
    department: string;
    balances: LeaveBalanceDetails[];
    globalAvailableBalance?: number;
    totalLeaveBalance?: number;
}

export interface LeaveTypeSummary {
    _id: string;
    name: string;
    code: string;
    isPaid: boolean;
    defaultAmount: number;
}

export interface EmployeeTypeBalanceItem {
    leaveTypeId: string;
    name: string;
    code: string;
    isPaid: boolean;
    allocated: number;
    approved: number;
    pending: number;
    used: number;
    available: number | null;
}

export interface AllEmployeeLeaveBalanceItem {
    _id: string;
    userId: string;
    employeeId: string;
    username: string;
    personalInfo: {
        firstName: string;
        lastName: string;
        email: string;
        profilePicture?: string | null;
    };
    employment: {
        department: string;
        designation: string;
        location?: string;
    };
    isPaidLeaveApplicable: boolean;
    leaveBalances: EmployeeTypeBalanceItem[];
    totalLeaveBalance: number;
    approvedLeaves: number;
    pendingLeaves: number;
    usedLeaves: number;
    availableBalance: number;
}

export interface PaginatedEmployeeBalancesResponse {
    leaveTypes: LeaveTypeSummary[];
    data: AllEmployeeLeaveBalanceItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
