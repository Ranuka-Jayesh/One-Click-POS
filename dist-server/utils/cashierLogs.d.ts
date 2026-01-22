import { Db } from 'mongodb';
export declare function logCashierActivity(db: Db, action: string, username: string, description: string, status: 'success' | 'failed' | 'warning' | 'info', ip?: string, userAgent?: string): Promise<void>;
//# sourceMappingURL=cashierLogs.d.ts.map