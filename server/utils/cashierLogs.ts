import { Db } from 'mongodb';

export async function logCashierActivity(
  db: Db,
  action: string,
  username: string,
  description: string,
  status: 'success' | 'failed' | 'warning' | 'info',
  ip?: string,
  userAgent?: string
): Promise<void> {
  try {
    const logsCollection = db.collection('cashier_logs');

    await logsCollection.insertOne({
      action,
      username,
      description,
      status,
      timestamp: new Date(),
      ip: ip || 'N/A',
      userAgent: userAgent || 'N/A'
    });
  } catch (error) {
    console.error('Error logging cashier activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}
