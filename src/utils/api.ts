// Use proxy in development, or full URL if VITE_API_URL is set
// If VITE_API_URL is a full URL, ensure it includes /api
const envApiUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = envApiUrl.startsWith('http') 
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`)
  : envApiUrl;

// Get backend base URL for serving static files (images, uploads)
const getBackendBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  if (apiUrl.startsWith('http')) {
    // Extract base URL (remove /api if present)
    return apiUrl.replace('/api', '');
  }
  // In development with proxy, use relative paths
  return '';
};

// Helper function to get full image URL
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '/placeholder.svg';
  
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If starts with /, it's already a path - use as-is (proxy will handle it)
  if (imagePath.startsWith('/')) {
    return imagePath;
  }
  
  // Otherwise, prepend /uploads/ if it's a filename
  return `/uploads/${imagePath}`;
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Making API request to:', url); // Debug log
    
    // Get admin username from localStorage if available
    const adminUsername = typeof window !== 'undefined' 
      ? localStorage.getItem('adminUsername') 
      : null;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(adminUsername && { 'x-admin-username': adminUsername }),
        ...options.headers,
      },
      ...options,
    });

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      return {
        success: false,
        error: errorData.error || 'Request failed',
        message: errorData.message,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    console.error('API request error:', error); // Debug log
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error - Make sure the backend server is running on port 3000',
    };
  }
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    username: string;
    role: string;
  };
  message: string;
}

export async function adminLogin(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return apiRequest<LoginResponse>('/admin/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export interface AdminLog {
  _id?: string;
  id?: string;
  category: string;
  action: string;
  username: string;
  description: string;
  status: 'success' | 'failed' | 'warning' | 'info';
  timestamp: string | Date;
  ip?: string;
  userAgent?: string;
}

export interface AdminLogsResponse {
  logs: AdminLog[];
  total: number;
}

export async function getAdminLogs(limit?: number, skip?: number): Promise<ApiResponse<AdminLogsResponse>> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (skip) params.append('skip', skip.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/admin/logs?${queryString}` : '/admin/logs';
  
  return apiRequest<AdminLogsResponse>(endpoint, {
    method: 'GET',
  });
}

