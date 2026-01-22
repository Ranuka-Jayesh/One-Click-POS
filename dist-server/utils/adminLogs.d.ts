import { Db } from 'mongodb';
export declare function logAdminActivity(db: Db, category: string, action: string, username: string, description: string, status: 'success' | 'failed' | 'warning' | 'info'): Promise<void>;
//# sourceMappingURL=adminLogs.d.ts.map