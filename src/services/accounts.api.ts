import { api } from './http';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InflowChallan {
  id: string;
  srNo: number;
  challanNo: string;
  date: string;
  clientName: string;
  siteName: string | null;
  clientId: string | null;
  projectId: string | null;
  amount: string;
  isTaxApplicable: boolean;
  taxType: 'GST' | 'CUSTOM' | null;
  taxPercent: number | null;
  taxAmount: string | null;
  finalAmount: string;
  description: string | null;
  supportingDocUrl: string | null;
  supportingDocName: string | null;
  purposeId: string;
  purpose: { id: string; name: string };
  modeOfPayment: 'CASH' | 'ONLINE' | 'OTHER';
  paymentStatus: 'PENDING' | 'PARTIAL' | 'RECEIVED';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutflowExpense {
  id: string;
  date: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  expenseType: 'DIRECT' | 'INDIRECT';
  purposeId: string;
  purpose: { id: string; name: string };
  amount: string;
  modeOfPayment: 'CASH' | 'ONLINE' | 'OTHER';
  projectManagerId: string | null;
  projectManager: { id: string; name: string } | null;
  siteId: string | null;
  siteName: string | null;
  description: string | null;
  supportingDocUrl: string;
  supportingDocName: string;
  employeeName: string | null;
  salaryMonth: string | null;
  salaryPayStatus: 'PENDING' | 'PAID' | null;
  expenseName: string | null;
  department: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurposeMaster {
  id: string;
  name: string;
  module: 'INFLOW' | 'OUTFLOW' | 'BOTH';
  isActive: boolean;
}

export interface ExpenseCategoryMaster {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SiteNameMaster {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DrawingMaster {
  id: string;
  name: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  isRoomBased: boolean;
  isWallBased: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Inflow API ────────────────────────────────────────────────────────────────

export const inflowApi = {
  create: (data: Partial<InflowChallan> & { purposeId: string }) =>
    api.post<{ success: boolean; data: InflowChallan }>('/accounts/inflow', data),

  list: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => api.get<PaginatedResponse<InflowChallan>>('/accounts/inflow', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: InflowChallan }>(`/accounts/inflow/${id}`),

  update: (id: string, data: Partial<InflowChallan>) =>
    api.put<{ success: boolean; data: InflowChallan }>(`/accounts/inflow/${id}`, data),

  submit: (id: string) =>
    api.post<{ success: boolean; data: InflowChallan }>(`/accounts/inflow/${id}/submit`),

  approve: (id: string) =>
    api.post<{ success: boolean; data: InflowChallan }>(`/accounts/inflow/${id}/approve`),

  reject: (id: string, reason: string) =>
    api.post<{ success: boolean; data: InflowChallan }>(`/accounts/inflow/${id}/reject`, { reason }),

  stats: () =>
    api.get<{ success: boolean; data: any }>('/accounts/inflow/stats'),
};

// ── Outflow API ───────────────────────────────────────────────────────────────

export const outflowApi = {
  create: (data: Partial<OutflowExpense>) =>
    api.post<{ success: boolean; data: OutflowExpense }>('/accounts/outflow', data),

  list: (params?: {
    status?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    siteId?: string;
    siteName?: string;
  }) => api.get<PaginatedResponse<OutflowExpense>>('/accounts/outflow', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: OutflowExpense }>(`/accounts/outflow/${id}`),

  update: (id: string, data: Partial<OutflowExpense>) =>
    api.put<{ success: boolean; data: OutflowExpense }>(`/accounts/outflow/${id}`, data),

  submit: (id: string) =>
    api.post<{ success: boolean; data: OutflowExpense }>(`/accounts/outflow/${id}/submit`),

  approve: (id: string) =>
    api.post<{ success: boolean; data: OutflowExpense }>(`/accounts/outflow/${id}/approve`),

  reject: (id: string, reason: string) =>
    api.post<{ success: boolean; data: OutflowExpense }>(`/accounts/outflow/${id}/reject`, { reason }),

  listProjectManagers: () =>
    api.get<{ success: boolean; data: { id: string; name: string; email: string }[] }>('/accounts/outflow/project-managers'),

  stats: () =>
    api.get<{ success: boolean; data: any }>('/accounts/outflow/stats'),

  listConstructionPayments: (params?: { status?: string }) =>
    api.get<{ success: boolean; data: any[] }>('/accounts/construction-payments', { params }),

  processConstructionPayment: (sprId: string, data: any) =>
    api.post<{ success: boolean; data: any }>(`/accounts/construction-payments/${sprId}/process`, data),

  rejectConstructionPayment: (sprId: string, data: { remarks: string }) =>
    api.post<{ success: boolean; data: any }>(`/accounts/construction-payments/${sprId}/reject`, data),
};

// ── Masters API ───────────────────────────────────────────────────────────────

export const accountsMasterApi = {
  listPurposes: (module?: string) =>
    api.get<{ success: boolean; data: PurposeMaster[] }>('/accounts/masters/purposes', { params: module ? { module } : undefined }),

  createPurpose: (data: { name: string; module: string }) =>
    api.post<{ success: boolean; data: PurposeMaster }>('/accounts/masters/purposes', data),

  updatePurpose: (id: string, data: { name: string; module: string }) =>
    api.put<{ success: boolean; data: PurposeMaster }>(`/accounts/masters/purposes/${id}`, data),

  togglePurpose: (id: string) =>
    api.patch<{ success: boolean; data: PurposeMaster }>(`/accounts/masters/purposes/${id}/toggle`),

  listCategories: () =>
    api.get<{ success: boolean; data: ExpenseCategoryMaster[] }>('/accounts/masters/expense-categories'),

  createCategory: (name: string) =>
    api.post<{ success: boolean; data: ExpenseCategoryMaster }>('/accounts/masters/expense-categories', { name }),

  updateCategory: (id: string, name: string) =>
    api.put<{ success: boolean; data: ExpenseCategoryMaster }>(`/accounts/masters/expense-categories/${id}`, { name }),

  toggleCategory: (id: string) =>
    api.patch<{ success: boolean; data: ExpenseCategoryMaster }>(`/accounts/masters/expense-categories/${id}/toggle`),

  listActiveProjects: () =>
    api.get<{ success: boolean; data: any[] }>('/accounts/active-projects'),

  listSiteNames: () =>
    api.get<{ success: boolean; data: SiteNameMaster[] }>('/accounts/masters/site-names'),
    
  updateSiteName: (id: string, name: string) =>
    api.put<{ success: boolean; data: SiteNameMaster }>(`/accounts/masters/site-names/${id}`, { name }),

  toggleSiteName: (id: string) =>
    api.patch<{ success: boolean; data: SiteNameMaster }>(`/accounts/masters/site-names/${id}/toggle`),

  createSiteName: (name: string) =>
    api.post<{ success: boolean; data: SiteNameMaster }>('/accounts/masters/site-names', { name }),

  // ── Drawing Masters ──
  listDrawings: (all = false) =>
    api.get<{ success: boolean; data: DrawingMaster[] }>('/accounts/masters/drawings', { params: { all } }),

  createDrawing: (data: { name: string; category: string; isRoomBased?: boolean; isWallBased?: boolean }) =>
    api.post<{ success: boolean; data: DrawingMaster }>('/accounts/masters/drawings', data),

  updateDrawing: (id: string, data: { name: string; category: string; isRoomBased?: boolean; isWallBased?: boolean }) =>
    api.put<{ success: boolean; data: DrawingMaster }>(`/accounts/masters/drawings/${id}`, data),

  toggleDrawing: (id: string) =>
    api.patch<{ success: boolean; data: DrawingMaster }>(`/accounts/masters/drawings/${id}/toggle`),
};

// ── Dashboard API ─────────────────────────────────────────────────────────────

export const accountsDashboardApi = {
  stats: () =>
    api.get<{ success: boolean; data: { inflow: any; outflow: any } }>('/accounts/dashboard'),
};