export interface ChangePasswordRequest {
  username: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export async function changePassword(credentials: ChangePasswordRequest): Promise<ApiResponse<ChangePasswordResponse>> {
  return apiRequest<ChangePasswordResponse>('/admin/change-password', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export interface AdminProfile {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export interface ProfileResponse {
  profile: AdminProfile;
  message?: string;
}

export async function getAdminProfile(username: string): Promise<ApiResponse<ProfileResponse>> {
  return apiRequest<ProfileResponse>(`/admin/profile?username=${encodeURIComponent(username)}`, {
    method: 'GET',
  });
}

export interface UpdateProfileRequest {
  username: string;
  fullName: string;
  email: string;
  phone: string;
}

export async function updateAdminProfile(profile: UpdateProfileRequest): Promise<ApiResponse<ProfileResponse>> {
  return apiRequest<ProfileResponse>('/admin/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// Cashier Management APIs

export interface Cashier {
  id: string;
  _id?: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string | Date;
  lastLogin?: string | Date;
  updatedAt?: string | Date;
}

export interface CashiersResponse {
  cashiers: Cashier[];
}

export interface CashierResponse {
  cashier: Cashier;
  message?: string;
}

export interface CreateCashierRequest {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
}

export interface UpdateCashierRequest {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  isActive: boolean;
}

export async function getCashiers(): Promise<ApiResponse<CashiersResponse>> {
  return apiRequest<CashiersResponse>('/admin/cashiers', {
    method: 'GET',
  });
}

export async function createCashier(cashier: CreateCashierRequest): Promise<ApiResponse<CashierResponse>> {
  return apiRequest<CashierResponse>('/admin/cashiers', {
    method: 'POST',
    body: JSON.stringify(cashier),
  });
}

export async function updateCashier(id: string, cashier: UpdateCashierRequest): Promise<ApiResponse<CashierResponse>> {
  return apiRequest<CashierResponse>(`/admin/cashiers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cashier),
  });
}

export async function deleteCashier(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/cashiers/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleCashierStatus(id: string, isActive: boolean): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/cashiers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

// Cashier Login API

export interface CashierLoginRequest {
  username: string;
  password: string;
}

export interface CashierLoginResponse {
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  };
  message: string;
  activeShift?: {
    id: string;
    cashInAmount: number;
    cashInTime: string | Date;
    shiftDate: string | Date;
    createdAt: string | Date;
  } | null;
}

export async function cashierLogin(credentials: CashierLoginRequest): Promise<ApiResponse<CashierLoginResponse>> {
  return apiRequest<CashierLoginResponse>('/admin/cashier/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

// Cashier Shift Management APIs

export interface CashInRequest {
  cashierId: string;
  cashierUsername: string;
  cashInAmount: number;
}

export interface CashOutRequest {
  cashierId: string;
  cashierUsername: string;
  cashOutAmount: number;
}

export interface CashierShift {
  id: string;
  _id?: string;
  cashierId: string;
  cashierUsername: string;
  cashInAmount: number;
  cashInTime: string | Date;
  cashOutAmount?: number | null;
  cashOutTime?: string | Date | null;
  shiftDate: string | Date;
  status: 'active' | 'completed';
  difference?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ShiftResponse {
  shift: CashierShift;
  message?: string;
}

export interface ShiftsResponse {
  shifts: CashierShift[];
}

export async function cashIn(request: CashInRequest): Promise<ApiResponse<ShiftResponse>> {
  return apiRequest<ShiftResponse>('/admin/cashier/cash-in', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function cashOut(request: CashOutRequest): Promise<ApiResponse<ShiftResponse>> {
  return apiRequest<ShiftResponse>('/admin/cashier/cash-out', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getActiveShift(cashierId: string): Promise<ApiResponse<{ activeShift: CashierShift | null }>> {
  return apiRequest<{ activeShift: CashierShift | null }>(`/admin/cashier/active-shift/${cashierId}`, {
    method: 'GET',
  });
}

export async function getCashierShifts(cashierId: string): Promise<ApiResponse<ShiftsResponse>> {
  return apiRequest<ShiftsResponse>(`/admin/cashier/shifts/${cashierId}`, {
    method: 'GET',
  });
}

// Cashier Settings APIs

export interface CashierChangePasswordRequest {
  username: string;
  currentPassword: string;
  newPassword: string;
}

export interface CashierChangePasswordResponse {
  message: string;
}

export async function cashierChangePassword(credentials: CashierChangePasswordRequest): Promise<ApiResponse<CashierChangePasswordResponse>> {
  return apiRequest<CashierChangePasswordResponse>('/admin/cashier/change-password', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export interface CashierProfile {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export interface CashierProfileResponse {
  profile: CashierProfile;
  message?: string;
}

export interface UpdateCashierProfileRequest {
  username: string;
  fullName: string;
  email: string;
  phone: string;
}

export async function getCashierProfile(username: string): Promise<ApiResponse<CashierProfileResponse>> {
  return apiRequest<CashierProfileResponse>(`/admin/cashier/profile?username=${encodeURIComponent(username)}`, {
    method: 'GET',
  });
}

export async function updateCashierProfile(profile: UpdateCashierProfileRequest): Promise<ApiResponse<CashierProfileResponse>> {
  return apiRequest<CashierProfileResponse>('/admin/cashier/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export interface CashierLoginLog {
  _id?: string;
  id?: string;
  username: string;
  timestamp: string | Date;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  action?: string;
  description?: string;
}

export interface CashierLoginLogsResponse {
  logs: CashierLoginLog[];
  total: number;
}

export async function getCashierLoginLogs(username?: string, limit?: number, skip?: number): Promise<ApiResponse<CashierLoginLogsResponse>> {
  const params = new URLSearchParams();
  if (username) params.append('username', username);
  if (limit) params.append('limit', limit.toString());
  if (skip) params.append('skip', skip.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/admin/cashier/logs?${queryString}` : '/admin/cashier/logs';
  
  return apiRequest<CashierLoginLogsResponse>(endpoint, {
    method: 'GET',
  });
}

export interface PrinterConfig {
  id: string;
  _id?: string;
  cashierId?: string;
  cashierUsername?: string;
  name: string;
  type: "receipt" | "kitchen" | "label";
  enabled: boolean;
  printerName: string;
  paperSize: "58mm" | "80mm";
  copies: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PrinterConfigsResponse {
  printers: PrinterConfig[];
}

export interface PrinterConfigResponse {
  printer: PrinterConfig;
  message?: string;
}

export async function getCashierPrinters(cashierUsername: string): Promise<ApiResponse<PrinterConfigsResponse>> {
  return apiRequest<PrinterConfigsResponse>(`/admin/cashier/printers?username=${encodeURIComponent(cashierUsername)}`, {
    method: 'GET',
  });
}

export async function saveCashierPrinters(cashierUsername: string, printers: PrinterConfig[]): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/admin/cashier/printers', {
    method: 'POST',
    body: JSON.stringify({ cashierUsername, printers }),
  });
}

// Table Management APIs

export interface Table {
  id: string | number;
  _id?: string;
  tableNumber?: number;
  label: string;
  capacity: number;
  available: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TablesResponse {
  tables: Table[];
}

export interface TableResponse {
  table: Table;
  message?: string;
}

export interface CreateTableRequest {
  label: string;
  capacity: number;
}

export interface UpdateTableRequest {
  label: string;
  capacity: number;
}

export async function getTables(): Promise<ApiResponse<TablesResponse>> {
  return apiRequest<TablesResponse>('/admin/tables', {
    method: 'GET',
  });
}

export async function createTable(table: CreateTableRequest): Promise<ApiResponse<TableResponse>> {
  return apiRequest<TableResponse>('/admin/tables', {
    method: 'POST',
    body: JSON.stringify(table),
  });
}

export async function updateTable(id: string | number, table: UpdateTableRequest): Promise<ApiResponse<TableResponse>> {
  return apiRequest<TableResponse>(`/admin/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(table),
  });
}

export async function deleteTable(id: string | number): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/tables/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleTableAvailability(id: string | number, available: boolean): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/tables/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  });
}

// Category Management APIs

export interface Category {
  id: string;
  _id?: string;
  name: string;
  icon: string;
  itemCount?: number;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface CategoryResponse {
  category: Category;
  message?: string;
}

export interface CreateCategoryRequest {
  name: string;
  icon: string;
}

export interface UpdateCategoryRequest {
  name: string;
  icon: string;
}

export async function getCategories(): Promise<ApiResponse<CategoriesResponse>> {
  return apiRequest<CategoriesResponse>('/admin/categories', {
    method: 'GET',
  });
}

export async function createCategory(category: CreateCategoryRequest): Promise<ApiResponse<CategoryResponse>> {
  return apiRequest<CategoryResponse>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(category),
  });
}

export async function updateCategory(id: string, category: UpdateCategoryRequest): Promise<ApiResponse<CategoryResponse>> {
  return apiRequest<CategoryResponse>(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(category),
  });
}

export async function deleteCategory(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/categories/${id}`, {
    method: 'DELETE',
  });
}

// Menu Items Management APIs

export interface MenuItem {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available?: boolean;
}

export interface MenuItemsResponse {
  menuItems: MenuItem[];
}

export interface MenuItemResponse {
  menuItem: MenuItem;
  message?: string;
}

export interface CreateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available?: boolean;
}

export interface UpdateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available?: boolean;
}

export async function getMenuItems(): Promise<ApiResponse<MenuItemsResponse>> {
  return apiRequest<MenuItemsResponse>('/admin/menu-items', {
    method: 'GET',
  });
}

export async function createMenuItem(item: CreateMenuItemRequest): Promise<ApiResponse<MenuItemResponse>> {
  return apiRequest<MenuItemResponse>('/admin/menu-items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateMenuItem(id: string, item: UpdateMenuItemRequest): Promise<ApiResponse<MenuItemResponse>> {
  return apiRequest<MenuItemResponse>(`/admin/menu-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
}

export async function deleteMenuItem(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/menu-items/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleMenuItemAvailability(id: string, available: boolean): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/admin/menu-items/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  });
}

// Order Management APIs
export interface OrderItem {
  menuItem: {
    id: string;
    _id?: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
  };
  quantity: number;
}

export interface Order {
  id: string;
  orderId?: string;
  _id?: string;
  customerName: string;
  items: OrderItem[];
  status: 'new' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  total: number;
  createdAt: Date | string;
  isPaid: boolean;
  isSettled: boolean;
  paymentMethod?: 'card' | 'cash';
  orderType: 'takeaway' | 'dining';
  tableNumber?: number;
  completedAt?: Date | string;
  cashierId?: string;
  cashierName?: string;
  refundStatus?: boolean;
}

export interface OrdersResponse {
  orders: Order[];
}

export interface OrderResponse {
  order: Order;
  message?: string;
}

export interface CreateOrderRequest {
  customerName?: string;
  items: OrderItem[];
  total: number;
  orderType: 'takeaway' | 'dining';
  tableNumber?: number;
  isPaid: boolean;
  paymentMethod?: 'card' | 'cash';
  cashierId?: string;
  cashierName?: string;
}

export interface UpdateOrderStatusRequest {
  status: 'new' | 'cooking' | 'ready' | 'completed' | 'cancelled';
}

export interface MarkOrderPaidRequest {
  paymentMethod: 'card' | 'cash';
}

export async function getOrders(params?: {
  status?: string;
  isPaid?: boolean;
  isSettled?: boolean;
  orderType?: string;
  tableNumber?: number;
}): Promise<ApiResponse<OrdersResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.isPaid !== undefined) queryParams.append('isPaid', params.isPaid.toString());
  if (params?.isSettled !== undefined) queryParams.append('isSettled', params.isSettled.toString());
  if (params?.orderType) queryParams.append('orderType', params.orderType);
  if (params?.tableNumber) queryParams.append('tableNumber', params.tableNumber.toString());
  
  const query = queryParams.toString();
  return apiRequest<OrdersResponse>('/orders' + (query ? '?' + query : ''), {
    method: 'GET',
  });
}

export async function getOrder(id: string): Promise<ApiResponse<OrderResponse>> {
  return apiRequest<OrderResponse>('/orders/' + id, {
    method: 'GET',
  });
}

export async function createOrder(order: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> {
  return apiRequest<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export async function updateOrderStatus(id: string, status: UpdateOrderStatusRequest['status']): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/orders/' + id + '/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function markOrderPaid(id: string, paymentMethod: 'card' | 'cash'): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/orders/' + id + '/payment', {
    method: 'PATCH',
    body: JSON.stringify({ paymentMethod }),
  });
}

export async function settleOrder(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/orders/' + id + '/settle', {
    method: 'PATCH',
  });
}

export async function updateOrder(id: string, order: Partial<CreateOrderRequest>): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/orders/' + id, {
    method: 'PUT',
    body: JSON.stringify(order),
  });
}

export async function deleteOrder(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/orders/' + id, {
    method: 'DELETE',
  });
}

// Mark order as refunded
export async function markOrderRefunded(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/orders/' + id + '/refund', {
    method: 'PATCH',
  });
}

// Admin Overview Statistics API
export interface AdminOverviewStats {
  today: {
    revenue: number;
    orders: number;
  };
  week: {
    revenue: number;
    orders: number;
  };
  month: {
    revenue: number;
    orders: number;
  };
  allTime: {
    revenue: number;
    orders: number;
  };
  trends: {
    revenue: number;
    orders: number;
  };
  top3Items: Array<{
    item: {
      id: string;
      _id?: string;
      name: string;
      description?: string;
      price: number;
      category: string;
      image: string;
    };
    quantity: number;
    revenue: number;
  }>;
  peakDays: Array<{
    day: string;
    orders: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  riskyItems: Array<{
    id: string;
    name: string;
    quantity: number;
    daysSinceLastSale: number;
    image: string;
    price: number;
  }>;
  paymentMethods: {
    card: number;
    cash: number;
  };
  orderTypes: {
    table: number;
    takeaway: number;
  };
}

export interface AdminOverviewResponse {
  data: AdminOverviewStats;
}

export async function getAdminOverview(): Promise<ApiResponse<AdminOverviewStats>> {
  const response = await apiRequest<AdminOverviewResponse>('/admin/overview', {
    method: 'GET',
  });
  
  if (response.success && response.data) {
    return {
      success: true,
      data: response.data.data,
    };
  }
  
  return {
    success: false,
    error: response.error || 'Failed to fetch overview statistics',
  };
}
